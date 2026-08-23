import { db } from "./connection";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
function createArchive(format: "zip", options?: any) {
  const archiver = require("archiver");
  if (typeof archiver === "function") {
    return archiver(format, options);
  }
  if (format === "zip" && archiver.ZipArchive) {
    return new archiver.ZipArchive(options);
  }
  if (archiver.create) {
    return archiver.create(format, options);
  }
  return new archiver.Archiver(format, options);
}

function getUnzipper() {
  return require("unzipper");
}

const DATA_DIR = path.join(process.cwd(), "data");
const IMAGES_DIR = path.join(process.cwd(), "public", "images");
const IMAGES_META_PATH = path.join(process.cwd(), "src", "lib", "images.json");

export interface BackupConfig {
  autoBackup: boolean;
  maxBackups: number;
  scheduleInterval: "daily" | "weekly" | "manual";
}

const configPath = path.join(DATA_DIR, "backup-config.json");

let backupTimeout: NodeJS.Timeout | null = null;
let isBackupPending = false;

export function getBackupConfig(): BackupConfig {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
  } catch {}
  return {
    autoBackup: true,
    maxBackups: 5,
    scheduleInterval: "daily"
  };
}

export function saveBackupConfig(config: Partial<BackupConfig>) {
  const current = getBackupConfig();
  const updated = { ...current, ...config };
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), "utf8");
}

function cleanOldBackups(backupsDir: string) {
  try {
    const config = getBackupConfig();
    const max = config.maxBackups || 5;
    const files = fs.readdirSync(backupsDir)
      .filter((f) => (f.startsWith("inscribe-backup-") || f.startsWith("db-backup-")) && (f.endsWith(".zip") || f.endsWith(".sqlite")))
      .map((f) => ({ name: f, time: fs.statSync(path.join(backupsDir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (files.length > max) {
      for (let i = max; i < files.length; i++) {
        try {
          fs.unlinkSync(path.join(backupsDir, files[i].name));
        } catch {}
      }
    }
  } catch (err) {
    console.error("Failed to clean old backups:", err);
  }
}

function restoreTablesFromDatabase(sourceDbPath: string, activeDbPath: string) {
  const normPath = sourceDbPath.replace(/\\/g, "/");
  db.exec("PRAGMA foreign_keys = OFF;");
  db.exec(`ATTACH DATABASE '${normPath}' AS backup_source_db;`);

  try {
    // List tables from backup, ignoring SQLite internal and FTS shadow tables
    const isShadow = (name: string) =>
      name.startsWith("sqlite_") ||
      name.endsWith("_data") ||
      name.endsWith("_idx") ||
      name.endsWith("_content") ||
      name.endsWith("_docsize") ||
      name.endsWith("_config");

    const sourceTables = (
      db
        .prepare("SELECT name, sql, type FROM backup_source_db.sqlite_master WHERE type IN ('table', 'view')")
        .all() as { name: string; sql: string; type: string }[]
    ).filter((t) => !isShadow(t.name));

    const copyTransaction = db.transaction(() => {
      // 1. Drop existing main tables (excluding shadow tables)
      const currentTables = (
        db
          .prepare("SELECT name FROM main.sqlite_master WHERE type IN ('table', 'view')")
          .all() as { name: string }[]
      ).filter((t) => !isShadow(t.name));

      for (const t of currentTables) {
        try {
          db.exec(`DROP TABLE IF EXISTS main."${t.name}";`);
        } catch {}
      }

      // 2. Re-create base tables and insert rows
      for (const t of sourceTables) {
        if (!t.sql) continue;
        const isVirtual = t.sql.toUpperCase().includes("VIRTUAL TABLE");

        try {
          db.exec(t.sql);
          if (!isVirtual) {
            db.exec(`INSERT INTO main."${t.name}" SELECT * FROM backup_source_db."${t.name}";`);
          }
        } catch (err) {
          console.warn(`[Restore] Error creating table ${t.name}:`, err);
        }
      }

      // 3. Rebuild FTS index if exists
      try {
        db.exec("INSERT INTO main.articles_fts(articles_fts) VALUES('rebuild');");
      } catch {}

      // 4. Re-create indexes
      const indexes = db
        .prepare(
          "SELECT sql FROM backup_source_db.sqlite_master WHERE type='index' AND sql IS NOT NULL"
        )
        .all() as { sql: string }[];
      for (const idx of indexes) {
        try {
          db.exec(idx.sql);
        } catch {}
      }
    });

    copyTransaction();
  } finally {
    try {
      db.exec("DETACH DATABASE backup_source_db;");
    } catch {}
    db.exec("PRAGMA foreign_keys = ON;");
  }

  // Also sync to activeDbPath on disk if not test memory
  if (process.env.NODE_ENV !== "test" && fs.existsSync(sourceDbPath)) {
    try {
      const checkDb = new Database(sourceDbPath);
      checkDb.backup(activeDbPath);
      checkDb.close();
    } catch {}
  }
}

export async function restoreDb(filename: string): Promise<void> {
  const safeFilename = path.basename(filename);
  const backupsDir = path.join(DATA_DIR, "backups");
  const backupPath = path.join(backupsDir, safeFilename);

  if (!fs.existsSync(backupPath)) {
    throw new Error("Backup file not found");
  }

  const activeDbPath = path.join(DATA_DIR, "db.sqlite");

  if (safeFilename.endsWith(".zip")) {
    const tempExtractDir = path.join(DATA_DIR, "temp", `restore-${Date.now()}`);
    fs.mkdirSync(tempExtractDir, { recursive: true });

    try {
      // Unzip full archive
      const unz = getUnzipper();
      const directory = await unz.Open.file(backupPath);
      await directory.extract({ path: tempExtractDir });

      const extractedDbPath = path.join(tempExtractDir, "db.sqlite");
      if (!fs.existsSync(extractedDbPath)) {
        throw new Error("Invalid backup archive: db.sqlite not found inside zip");
      }

      // Verify SQLite integrity
      const checkDb = new Database(extractedDbPath);
      const integrity = checkDb.pragma("integrity_check", { simple: true }) as string;
      checkDb.close();
      if (integrity !== "ok") {
        throw new Error(`Backup database is corrupted: ${integrity}`);
      }

      // Restore active database tables
      restoreTablesFromDatabase(extractedDbPath, activeDbPath);

      // Clear in-memory LRU cache so restored data is immediately served
      const { clearCache } = await import("./articles");
      clearCache();

      // Restore images if present in archive
      const extractedImagesDir = path.join(tempExtractDir, "images");
      if (fs.existsSync(extractedImagesDir)) {
        if (!fs.existsSync(IMAGES_DIR)) {
          fs.mkdirSync(IMAGES_DIR, { recursive: true });
        }
        const imgFiles = fs.readdirSync(extractedImagesDir);
        for (const file of imgFiles) {
          const srcFile = path.join(extractedImagesDir, file);
          const destFile = path.join(IMAGES_DIR, file);
          fs.copyFileSync(srcFile, destFile);
        }
      }

      // Restore images.json if present
      const extractedMetaPath = path.join(tempExtractDir, "images.json");
      if (fs.existsSync(extractedMetaPath)) {
        const metaDir = path.dirname(IMAGES_META_PATH);
        if (!fs.existsSync(metaDir)) {
          fs.mkdirSync(metaDir, { recursive: true });
        }
        fs.copyFileSync(extractedMetaPath, IMAGES_META_PATH);
      }
    } finally {
      // Clean up extraction temp directory
      try {
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
      } catch {}
    }
  } else {
    // Legacy .sqlite backup restore
    const checkDb = new Database(backupPath);
    const integrity = checkDb.pragma("integrity_check", { simple: true }) as string;
    checkDb.close();
    if (integrity !== "ok") {
      throw new Error(`Backup file is corrupted: ${integrity}`);
    }

    restoreTablesFromDatabase(backupPath, activeDbPath);

    const { clearCache } = await import("./articles");
    clearCache();
  }
}

export function deleteBackupFile(filename: string): void {
  const safeFilename = path.basename(filename);
  const backupsDir = path.join(DATA_DIR, "backups");
  const backupPath = path.join(backupsDir, safeFilename);
  if (fs.existsSync(backupPath)) {
    fs.unlinkSync(backupPath);
  }
}

export function runMonthlySnapshot() {
  const snapshotsDir = path.join(DATA_DIR, "snapshots");
  if (!fs.existsSync(snapshotsDir)) {
    fs.mkdirSync(snapshotsDir, { recursive: true });
  }

  const yearMonth = new Date().toISOString().substring(0, 7);
  const snapshotPath = path.join(snapshotsDir, `db-snapshot-${yearMonth}.sqlite`);

  if (!fs.existsSync(snapshotPath)) {
    try {
      db.prepare(`VACUUM INTO ?`).run(snapshotPath);
      console.log(`Monthly database snapshot created at: ${snapshotPath}`);
    } catch (err) {
      console.error("Failed to create monthly database snapshot:", err);
    }
  }

  // Keep only the last 12 monthly snapshots (rolling year)
  try {
    const snapshots = fs.readdirSync(snapshotsDir)
      .filter((f) => f.startsWith("db-snapshot-") && f.endsWith(".sqlite"))
      .map((f) => ({ name: f, time: fs.statSync(path.join(snapshotsDir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    for (let i = 12; i < snapshots.length; i++) {
      fs.unlinkSync(path.join(snapshotsDir, snapshots[i].name));
    }
  } catch (err) {
    console.error("Failed to clean old snapshots:", err);
  }
}

export async function backupDb(): Promise<string> {
  const backupsDir = path.join(DATA_DIR, "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const tempDir = path.join(DATA_DIR, "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const tempDbPath = path.join(tempDir, `temp-db-${timestamp}.sqlite`);
  const finalZipPath = path.join(backupsDir, `inscribe-backup-${timestamp}.zip`);

  // 1. Create clean SQLite online snapshot
  await db.backup(tempDbPath);

  // 2. Verify database integrity
  const checkDb = new Database(tempDbPath);
  const integrity = checkDb.pragma("integrity_check", { simple: true }) as string;
  checkDb.close();
  if (integrity !== "ok") {
    try { fs.unlinkSync(tempDbPath); } catch {}
    throw new Error(`Integrity check failed: ${integrity}`);
  }

  // 3. Package full backup ZIP: db.sqlite + public/images + images.json + manifest.json
  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(finalZipPath);
    const archive = createArchive("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    output.on("error", (err: any) => reject(err));
    archive.on("error", (err: any) => reject(err));

    archive.pipe(output);

    // Add SQLite database file
    archive.file(tempDbPath, { name: "db.sqlite" });

    // Add images directory if exists
    if (fs.existsSync(IMAGES_DIR)) {
      archive.directory(IMAGES_DIR, "images");
    }

    // Add images metadata if exists
    if (fs.existsSync(IMAGES_META_PATH)) {
      archive.file(IMAGES_META_PATH, { name: "images.json" });
    }

    // Add manifest
    const manifest = {
      version: "1.0",
      type: "inscribe_full_backup",
      createdAt: new Date().toISOString(),
      platform: "Inscribe Documentation Platform",
    };
    archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

    archive.finalize();
  });

  // 4. Clean up temporary db file
  try {
    fs.unlinkSync(tempDbPath);
  } catch {}

  // 5. Clean older backups according to retention policy
  cleanOldBackups(backupsDir);

  // 6. Run monthly snapshot & global database maintenance
  runMonthlySnapshot();
  runGlobalMaintenance();

  return finalZipPath;
}

let lastMaintenanceTime = 0;
const MAINTENANCE_INTERVAL = 24 * 60 * 60 * 1000;

const stmtAllProjects = db.prepare("SELECT slug, historyMaxVersions, historyRetentionDays FROM projects");
const stmtProjectArticles = db.prepare("SELECT slug FROM articles WHERE projectSlug = ?");
const stmtPruneByAge = db.prepare(
  "DELETE FROM article_history WHERE projectSlug = ? AND articleSlug = ? AND createdAt < ?"
);
const stmtPruneByCount = db.prepare(`
  DELETE FROM article_history
  WHERE projectSlug = ? AND articleSlug = ? AND id NOT IN (
    SELECT id FROM article_history
    WHERE projectSlug = ? AND articleSlug = ?
    ORDER BY createdAt DESC
    LIMIT ?
  )
`);

export function runGlobalMaintenance(force = false) {
  const now = Date.now();
  if (!force && now - lastMaintenanceTime < MAINTENANCE_INTERVAL) {
    return;
  }
  lastMaintenanceTime = now;

  setImmediate(() => {
    try {
      const projects = stmtAllProjects.all() as any[];
      for (const p of projects) {
        const articles = stmtProjectArticles.all(p.slug) as any[];
        const maxVersions = p.historyMaxVersions || 50;
        const cutoffTime = now - (p.historyRetentionDays || 30) * 86_400_000;

        for (const art of articles) {
          stmtPruneByAge.run(p.slug, art.slug, cutoffTime);
          stmtPruneByCount.run(p.slug, art.slug, p.slug, art.slug, maxVersions);
        }
      }

      db.pragma("optimize");
      db.pragma("wal_checkpoint(TRUNCATE)");
      db.prepare("VACUUM").run();
    } catch (err) {
      console.error("Scheduled database maintenance failed:", err);
    }
  });
}

export function backupDbDebounced() {
  if (isBackupPending) return;
  isBackupPending = true;

  if (backupTimeout) {
    clearTimeout(backupTimeout);
  }

  backupTimeout = setTimeout(async () => {
    try {
      await backupDb();
    } catch (err) {
      console.error("Debounced backup failed:", err);
    } finally {
      isBackupPending = false;
    }
  }, 30000);
}

export function getBackupsList(): { name: string; size: number; mtime: number }[] {
  const backupsDir = path.join(DATA_DIR, "backups");
  if (!fs.existsSync(backupsDir)) return [];
  try {
    return fs.readdirSync(backupsDir)
      .filter((f) => (f.startsWith("inscribe-backup-") || f.startsWith("db-backup-")) && (f.endsWith(".zip") || f.endsWith(".sqlite")))
      .map((f) => {
        const stats = fs.statSync(path.join(backupsDir, f));
        return {
          name: f,
          size: stats.size,
          mtime: stats.mtimeMs,
        };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return [];
  }
}
