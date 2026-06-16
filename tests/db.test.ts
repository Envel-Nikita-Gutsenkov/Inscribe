import { describe, it, expect, beforeEach } from "vitest";
import { 
  getUserByUsername, 
  saveUser, 
  deleteUser, 
  getProjectBySlug, 
  saveProject, 
  deleteProject, 
  getProjectToc,
  saveProjectToc,
  getArticleContent,
  saveArticleContent,
  publishArticle,
  rollbackArticle,
  getArticleHistory,
  searchArticles,
  clearCache
} from "../src/lib/db";
import { db } from "../src/lib/db/connection";

describe("Database Layer & FTS5 Search", () => {
  beforeEach(() => {
    // Reset cache before each test
    clearCache();
  });

  describe("Users Management", () => {
    it("should have a seeded superadmin user", () => {
      // Seed generates a random username — just verify one superadmin exists
      const admin = db.prepare("SELECT * FROM users WHERE role = 'superadmin' LIMIT 1").get() as any;
      expect(admin).toBeDefined();
      expect(admin.role).toBe("superadmin");
      expect(typeof admin.username).toBe("string");
      expect(admin.username.length).toBeGreaterThan(0);
    });

    it("should save, retrieve, and delete a new user", () => {
      const newUser = {
        id: "test-user-id",
        username: "testeditor",
        totpSecret: "NBSWY3DPEB3W64TBNQXDQ",
        role: "editor" as const,
        projects: ["inscribe-docs"],
      };

      saveUser(newUser);

      const retrieved = getUserByUsername("testeditor");
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe("test-user-id");
      expect(retrieved?.role).toBe("editor");

      deleteUser("test-user-id");
      expect(getUserByUsername("testeditor")).toBeNull();
    });
  });

  describe("Projects Management", () => {
    it("should save and retrieve project configuration", () => {
      const newProj = {
        slug: "test-proj",
        name: "Test Project",
        description: "Unit Testing Project",
        isPublic: true,
        customDomain: "test.example.com",
        maxVersions: 3,
        retentionDays: 7,
      };

      saveProject(newProj);

      const retrieved = getProjectBySlug("test-proj");
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("Test Project");
      expect(retrieved?.customDomain).toBe("test.example.com");

      // Cleanup
      deleteProject("test-proj");
      expect(getProjectBySlug("test-proj")).toBeNull();
    });
  });

  describe("Articles & Table of Contents", () => {
    it("should save project structure and retrieve draft content", () => {
      const projectSlug = "inscribe-docs";
      const toc = [
        {
          id: "sec-1",
          title: "First Section",
          articles: [
            { slug: "art-1", title: "Article One", isPublished: false }
          ]
        }
      ];

      saveProjectToc(projectSlug, toc);

      const retrievedToc = getProjectToc(projectSlug);
      expect(retrievedToc).toHaveLength(1);
      expect(retrievedToc[0].title).toBe("First Section");
      expect(retrievedToc[0].articles).toHaveLength(1);
      expect(retrievedToc[0].articles[0].slug).toBe("art-1");

      // Verify default draft content was created
      const content = getArticleContent(projectSlug, "art-1", true); // draft
      expect(content).toContain("Start writing article content here...");

      // Save custom content
      saveArticleContent(projectSlug, "art-1", "This is customized markdown text.");
      expect(getArticleContent(projectSlug, "art-1", true)).toBe("This is customized markdown text.");
    });
  });

  describe("Publishing & Revisions", () => {
    it("should track article publication history and prune according to limits", () => {
      const projectSlug = "inscribe-docs";
      
      // Mock Date.now to increment deterministically so history order is guaranteed
      const originalNow = Date.now;
      let mockTime = 1700000000000;
      Date.now = () => {
        mockTime += 1000;
        return mockTime;
      };

      // Seed project settings with limit maxVersions = 2 and no batch window
      db.prepare("UPDATE projects SET historyMaxVersions = 2, historyBatchWindowMinutes = 0 WHERE slug = ?").run(projectSlug);

      // Get the real seeded user id
      const adminUser = db.prepare("SELECT id FROM users WHERE role = 'superadmin' LIMIT 1").get() as { id: string };
      const adminId = adminUser.id;

      // Create section and article
      const toc = [
        {
          id: "sec-retention",
          title: "Retention Sec",
          articles: [{ slug: "art-retention", title: "Retention Art", isPublished: false }]
        }
      ];
      saveProjectToc(projectSlug, toc);

      // Save content and publish multiple times
      saveArticleContent(projectSlug, "art-retention", "Version 1 content");
      publishArticle(projectSlug, "art-retention", adminId, "Summary 1");

      saveArticleContent(projectSlug, "art-retention", "Version 2 content");
      publishArticle(projectSlug, "art-retention", adminId, "Summary 2");

      saveArticleContent(projectSlug, "art-retention", "Version 3 content");
      publishArticle(projectSlug, "art-retention", adminId, "Summary 3");

      // Since limit is 2, the oldest history (Version 1) should be pruned
      const history = getArticleHistory(projectSlug, "art-retention");
      expect(history.length).toBeLessThanOrEqual(2);
      expect(history[0].changeSummary).toBe("Summary 3");
      expect(history[1].changeSummary).toBe("Summary 2");

      // Rollback to Version 2
      rollbackArticle(projectSlug, "art-retention", history[1].id);
      expect(getArticleContent(projectSlug, "art-retention", true)).toBe("Version 2 content");

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe("FTS5 Full-Text Search", () => {
    it("should index new articles and return highlighted snippets", () => {
      const projectSlug = "inscribe-docs";
      const toc = [
        {
          id: "sec-search",
          title: "Search Sec",
          articles: [{ slug: "art-search", title: "Deep Search Article", isPublished: false }]
        }
      ];
      saveProjectToc(projectSlug, toc);
      
      saveArticleContent(projectSlug, "art-search", "This contains the secret term rocket ship flying to space.");
      const adminUser2 = db.prepare("SELECT id FROM users WHERE role = 'superadmin' LIMIT 1").get() as { id: string };
      publishArticle(projectSlug, "art-search", adminUser2.id);

      const results = searchArticles("rocket");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].slug).toBe("art-search");
      expect(results[0].contentSnippet).toContain("==rocket=="); // matches snippet highlighting brackets
    });
  });
});
