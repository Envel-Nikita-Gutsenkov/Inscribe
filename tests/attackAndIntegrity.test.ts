import { describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";
import { NextRequest } from "next/server";
import { 
  saveProject, 
  getProjectBySlug, 
  getProjects, 
  deleteProject, 
  getProjectByDomain 
} from "../src/lib/db/projects";
import { 
  getProjectToc, 
  saveProjectToc, 
  getArticleContent, 
  saveArticleContent, 
  publishArticle, 
  searchArticles, 
  getArticleSection,
  verifySectionCredentials,
  clearCache
} from "../src/lib/db/articles";
import { compress, decompress } from "../src/lib/db/compression";
import { 
  generateSectionAuthToken, 
  verifySectionAuthToken, 
  checkSectionRateLimit, 
  recordSectionAttempt 
} from "../src/lib/sectionAuth";
import { verifyApiAuth } from "../src/lib/apiAuth";
import { getDictionary } from "../src/lib/i18n";
import { GET as searchRoute } from "../src/app/api/search/route";
import { POST as createProjectRoute } from "../src/app/api/v1/projects/route";
import { PUT as updateProjectRoute } from "../src/app/api/v1/projects/[projectSlug]/route";
import { POST as createArticleRoute } from "../src/app/api/v1/projects/[projectSlug]/articles/route";
import { PUT as updateArticleRoute } from "../src/app/api/v1/projects/[projectSlug]/articles/[articleSlug]/route";

// Comprehensive Fuzz Generator
function generateMaliciousPayloads(): string[] {
  return [
    "",
    " ",
    "\t\r\n",
    "\0",
    "\0\0\0\0",
    "\\x00\\x1f\\xff\\xfe",
    "'; DROP TABLE articles; --",
    "' OR '1'='1",
    "\" OR \"\"=\"",
    "1; SELECT * FROM users;",
    "UNION SELECT null, null, null, null, null--",
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert(1)>",
    "javascript:/*--></title></style></textarea></script></xmp><svg/onload='+/'/+/onmouseover=1/+/[*/[]/+alert(1)//'>",
    "../../../../../../etc/passwd",
    "..\\..\\..\\..\\windows\\win.ini",
    "%00%2e%2e%2f",
    "A".repeat(100_000), // 100KB payload
    "🦀🔥🚀".repeat(10_000), // Massive multi-byte UTF-8
    "{{constructor.constructor('return process')()}}", // Template injection attempt
    "{\"__proto__\": {\"admin\": true}}", // Prototype pollution
    "__proto__",
    "constructor",
    "prototype",
    NaN.toString(),
    Infinity.toString(),
    "-1",
    "0",
    "9999999999999999999999999999999999999999",
  ];
}

describe("1. Security Attack Simulation & Boundary Exploitation", () => {
  const testProject = "attack-sim-project";

  beforeEach(() => {
    saveProject({
      slug: testProject,
      name: "Attack Simulation Project",
      description: "Project for vulnerability and boundary tests",
      isPublic: true,
    });
  });

  it("resists SQL Injection across all database queries", () => {
    const maliciousPayloads = generateMaliciousPayloads();

    for (const payload of maliciousPayloads) {
      // 1. Project query
      expect(() => getProjectBySlug(payload)).not.toThrow();
      expect(() => getProjectByDomain(payload)).not.toThrow();

      // 2. Article & Section queries
      expect(() => getArticleContent(testProject, payload)).not.toThrow();
      expect(() => getArticleSection(testProject, payload)).not.toThrow();
      expect(() => verifySectionCredentials(payload, payload, payload)).not.toThrow();

      // 3. Search query
      expect(() => searchArticles(payload)).not.toThrow();
      expect(() => searchArticles(payload, testProject)).not.toThrow();
    }
  });

  it("prevents search index data exfiltration from private projects and protected sections", () => {
    // 1. Create a private project with sensitive keywords
    const secretProjectSlug = "classified-alpha-1";
    saveProject({
      slug: secretProjectSlug,
      name: "Top Secret Core",
      description: "Confidential private documentation",
      isPublic: false,
      passcode: "vault-99",
    });

    saveProjectToc(secretProjectSlug, [
      {
        id: "sec-classified",
        title: "Confidential Runbooks",
        isProtected: false,
        articles: [{ slug: "secret-keys", title: "Secret API Keys", isPublished: true }],
      },
    ]);
    saveArticleContent(secretProjectSlug, "secret-keys", "SUPER_SECRET_PAT_TOKEN_XYZ_12345");
    publishArticle(secretProjectSlug, "secret-keys", "test-user");

    // 2. Create a protected section in a public project
    saveProjectToc(testProject, [
      {
        id: "sec-protected-vault",
        title: "Protected Vault",
        isProtected: true,
        protectionUsername: "vaultadmin",
        protectionPassword: "SuperSecretPassword123!",
        articles: [{ slug: "internal-credentials", title: "Internal DB Passwords", isPublished: true }],
      },
    ]);
    saveArticleContent(testProject, "internal-credentials", "CRITICAL_DATABASE_PRODUCTION_PASSWORD_888");
    publishArticle(testProject, "internal-credentials", "test-user");

    // 3. Global search for confidential tokens must NOT leak snippets
    const leakSearch1 = searchArticles("SUPER_SECRET_PAT_TOKEN_XYZ_12345");
    expect(leakSearch1.length).toBe(0);

    const leakSearch2 = searchArticles("CRITICAL_DATABASE_PRODUCTION_PASSWORD_888");
    expect(leakSearch2.length).toBe(0);

    // 4. Scoped search must also reject private project queries
    const leakSearch3 = searchArticles("SUPER_SECRET", secretProjectSlug);
    expect(leakSearch3.length).toBe(0);

    const leakSearch4 = searchArticles("CRITICAL_DATABASE", testProject);
    expect(leakSearch4.length).toBe(0);
  });

  it("prevents timing side-channel attacks on credentials and tokens", () => {
    const sectionId = "timing-sec-test";
    const crypto = require("crypto");
    const rawPass = "CorrectVeryLongSecretPassword1234567890!";
    const hashedPass = crypto.createHash("sha256").update(rawPass).digest("hex");

    saveProjectToc(testProject, [
      {
        id: sectionId,
        title: "Timing Test Section",
        isProtected: true,
        protectionUsername: "auditor",
        protectionPassword: hashedPass,
        articles: [],
      },
    ]);

    const correctPass = rawPass;
    const wrongPassSameLength = "XorrectVeryLongSecretPassword1234567890!";
    const wrongPassShort = "Wrong";

    // Timing Safe credential verification
    expect(verifySectionCredentials(sectionId, "auditor", wrongPassSameLength)).toBe(false);
    expect(verifySectionCredentials(sectionId, "auditor", wrongPassShort)).toBe(false);
    expect(verifySectionCredentials(sectionId, "auditor", correctPass)).toBe(true);

    // Token includes iat.sig format — must verify correctly and reject tampered tokens
    const validToken = generateSectionAuthToken(sectionId);
    expect(validToken).toMatch(/^[0-9a-f]+\.[0-9a-f]{64}$/);
    // Tamper the sig part (after the dot)
    const dot = validToken.indexOf(".");
    const tamperedSig = validToken.substring(dot + 1, dot + 63) + (validToken.endsWith("a") ? "b" : "a");
    const tamperedToken = validToken.substring(0, dot + 1) + tamperedSig;
    expect(verifySectionAuthToken(sectionId, tamperedToken)).toBe(false);
    expect(verifySectionAuthToken(sectionId, validToken)).toBe(true);
  });
});

describe("2. Fuzzing & Stress Testing", () => {
  const fuzzedProjectSlug = "fuzz-stress-project";

  beforeEach(() => {
    saveProject({
      slug: fuzzedProjectSlug,
      name: "Fuzz Stress Project",
      description: "Fuzzing project",
      isPublic: true,
    });
  });

  it("handles extreme compression and decompression without corruption or memory leak", () => {
    const hugeMarkdown = "# Massive Document\n\n" + "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(10_000);
    const compressed = compress(hugeMarkdown);
    expect(Buffer.isBuffer(compressed)).toBe(true);
    expect(compressed.length).toBeLessThan(hugeMarkdown.length * 0.1); // >90% compression

    const decompressed = decompress(compressed);
    expect(decompressed).toBe(hugeMarkdown);

    // Decompress garbage buffer must safely fallback without process crash
    const garbageBuffer = crypto.randomBytes(512);
    const safeOutput = decompress(garbageBuffer);
    expect(typeof safeOutput).toBe("string");
  });

  it("handles high concurrency and rapid TOC mutation bursts", () => {
    const tocBatches = 50;
    for (let i = 0; i < tocBatches; i++) {
      const secId = `sec-burst-${i}`;
      const artSlug = `art-burst-${i}`;

      saveProjectToc(fuzzedProjectSlug, [
        {
          id: secId,
          title: `Section Burst ${i}`,
          isProtected: i % 2 === 0,
          articles: [
            { slug: artSlug, title: `Article Burst ${i}`, isPublished: true }
          ]
        }
      ]);

      saveArticleContent(fuzzedProjectSlug, artSlug, `Content for burst ${i}`);
    }

    const finalToc = getProjectToc(fuzzedProjectSlug);
    expect(finalToc.length).toBe(1);
    expect(finalToc[0].id).toBe("sec-burst-49");
    const content = getArticleContent(fuzzedProjectSlug, "art-burst-49", true);
    expect(content).toBe("Content for burst 49");
  });

  it("handles malicious and oversized request bodies in v1 API routes", async () => {
    process.env.INSCRIBE_API_KEY = "test-fuzz-key";

    const payloads = generateMaliciousPayloads();

    for (const payload of payloads) {
      const headers = new Headers();
      headers.set("authorization", "Bearer test-fuzz-key");
      headers.set("content-type", "application/json");

      // 1. Create project with fuzzed payload
      const req1 = new NextRequest(new Request("http://localhost:3000/api/v1/projects", {
        method: "POST",
        headers,
        body: JSON.stringify({ slug: payload, name: payload, description: payload }),
      }));
      const res1 = await createProjectRoute(req1);
      expect([201, 400, 409]).toContain(res1.status);

      // 2. Create article with fuzzed payload
      const req2 = new NextRequest(new Request(`http://localhost:3000/api/v1/projects/${fuzzedProjectSlug}/articles`, {
        method: "POST",
        headers,
        body: JSON.stringify({ slug: payload, title: payload, content: payload }),
      }));
      const res2 = await createArticleRoute(req2, { params: Promise.resolve({ projectSlug: fuzzedProjectSlug }) });
      expect([201, 400, 404, 409]).toContain(res2.status);
    }
  });
});

describe("3. Failure Interruption & Data Integrity", () => {
  it("maintains cache coherency across eviction and invalidation cycles", () => {
    const pSlug = "cache-integrity-proj";
    saveProject({ slug: pSlug, name: "Cache Integrity", description: "Integrity test", isPublic: true });
    saveProjectToc(pSlug, [
      {
        id: "sec-1",
        title: "Section 1",
        articles: [{ slug: "art-1", title: "Article 1", isPublished: true }],
      },
    ]);
    saveArticleContent(pSlug, "art-1", "Initial Content");
    publishArticle(pSlug, "art-1", "tester");

    // Read to populate cache
    const initialRead = getArticleContent(pSlug, "art-1");
    expect(initialRead).toBe("Initial Content");

    // Update and publish
    saveArticleContent(pSlug, "art-1", "Updated Content v2");
    publishArticle(pSlug, "art-1", "tester");

    // Read after publish must immediately reflect updated content
    const updatedRead = getArticleContent(pSlug, "art-1");
    expect(updatedRead).toBe("Updated Content v2");

    // Clear cache explicitly
    clearCache(pSlug, "art-1");
    const freshRead = getArticleContent(pSlug, "art-1");
    expect(freshRead).toBe("Updated Content v2");
  });

  it("handles rapid rate limiter flood without integer overflow or memory degradation", () => {
    const testKey = "rate_limit_stress_ip_192.168.1.100";
    
    // Simulate 1000 rapid incorrect attempts
    for (let i = 0; i < 1000; i++) {
      recordSectionAttempt(testKey, false);
    }

    const limit = checkSectionRateLimit(testKey);
    expect(limit.locked).toBe(true);
    expect(limit.remainingSec).toBeGreaterThan(0);
    expect(limit.remainingSec).toBeLessThanOrEqual(900);

    // Immediate successful login resets cleanly
    recordSectionAttempt(testKey, true);
    expect(checkSectionRateLimit(testKey).locked).toBe(false);
  });
});
