import { describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";
import { getDictionary, translations } from "../src/lib/i18n";
import { 
  verifySectionCredentials, 
  getProjectToc, 
  saveProjectToc, 
  getArticleSection,
  getSectionById
} from "../src/lib/db/articles";
import {
  generateSectionAuthToken,
  verifySectionAuthToken,
  recordSectionAttempt,
  checkSectionRateLimit
} from "../src/lib/sectionAuth";
import { saveProject } from "../src/lib/db/projects";

function hashPass(p: string) {
  return crypto.createHash("sha256").update(p.trim()).digest("hex");
}

describe("i18n Localization System", () => {
  it("returns English dictionary by default", () => {
    const dict = getDictionary("en");
    expect(dict.common.home).toBe("Home");
    expect(dict.home.recommendedProjects).toBe("Recommended Projects");
    expect(dict.reader.projectProtected).toBe("Project Protected");
  });

  it("returns Russian dictionary when requested", () => {
    const dict = getDictionary("ru");
    expect(dict.common.home).toBe("Главная");
    expect(dict.home.recommendedProjects).toBe("Рекомендуемые проекты");
    expect(dict.reader.projectProtected).toBe("Проект защищен");
    expect(dict.reader.sectionProtected).toBe("Защищенный раздел");
    expect(dict.common.login).toBe("Войти");
  });

  it("falls back to English on unsupported locale", () => {
    const dict = getDictionary("fr");
    expect(dict.common.home).toBe("Home");
  });
});

describe("Section Protection & Security Audit", () => {
  const projectSlug = "security-test-proj";

  beforeEach(() => {
    saveProject({
      slug: projectSlug,
      name: "Security Test Project",
      description: "Testing section level protection",
      isPublic: true,
    });
  });

  it("handles protected sections with username and password verification", () => {
    const sectionId = "sec-protected-1";
    const rawPass = "SuperSecretPassword123!";
    saveProjectToc(projectSlug, [
      {
        id: sectionId,
        title: "Confidential Docs",
        isProtected: true,
        protectionUsername: "adminuser",
        protectionPassword: hashPass(rawPass),
        articles: [
          { slug: "secret-doc", title: "Secret Document", isPublished: true },
        ],
      },
    ]);

    // Check TOC doesn't expose raw protectionPassword
    const toc = getProjectToc(projectSlug);
    expect(toc[0].isProtected).toBe(true);
    expect(toc[0].protectionUsername).toBe("adminuser");
    expect((toc[0] as any).protectionPassword).toBeUndefined();

    // Verify correct credentials
    expect(verifySectionCredentials(sectionId, "adminuser", rawPass)).toBe(true);

    // Case-insensitive username check (constant-time)
    expect(verifySectionCredentials(sectionId, "ADMINUSER", rawPass)).toBe(true);

    // Wrong password check
    expect(verifySectionCredentials(sectionId, "adminuser", "WrongPassword")).toBe(false);

    // Wrong username check
    expect(verifySectionCredentials(sectionId, "otheruser", rawPass)).toBe(false);
  });

  it("supports password-only protected sections", () => {
    const sectionId = "sec-pass-only";
    const rawPass = "SectionPasscode456";
    saveProjectToc(projectSlug, [
      {
        id: sectionId,
        title: "Passcode Only Section",
        isProtected: true,
        protectionPassword: hashPass(rawPass),
        articles: [
          { slug: "passcode-article", title: "Passcode Article", isPublished: true },
        ],
      },
    ]);

    expect(verifySectionCredentials(sectionId, undefined, rawPass)).toBe(true);
    expect(verifySectionCredentials(sectionId, "", rawPass)).toBe(true);
    expect(verifySectionCredentials(sectionId, undefined, "BadPasscode")).toBe(false);
  });

  it("generates and cryptographically verifies HMAC section auth tokens with TTL", () => {
    const sectionId = "sec-token-test";
    const token = generateSectionAuthToken(sectionId);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    // New format: <iat_hex>.<sha256_hex>
    expect(token).toMatch(/^[0-9a-f]+\.[0-9a-f]{64}$/);

    expect(verifySectionAuthToken(sectionId, token)).toBe(true);
    expect(verifySectionAuthToken("other-sec", token)).toBe(false);
    expect(verifySectionAuthToken(sectionId, "invalid-token")).toBe(false);
    expect(verifySectionAuthToken(sectionId, "")).toBe(false);

    // Tampered sig must be rejected
    const dot = token.indexOf(".");
    const badSig = "a".repeat(64);
    expect(verifySectionAuthToken(sectionId, token.substring(0, dot + 1) + badSig)).toBe(false);
  });

  it("enforces rate limiting after 5 failed section access attempts", () => {
    const rateKey = "rate_limit_test_key_unique_7x2";
    
    // 4 failed attempts should not lock
    for (let i = 0; i < 4; i++) {
      recordSectionAttempt(rateKey, false);
      expect(checkSectionRateLimit(rateKey).locked).toBe(false);
    }

    // 5th failed attempt should lock
    recordSectionAttempt(rateKey, false);
    const limit = checkSectionRateLimit(rateKey);
    expect(limit.locked).toBe(true);
    expect(limit.remainingSec).toBeGreaterThan(0);

    // Successful attempt resets lockout
    recordSectionAttempt(rateKey, true);
    expect(checkSectionRateLimit(rateKey).locked).toBe(false);
  });

  it("accurately retrieves article section metadata without leaking password", () => {
    const sectionId = "sec-meta-test";
    saveProjectToc(projectSlug, [
      {
        id: sectionId,
        title: "Meta Section",
        isProtected: true,
        protectionUsername: "metauser",
        protectionPassword: hashPass("metapassword"),
        articles: [
          { slug: "meta-art", title: "Meta Article", isPublished: true },
        ],
      },
    ]);

    const meta = getArticleSection(projectSlug, "meta-art");
    expect(meta).toBeDefined();
    expect(meta?.sectionId).toBe(sectionId);
    expect(meta?.isProtected).toBe(true);
    expect(meta?.protectionUsername).toBe("metauser");
    // protectionPassword must never appear in getArticleSection result
    expect((meta as any)?.protectionPassword).toBeUndefined();
  });

  it("generates and verifies cryptographic passcode tokens for protected projects", async () => {
    const { generatePasscodeToken, verifyPasscodeToken } = await import("../src/lib/sectionAuth");
    const testSlug = "secret-project-pass";
    const passHash = hashPass("SecretVaultPass123");

    const token = generatePasscodeToken(testSlug, passHash);
    expect(token).toBeDefined();
    expect(token).toMatch(/^[0-9a-f]+\.[0-9a-f]{64}$/);

    expect(verifyPasscodeToken(testSlug, passHash, token)).toBe(true);
    expect(verifyPasscodeToken("other-slug", passHash, token)).toBe(false);
    expect(verifyPasscodeToken(testSlug, hashPass("WrongPass"), token)).toBe(false);
    expect(verifyPasscodeToken(testSlug, passHash, "invalid.token")).toBe(false);
  });
});
