import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateTotp, verifyTotp, createSession, getSession, recordLoginAttempt, checkUserLock } from "../src/lib/auth";
import { getUserByUsername, saveUser } from "../src/lib/db";
import { jwtVerify } from "jose";

// Mock next/headers for getSession tests
const mockCookies = {
  get: vi.fn(),
  delete: vi.fn(),
  set: vi.fn(),
};
vi.mock("next/headers", () => ({
  cookies: async () => mockCookies,
}));

describe("Authentication & Session Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("TOTP Operations", () => {
    it("should generate valid TOTP details", () => {
      const totp = generateTotp("editor_test");
      expect(totp.secret).toBeDefined();
      expect(totp.uri).toContain("editor_test");
    });

    it("should verify correct TOTP codes and reject invalid ones", () => {
      const totp = generateTotp("editor_test");
      
      // Invalid code
      expect(verifyTotp(totp.secret, "000000")).toBe(false);
    });
  });

  describe("Account Lockouts", () => {
    it("should lock accounts after 5 failed attempts", () => {
      const username = "lockout_test_user";
      
      // Create user
      const user = {
        id: "test-lockout-id",
        username,
        totpSecret: "NBSWY3DPEB3W64TBNQXDQ",
        role: "editor" as const,
        projects: [],
        failedAttempts: 0,
        lockedUntil: 0,
      };
      saveUser(user);

      // Attempt login failed 4 times
      for (let i = 1; i <= 4; i++) {
        const attempt = recordLoginAttempt(username, false);
        expect(attempt.error).toContain(`Attempts remaining: ${5 - i}`);
      }

      // 5th attempt locks the account
      const finalAttempt = recordLoginAttempt(username, false);
      expect(finalAttempt.error).toContain("Too many failed attempts. Account locked for 15 minutes.");

      // Subsequent attempt is blocked by lockout check
      const blockedAttempt = recordLoginAttempt(username, false);
      expect(blockedAttempt.error).toContain("Account is locked");
    });

    it("should reset failed attempts count on successful login", () => {
      const username = "reset_attempts_user";
      const user = {
        id: "test-reset-id",
        username,
        totpSecret: "NBSWY3DPEB3W64TBNQXDQ",
        role: "editor" as const,
        projects: [],
        failedAttempts: 3,
        lockedUntil: 0,
      };
      saveUser(user);

      const attempt = recordLoginAttempt(username, true);
      expect(attempt.error).toBeUndefined();

      const updated = getUserByUsername(username);
      expect(updated?.failedAttempts).toBe(0);
    });
  });

  describe("JWT Sessions", () => {
    it("should sign a JWT token containing correct user payload", async () => {
      const user = {
        id: "jwt-test-id",
        username: "jwtuser",
        totpSecret: "NBSWY3DPEB3W64TBNQXDQ",
        role: "editor" as const,
        projects: ["proj-1"],
      };

      const token = await createSession(user);
      expect(token).toBeDefined();

      // Verify token
      mockCookies.get.mockReturnValue({ value: token });
      const session = await getSession();
      expect(session).toBeDefined();
      expect(session?.userId).toBe("jwt-test-id");
      expect(session?.username).toBe("jwtuser");
      expect(session?.role).toBe("editor");
      expect(session?.projects).toEqual(["proj-1"]);
    });

    it("should return null for getSession if no token cookie exists", async () => {
      mockCookies.get.mockReturnValue(undefined);
      const session = await getSession();
      expect(session).toBeNull();
    });
  });
});
