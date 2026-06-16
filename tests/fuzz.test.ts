import { describe, it, expect } from "vitest";
import { slugSchema, customDomainSchema, projectSchema, userSchema } from "../src/lib/validation";
import { checkRateLimit } from "../src/lib/rateLimit";
import crypto from "crypto";

// Helper to generate random fuzz strings
function generateFuzzString(length: number, charset = "ascii"): string {
  const bytes = crypto.randomBytes(length);
  if (charset === "ascii") {
    return bytes.toString("ascii");
  } else if (charset === "utf8") {
    return bytes.toString("utf8");
  } else {
    // Generate randomized special character strings, SQL injection snippets, HTML etc.
    const charsets = [
      "'; DROP TABLE users; --",
      "<script>alert(1)</script>",
      "../etc/passwd",
      "\0",
      "\\x00\\x1f\\xff",
      "ãõéüß漢字",
      "A".repeat(length),
    ];
    return charsets[Math.floor(Math.random() * charsets.length)] + bytes.toString("hex").slice(0, 5);
  }
}

describe("Fuzz & Edge-Case Input Testing", () => {
  it("should process random IP strings in rate-limiter without crashing", () => {
    for (let i = 0; i < 500; i++) {
      const randomIp = generateFuzzString(16, "mixed");
      // Should return either true or false, but must not crash
      const result = checkRateLimit(randomIp);
      expect(typeof result).toBe("boolean");
    }
  });

  it("should validate random strings against slugSchema gracefully", () => {
    for (let i = 0; i < 200; i++) {
      const randomSlug = generateFuzzString(Math.floor(Math.random() * 100), "mixed");
      const parseResult = slugSchema.safeParse(randomSlug);
      // It can either succeed (if valid by chance) or fail, but never throw unhandled runtime errors
      expect(parseResult.success === true || parseResult.success === false).toBe(true);
    }
  });

  it("should validate random strings against customDomainSchema gracefully", () => {
    for (let i = 0; i < 200; i++) {
      const randomDomain = generateFuzzString(Math.floor(Math.random() * 120), "mixed");
      const parseResult = customDomainSchema.safeParse(randomDomain);
      expect(parseResult.success === true || parseResult.success === false).toBe(true);
    }
  });

  it("should validate random inputs against userSchema without crashing", () => {
    for (let i = 0; i < 100; i++) {
      const fuzzedUser = {
        id: generateFuzzString(10, "mixed"),
        username: generateFuzzString(15, "mixed"),
        totpSecret: generateFuzzString(30, "mixed"),
        role: ["superadmin", "editor", "invalid_role", "", null][Math.floor(Math.random() * 5)],
        projects: [generateFuzzString(10, "mixed"), generateFuzzString(10, "mixed")],
      };

      const parseResult = userSchema.safeParse(fuzzedUser);
      expect(parseResult.success === true || parseResult.success === false).toBe(true);
    }
  });

  it("should validate random inputs against projectSchema without crashing", () => {
    for (let i = 0; i < 100; i++) {
      const fuzzedProject = {
        slug: generateFuzzString(10, "mixed"),
        name: generateFuzzString(20, "mixed"),
        description: generateFuzzString(100, "mixed"),
        customDomain: generateFuzzString(30, "mixed"),
        isPublic: Math.random() > 0.5,
        passcode: generateFuzzString(15, "mixed"),
      };

      const parseResult = projectSchema.safeParse(fuzzedProject);
      expect(parseResult.success === true || parseResult.success === false).toBe(true);
    }
  });
});
