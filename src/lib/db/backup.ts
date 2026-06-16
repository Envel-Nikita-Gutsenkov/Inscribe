import { db } from "./connection";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";

const DATA_DIR = path.join(process.cwd(), "data");

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
      .filter((f) => f.startsWith("db-backup-") && f.endsWith(".sqlite"))
      .map((f) => ({ name: f, time: fs.statSync(path.join(backupsDir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (files.length > max) {
      for (let i = max; i < files.length; i++) {
        fs.unlinkSync(path.join(backupsDir, files[i].name));
      }
    }
  } catch (err) {
    console.error("Failed to clean old backups:", err);
  }
}

export function restoreDb(filename: string): void {
  const safeFilename = path.basename(filename);
  const backupsDir = path.join(DATA_DIR, "backups");
  const backupPath = path.join(backupsDir, safeFilename);

  if (!fs.existsSync(backupPath)) {
    throw new Error("Backup file not found");
  }

  // Verify backup file integrity
  const checkDb = new Database(backupPath);
  const integrity = checkDb.pragma("integrity_check", { simple: true }) as string;
  if (integrity !== "ok") {
    checkDb.close();
    throw new Error(`Backup file is corrupted: ${integrity}`);
  }

  // Restore into active DB
  const activeDbPath = path.join(DATA_DIR, "db.sqlite");
  checkDb.backup(activeDbPath);
  checkDb.close();
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

export function backupDb(): string {
  const backupsDir = path.join(DATA_DIR, "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupsDir, `db-backup-${timestamp}.sqlite`);

  // SQLite online backup API
  db.backup(backupPath);

  // Verify backup integrity
  try {
    const checkDb = new Database(backupPath);
    const integrity = checkDb.pragma("integrity_check", { simple: true }) as string;
    checkDb.close();
    if (integrity !== "ok") {
      throw new Error(`Integrity check failed: ${integrity}`);
    }
  } catch (err) {
    console.error("Backup integrity check failed!", err);
    try {
      fs.unlinkSync(backupPath);
    } catch {}
    throw err;
  }

  // Clean older backups
  cleanOldBackups(backupsDir);

  // Run monthly snapshot check
  runMonthlySnapshot();

  // Run global database maintenance asynchronously
  runGlobalMaintenance();

  return backupPath;
}

let lastMaintenanceTime = 0;
const MAINTENANCE_INTERVAL = 24 * 60 * 60 * 1000;

// Hoisted prepared statements to avoid re-compilation on every maintenance run
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

  // Run in a truly async context on the next tick so it doesn't block responses
  setImmediate(() => {
    try {
      console.log("Running database maintenance & optimization...");

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

      // Optimize query planner stats
      db.pragma("optimize");

      // VACUUM is heavy — run it in the background via WAL checkpoint first
      db.pragma("wal_checkpoint(TRUNCATE)");
      // Then reclaim space (this is synchronous but we’re already in setImmediate)
      db.prepare("VACUUM").run();

      console.log("Database maintenance & optimization completed.");
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

  backupTimeout = setTimeout(() => {
    try {
      backupDb();
    } catch (err) {
      console.error("Debounced backup failed:", err);
    } finally {
      isBackupPending = false;
    }
  }, 30000); // 30 seconds
}

export function getBackupsList(): { name: string; size: number; mtime: number }[] {
  const backupsDir = path.join(DATA_DIR, "backups");
  if (!fs.existsSync(backupsDir)) return [];
  try {
    return fs.readdirSync(backupsDir)
      .filter((f) => f.startsWith("db-backup-") && f.endsWith(".sqlite"))
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
