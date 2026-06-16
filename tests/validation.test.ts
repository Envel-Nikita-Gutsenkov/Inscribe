import { describe, it, expect } from "vitest";
import { slugSchema, customDomainSchema, projectSchema, userSchema } from "../src/lib/validation";

describe("Validation Schemas", () => {
  describe("Slug Schema", () => {
    it("should accept valid slugs", () => {
      expect(slugSchema.safeParse("my-awesome-slug-123").success).toBe(true);
      expect(slugSchema.safeParse("simple").success).toBe(true);
    });

    it("should reject invalid slug formats", () => {
      expect(slugSchema.safeParse("").success).toBe(false);
      expect(slugSchema.safeParse("Upper-Case").success).toBe(false);
      expect(slugSchema.safeParse("under_score").success).toBe(false);
      expect(slugSchema.safeParse("space in slug").success).toBe(false);
      expect(slugSchema.safeParse("special!").success).toBe(false);
    });
  });

  describe("Custom Domain Schema", () => {
    it("should accept valid domains", () => {
      expect(customDomainSchema.safeParse("example.com").success).toBe(true);
      expect(customDomainSchema.safeParse("docs.project.io").success).toBe(true);
      expect(customDomainSchema.safeParse("sub-domain.example.com:8080").success).toBe(true);
    });

    it("should transform empty string or undefined to undefined", () => {
      const resultEmpty = customDomainSchema.parse("");
      expect(resultEmpty).toBeUndefined();

      const resultUndefined = customDomainSchema.parse(undefined);
      expect(resultUndefined).toBeUndefined();
    });

    it("should reject invalid domain names", () => {
      expect(customDomainSchema.safeParse("http://example.com").success).toBe(false);
      expect(customDomainSchema.safeParse("example").success).toBe(false);
      expect(customDomainSchema.safeParse(".example.com").success).toBe(false);
    });
  });

  describe("Project Schema", () => {
    it("should validate a complete correct project object", () => {
      const validProject = {
        slug: "inscribe-docs",
        name: "Inscribe App Docs",
        description: "Official Documentation",
        customDomain: "docs.inscribe.best",
        isPublic: true,
        passcode: "12345",
      };
      expect(projectSchema.safeParse(validProject).success).toBe(true);
    });

    it("should fail validation on invalid settings", () => {
      const invalidProject = {
        slug: "Invalid-Slug",
        name: "",
        isPublic: "yes", // should be boolean
      };
      expect(projectSchema.safeParse(invalidProject).success).toBe(false);
    });
  });

  describe("User Schema", () => {
    it("should accept valid user objects", () => {
      const validUser = {
        id: "user-99",
        username: "editor_john",
        totpSecret: "NBSWY3DPEB3W64TBNQXDQ",
        role: "editor" as const,
        projects: ["inscribe-docs"],
      };
      expect(userSchema.safeParse(validUser).success).toBe(true);
    });

    it("should fail on invalid role or empty secret", () => {
      const invalidUser = {
        id: "user-100",
        username: "john",
        totpSecret: "",
        role: "guest", // invalid
        projects: [],
      };
      expect(userSchema.safeParse(invalidUser).success).toBe(false);
    });
  });
});
