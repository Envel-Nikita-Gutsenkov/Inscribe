import { describe, it, expect, beforeEach } from "vitest";
import path from "path";
import fs from "fs";
import { 
  backupDb, 
  restoreDb, 
  getBackupsList, 
  deleteBackupFile, 
  saveBackupConfig, 
  getBackupConfig 
} from "../src/lib/db/backup";

function getUnzipper() {
  return require("unzipper");
}
import { saveProject } from "../src/lib/db/projects";
import { saveProjectToc, saveArticleContent, publishArticle, getArticleContent } from "../src/lib/db/articles";

describe("Full System Backup & Restore with Images & Database", () => {
  const projectSlug = "backup-test-project";
  const imagesDir = path.join(process.cwd(), "public", "images");

  beforeEach(() => {
    saveProject({
      slug: projectSlug,
      name: "Backup Test Project",
      description: "Testing complete system backup archives",
      isPublic: true,
    });

    saveProjectToc(projectSlug, [
      {
        id: "sec-backup-test",
        title: "Backup Section",
        articles: [{ slug: "art-backup-1", title: "Article 1", isPublished: true }],
      },
    ]);
    saveArticleContent(projectSlug, "art-backup-1", "Original Article Content V1 before backup");
    publishArticle(projectSlug, "art-backup-1", "backup-tester");

    // Ensure sample image exists in public/images
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    fs.writeFileSync(path.join(imagesDir, "test-backup-sample.webp"), Buffer.from("RIFFtestWEBPVP8"));
  });

  it("creates a full zip archive containing db.sqlite, images, and manifest.json", async () => {
    const backupPath = await backupDb();
    expect(backupPath.endsWith(".zip")).toBe(true);
    expect(fs.existsSync(backupPath)).toBe(true);

    // Open and inspect zip archive contents
    const directory = await getUnzipper().Open.file(backupPath);
    const filenames = directory.files.map((f: any) => f.path);

    expect(filenames).toContain("db.sqlite");
    expect(filenames).toContain("manifest.json");
    expect(filenames.some((f: string) => f.startsWith("images/"))).toBe(true);

    // Clean up created backup
    deleteBackupFile(path.basename(backupPath));
  });

  it("successfully restores database and images from full zip backup archive", async () => {
    // 1. Create full backup with V1 content
    const backupPath = await backupDb();
    const backupFilename = path.basename(backupPath);

    // 2. Modify article to V2 and delete sample image to simulate data loss
    saveArticleContent(projectSlug, "art-backup-1", "Modified Article Content V2 - AFTER BACKUP");
    publishArticle(projectSlug, "art-backup-1", "backup-tester");
    expect(getArticleContent(projectSlug, "art-backup-1")).toBe("Modified Article Content V2 - AFTER BACKUP");

    const sampleImagePath = path.join(imagesDir, "test-backup-sample.webp");
    if (fs.existsSync(sampleImagePath)) {
      fs.unlinkSync(sampleImagePath);
    }
    expect(fs.existsSync(sampleImagePath)).toBe(false);

    // 3. Restore from full backup archive
    await restoreDb(backupFilename);

    // 4. Verify article content restored to V1
    const restoredContent = getArticleContent(projectSlug, "art-backup-1");
    expect(restoredContent).toBe("Original Article Content V1 before backup");

    // 5. Verify image restored to filesystem
    expect(fs.existsSync(sampleImagePath)).toBe(true);

    // Cleanup
    deleteBackupFile(backupFilename);
  });

  it("manages backup retention configuration correctly", () => {
    saveBackupConfig({ maxBackups: 7, scheduleInterval: "weekly", autoBackup: false });
    const config = getBackupConfig();
    expect(config.maxBackups).toBe(7);
    expect(config.scheduleInterval).toBe("weekly");
    expect(config.autoBackup).toBe(false);

    // Restore standard defaults
    saveBackupConfig({ maxBackups: 5, scheduleInterval: "daily", autoBackup: true });
  });

  it("lists all backup archives sorted by modification time", async () => {
    const backupPath = await backupDb();
    const list = getBackupsList();
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].name.endsWith(".zip") || list[0].name.endsWith(".sqlite")).toBe(true);
    expect(list[0].size).toBeGreaterThan(0);

    deleteBackupFile(path.basename(backupPath));
  });
});
