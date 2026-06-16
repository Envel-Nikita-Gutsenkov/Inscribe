import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";


const DATA_DIR = path.join(process.cwd(), "data");
const isTest = process.env.NODE_ENV === "test";

if (!isTest && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const dbPath = isTest ? ":memory:" : path.join(DATA_DIR, "db.sqlite");
export const db = new Database(dbPath, { timeout: 10000 });

// WAL mode: concurrent reads during writes
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
// NORMAL sync is crash-safe with WAL and avoids full fsync on every write
db.pragma("synchronous = NORMAL");
// 64 MB page cache (~8192 pages × 8 KB default page size)
db.pragma("cache_size = -65536");
// Keep temp tables in memory
db.pragma("temp_store = MEMORY");
// Memory-mapped I/O for faster sequential reads (64 MB)
db.pragma("mmap_size = 67108864");
// Automatically checkpoint WAL to keep WAL file small
db.pragma("wal_autocheckpoint = 1000");


// Migration dictionary containing functions that update the schema
const migrations: { [version: number]: (database: Database.Database) => void } = {
  1: (database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        totpSecret TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('superadmin', 'editor')),
        lockedUntil INTEGER DEFAULT 0,
        failedAttempts INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS projects (
        slug TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        customDomain TEXT UNIQUE,
        isPublic INTEGER DEFAULT 1,
        passcode TEXT
      );

      CREATE TABLE IF NOT EXISTS user_projects (
        userId TEXT,
        projectSlug TEXT,
        PRIMARY KEY (userId, projectSlug),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (projectSlug) REFERENCES projects(slug) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS sections (
        id TEXT PRIMARY KEY,
        projectSlug TEXT NOT NULL,
        title TEXT NOT NULL,
        sortOrder INTEGER NOT NULL,
        FOREIGN KEY (projectSlug) REFERENCES projects(slug) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS articles (
        slug TEXT NOT NULL,
        projectSlug TEXT NOT NULL,
        sectionId TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        sortOrder INTEGER NOT NULL,
        PRIMARY KEY (projectSlug, slug),
        FOREIGN KEY (projectSlug) REFERENCES projects(slug) ON DELETE CASCADE,
        FOREIGN KEY (sectionId) REFERENCES sections(id) ON DELETE CASCADE
      );
    `);
  },
  2: (database) => {
    const hasColumn = (table: string, column: string) => {
      const info = database.pragma(`table_info(${table})`) as any[];
      return info.some((col) => col.name === column);
    };

    // Add createdAt, updatedAt columns
    if (!hasColumn("projects", "createdAt")) {
      database.exec("ALTER TABLE projects ADD COLUMN createdAt INTEGER DEFAULT 0;");
    }
    if (!hasColumn("projects", "updatedAt")) {
      database.exec("ALTER TABLE projects ADD COLUMN updatedAt INTEGER DEFAULT 0;");
    }
    if (!hasColumn("articles", "createdAt")) {
      database.exec("ALTER TABLE articles ADD COLUMN createdAt INTEGER DEFAULT 0;");
    }
    if (!hasColumn("articles", "updatedAt")) {
      database.exec("ALTER TABLE articles ADD COLUMN updatedAt INTEGER DEFAULT 0;");
    }
    if (!hasColumn("articles", "contentHash")) {
      database.exec("ALTER TABLE articles ADD COLUMN contentHash TEXT DEFAULT '';");
    }
    if (!hasColumn("articles", "searchText")) {
      database.exec("ALTER TABLE articles ADD COLUMN searchText TEXT DEFAULT '';");
    }

    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_sections_projectSlug ON sections(projectSlug);
      CREATE INDEX IF NOT EXISTS idx_articles_projectSlug ON articles(projectSlug);
      CREATE INDEX IF NOT EXISTS idx_articles_sectionId ON articles(sectionId);
      CREATE INDEX IF NOT EXISTS idx_user_projects_projectSlug ON user_projects(projectSlug);

      CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
        projectSlug,
        slug,
        title,
        searchText,
        tokenize='porter unicode61'
      );
    `);

    // Populate existing articles FTS5 table safely
    const ftsCount = database.prepare("SELECT COUNT(*) as count FROM articles_fts").get() as { count: number };
    if (ftsCount.count === 0) {
      database.exec(`
        INSERT INTO articles_fts (projectSlug, slug, title, searchText)
        SELECT projectSlug, slug, title, searchText FROM articles;
      `);
    }

    // Sync triggers for virtual table
    database.exec(`
      CREATE TRIGGER IF NOT EXISTS trg_articles_insert AFTER INSERT ON articles BEGIN
        INSERT INTO articles_fts (projectSlug, slug, title, searchText)
        VALUES (new.projectSlug, new.slug, new.title, new.searchText);
      END;

      CREATE TRIGGER IF NOT EXISTS trg_articles_update AFTER UPDATE ON articles BEGIN
        UPDATE articles_fts
        SET projectSlug = new.projectSlug, slug = new.slug, title = new.title, searchText = new.searchText
        WHERE projectSlug = old.projectSlug AND slug = old.slug;
      END;

      CREATE TRIGGER IF NOT EXISTS trg_articles_delete AFTER DELETE ON articles BEGIN
        DELETE FROM articles_fts WHERE projectSlug = old.projectSlug AND slug = old.slug;
      END;
    `);
  },
  3: (database) => {
    const hasColumn = (table: string, column: string) => {
      const info = database.pragma(`table_info(${table})`) as any[];
      return info.some((col) => col.name === column);
    };

    // Add history retention configuration to projects
    if (!hasColumn("projects", "historyMaxVersions")) {
      database.exec("ALTER TABLE projects ADD COLUMN historyMaxVersions INTEGER DEFAULT 50;");
    }
    if (!hasColumn("projects", "historyRetentionDays")) {
      database.exec("ALTER TABLE projects ADD COLUMN historyRetentionDays INTEGER DEFAULT 30;");
    }

    // Add draft/published tracking columns to articles
    if (!hasColumn("articles", "publishedContent")) {
      database.exec("ALTER TABLE articles ADD COLUMN publishedContent TEXT;");
    }
    if (!hasColumn("articles", "isPublished")) {
      database.exec("ALTER TABLE articles ADD COLUMN isPublished INTEGER DEFAULT 0;");
    }

    // Initialize existing articles to be published by default
    database.exec(`
      UPDATE articles SET publishedContent = content, isPublished = 1 WHERE publishedContent IS NULL;
    `);

    // Create article_history table
    database.exec(`
      CREATE TABLE IF NOT EXISTS article_history (
        id TEXT PRIMARY KEY,
        projectSlug TEXT NOT NULL,
        articleSlug TEXT NOT NULL,
        content TEXT NOT NULL,
        changeSummary TEXT,
        createdAt INTEGER NOT NULL,
        createdById TEXT,
        FOREIGN KEY (projectSlug, articleSlug) REFERENCES articles(projectSlug, slug) ON DELETE CASCADE,
        FOREIGN KEY (createdById) REFERENCES users(id) ON DELETE SET NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_article_history_article ON article_history(projectSlug, articleSlug);
    `);
  },
  4: (database) => {
    const hasColumn = (table: string, column: string) => {
      const info = database.pragma(`table_info(${table})`) as any[];
      return info.some((col) => col.name === column);
    };

    if (!hasColumn("projects", "webhookUrl")) {
      database.exec("ALTER TABLE projects ADD COLUMN webhookUrl TEXT;");
    }
    if (!hasColumn("users", "recoveryCodes")) {
      database.exec("ALTER TABLE users ADD COLUMN recoveryCodes TEXT;");
    }
  },
  5: (database) => {
    const hasColumn = (table: string, column: string) => {
      const info = database.pragma(`table_info(${table})`) as any[];
      return info.some((col) => col.name === column);
    };

    // Diff-based history: mark entries as full snapshots vs reverse deltas
    if (!hasColumn("article_history", "isDelta")) {
      database.exec("ALTER TABLE article_history ADD COLUMN isDelta INTEGER DEFAULT 0;");
    }
    // How many delta entries before forcing a full snapshot (0 = always full)
    if (!hasColumn("article_history", "snapshotEvery")) {
      database.exec("ALTER TABLE article_history ADD COLUMN snapshotEvery INTEGER DEFAULT 10;");
    }
    // Batch window: collapse publishes within N minutes into one history entry
    if (!hasColumn("projects", "historyBatchWindowMinutes")) {
      database.exec("ALTER TABLE projects ADD COLUMN historyBatchWindowMinutes INTEGER DEFAULT 10;");
    }
  },
  6: (database) => {
    const hasColumn = (table: string, column: string) => {
      const info = database.pragma(`table_info(${table})`) as any[];
      return info.some((col) => col.name === column);
    };

    if (!hasColumn("users", "oneTimeCode")) {
      database.exec("ALTER TABLE users ADD COLUMN oneTimeCode TEXT;");
    }
  },
  7: (database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }
};

function seed() {
  // Always seed default system settings if they don't exist
  db.prepare(`
    INSERT OR IGNORE INTO system_settings (key, value)
    VALUES 
      ('portal_title', 'Welcome to Inscribe'),
      ('portal_description', 'Search for articles or select a documentation workspace below to get started.')
  `).run();

  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (userCount.count === 0) {
    let username = process.env.INSCRIBE_INITIAL_ADMIN_USERNAME?.trim().toLowerCase();
    if (!username) {
      // Generate a random admin username so every install is unique
      const adjectives = ["swift", "bold", "keen", "calm", "wise", "bright", "sharp", "noble"];
      const nouns = ["falcon", "cedar", "stone", "river", "ember", "coast", "forge", "vale"];
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const suffix = Math.floor(1000 + Math.random() * 9000);
      username = `${adj}-${noun}-${suffix}`;
    }

    let oneTimeCode = process.env.INSCRIBE_INITIAL_ADMIN_ONE_TIME_CODE?.trim();
    if (!oneTimeCode) {
      // Generate a cryptographically random 6-digit numeric one-time code
      oneTimeCode = Math.floor(100000 + Math.random() * 900000).toString();
    }

    const userId = "user-" + crypto.randomBytes(6).toString("hex");

    db.prepare(`
      INSERT INTO users (id, username, totpSecret, role, oneTimeCode)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, username, "PENDING", "superadmin", oneTimeCode);

    // Insert default project
    db.prepare(`
      INSERT INTO projects (slug, name, description, isPublic)
      VALUES (?, ?, ?, ?)
    `).run(
      "inscribe-docs",
      "Inscribe Documentation",
      "Welcome to Inscribe! Create and manage your project documentation.",
      1
    );

    // Link admin to the project
    db.prepare(`
      INSERT INTO user_projects (userId, projectSlug)
      VALUES (?, ?)
    `).run(userId, "inscribe-docs");

    // Insert default section
    db.prepare(`
      INSERT INTO sections (id, projectSlug, title, sortOrder)
      VALUES (?, ?, ?, ?)
    `).run("intro-sec", "inscribe-docs", "Introduction", 0);

    // Insert default article
    const content = `# Welcome to Inscribe!\n\nInscribe is a beautiful, self-hosted, multi-project documentation platform.\n\n### Key Features\n- 📂 **Multi-Project Management**: Host separate workspaces for different products.\n- 🌐 **Custom Domains**: Bind individual hosts/domains to specific documentation projects.\n- 🔒 **Role-Based Access**: Distribute editing permissions among multiple users.\n- 📝 **Markdown Editor**: Simple, clean editing workspace with instant live previews.\n\n### Code Highlight Example\n\`\`\`typescript\n// Revalidate cache on-demand\nexport async function revalidateProject(slug: string) {\n  revalidatePath(\`/p/\${slug}\`);\n  console.log(\`[Cache] Evicted CDN pages for project: \${slug}\`);\n}\n\`\`\`\n\n### System Architecture (Mermaid Diagram)\n\`\`\`mermaid\ngraph TD\n  User((User)) -->|HTTP| Proxy[Inscribe Proxy]\n  Proxy -->|Reads Custom Domain| DB[(SQLite Database)]\n  Proxy -->|Serves Static Pages| NextJS[Next.js App Router]\n\`\`\``;
    
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    const searchText = content.replace(/[#*`~_\[\]()\-+=\>!]/g, " ").replace(/\s+/g, " ").trim();

    db.prepare(`
      INSERT INTO articles (slug, projectSlug, sectionId, title, content, sortOrder, contentHash, searchText, publishedContent, isPublished)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "welcome",
      "inscribe-docs",
      "intro-sec",
      "Welcome to Inscribe",
      content,
      0,
      hash,
      searchText,
      content,
      1
    );

    // Print credentials to console so admin knows them on first run
    console.log("\n=== INSCRIBE FIRST-RUN CREDENTIALS ===");
    console.log(`Username : ${username}`);
    console.log(`One-Time Entry Code: ${oneTimeCode}`);
    console.log("Log in with these credentials to configure your 2FA key.");
    console.log("========================================\n");
  }
}

export function runMigrations() {
  let currentVersion = db.pragma("user_version", { simple: true }) as number;

  if (currentVersion === 0) {
    // Check if the users table already exists to detect a pre-migration state
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (tableExists) {
      db.pragma("user_version = 1");
      currentVersion = 1;
    }
  }

  const targetVersion = Math.max(...Object.keys(migrations).map(Number));

  while (currentVersion < targetVersion) {
    const nextVersion = currentVersion + 1;
    const migration = migrations[nextVersion];
    if (migration) {
      const runInTransaction = db.transaction(() => {
        migration(db);
      });
      runInTransaction();
      db.pragma(`user_version = ${nextVersion}`);
    }
    currentVersion = nextVersion;
  }

  // Run database seed logic
  seed();

  // Ensure default welcome article is published if it was seeded without being published
  db.prepare(`
    UPDATE articles 
    SET publishedContent = content, isPublished = 1 
    WHERE projectSlug = 'inscribe-docs' AND slug = 'welcome' AND (isPublished = 0 OR isPublished IS NULL)
  `).run();
}

runMigrations();

