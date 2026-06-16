import { describe, it, expect } from "vitest";
import { generateRecoveryCodes, verifyAndConsumeRecoveryCode } from "../src/lib/auth";
import { computeLineDiff } from "../src/lib/diff";
import { saveArticleContent, getArticleContent, db } from "../src/lib/db";
import zlib from "zlib";

describe("Phase 8 & Storage Optimizations", () => {
  describe("Database Storage Compression", () => {
    it("should compress article content when saving, and decompress when reading", () => {
      const projectSlug = "inscribe-docs";
      const articleSlug = "welcome";
      
      const longText = "This is a very long text to test zlib compression. ".repeat(100);
      saveArticleContent(projectSlug, articleSlug, longText);
      
      // Verify stored content in SQLite is compressed binary blob
      const stored = db.prepare("SELECT content FROM articles WHERE projectSlug = ? AND slug = ?").get(projectSlug, articleSlug) as { content: any };
      expect(stored.content).toBeInstanceOf(Buffer);
      
      // Decompress and verify
      const decompressed = zlib.inflateSync(stored.content).toString("utf-8");
      expect(decompressed).toBe(longText);
      
      // Verify reading via helper returns the raw text
      const retrieved = getArticleContent(projectSlug, articleSlug, true);
      expect(retrieved).toBe(longText);
    });
  });

  describe("Multi-factor Recovery Codes", () => {
    it("should generate 8 unique recovery codes", () => {
      const recovery = generateRecoveryCodes();
      expect(recovery.plainCodes).toHaveLength(8);
      expect(recovery.hashedCodes.split(",")).toHaveLength(8);
      
      // Check formatting XXXX-XXXX
      expect(recovery.plainCodes[0]).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it("should verify and consume a valid recovery code", () => {
      const recovery = generateRecoveryCodes();
      const user: any = {
        id: "test-user-mf",
        username: "mfa-user",
        totpSecret: "NBSWY3DPEB3W64TBNQXDQ",
        role: "editor",
        projects: [],
        recoveryCodes: recovery.hashedCodes
      };

      const codeToUse = recovery.plainCodes[3];
      
      // Verify code
      const isValid = verifyAndConsumeRecoveryCode(user, codeToUse);
      expect(isValid).toBe(true);
      
      // Verify code has been consumed (removed from list)
      const remainingCodes = user.recoveryCodes.split(",");
      expect(remainingCodes).toHaveLength(7);
      
      // Re-verifying same code should fail
      const isStillValid = verifyAndConsumeRecoveryCode(user, codeToUse);
      expect(isStillValid).toBe(false);
    });
  });

  describe("Line Diff Utility", () => {
    it("should compute additions, deletions, and unchanged lines correctly", () => {
      const oldText = "Hello World\nLine 2\nLine 3";
      const newText = "Hello World\nLine 2 modified\nLine 3\nLine 4";
      
      const diff = computeLineDiff(oldText, newText);
      
      expect(diff).toEqual([
        { type: "unchanged", content: "Hello World" },
        { type: "removed", content: "Line 2" },
        { type: "added", content: "Line 2 modified" },
        { type: "unchanged", content: "Line 3" },
        { type: "added", content: "Line 4" }
      ]);
    });
  });
});
