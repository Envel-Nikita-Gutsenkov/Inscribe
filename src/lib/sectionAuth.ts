import crypto from "crypto";
import { cookies } from "next/headers";
import { getSession } from "./auth";
import { db } from "./db/connection";

const secretStr = process.env.INSCRIBE_JWT_SECRET || "inscribe-fallback-super-secret-key-at-least-32-chars";

// Token TTL: 7 days in seconds
const TOKEN_TTL_SEC = 60 * 60 * 24 * 7;
// Window for accepting slightly expired tokens on clock skew (30 sec)
const CLOCK_SKEW_SEC = 30;

// Ensure rate_limit_attempts table exists (safe to call multiple times)
db.exec(`
  CREATE TABLE IF NOT EXISTS rate_limit_attempts (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT 0
  );
`);

const stmtGetAttempt = db.prepare("SELECT count, locked_until FROM rate_limit_attempts WHERE key = ?");
const stmtUpsertAttempt = db.prepare(`
  INSERT INTO rate_limit_attempts (key, count, locked_until, updated_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET count = excluded.count, locked_until = excluded.locked_until, updated_at = excluded.updated_at
`);
const stmtDeleteAttempt = db.prepare("DELETE FROM rate_limit_attempts WHERE key = ?");
// Purge stale records older than 2 hours to prevent table bloat
const stmtPurgeStale = db.prepare("DELETE FROM rate_limit_attempts WHERE updated_at < ?");

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 min

export function checkSectionRateLimit(key: string): { locked: boolean; remainingSec: number } {
  // Periodic purge of stale keys (no-op if nothing to delete)
  stmtPurgeStale.run(Date.now() - 2 * 60 * 60 * 1000);

  const row = stmtGetAttempt.get(key) as { count: number; locked_until: number } | undefined;
  if (row && row.locked_until > Date.now()) {
    return { locked: true, remainingSec: Math.ceil((row.locked_until - Date.now()) / 1000) };
  }
  return { locked: false, remainingSec: 0 };
}

export function recordSectionAttempt(key: string, success: boolean) {
  if (success) {
    stmtDeleteAttempt.run(key);
    return;
  }
  const row = stmtGetAttempt.get(key) as { count: number; locked_until: number } | undefined;
  const count = (row?.count || 0) + 1;
  const lockedUntil = count >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : (row?.locked_until || 0);
  const newCount = count >= MAX_ATTEMPTS ? 0 : count;
  stmtUpsertAttempt.run(key, newCount, lockedUntil, Date.now());
}

export function generateSectionAuthToken(sectionId: string): string {
  const iat = Math.floor(Date.now() / 1000);
  const hmac = crypto.createHmac("sha256", secretStr);
  hmac.update(`sec_auth:${sectionId}:${iat}`);
  const sig = hmac.digest("hex");
  // Format: <iat_hex>.<sig> — both parts needed to verify
  return `${iat.toString(16)}.${sig}`;
}

export function verifySectionAuthToken(sectionId: string, token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const dot = token.indexOf(".");
  if (dot === -1) return false;

  const iatHex = token.substring(0, dot);
  const sig = token.substring(dot + 1);
  if (!iatHex || !sig) return false;

  const iat = parseInt(iatHex, 16);
  if (isNaN(iat)) return false;

  const now = Math.floor(Date.now() / 1000);
  // Reject expired tokens (older than TTL + clock skew allowance)
  if (now > iat + TOKEN_TTL_SEC + CLOCK_SKEW_SEC) return false;
  // Reject tokens with future timestamp (more than skew tolerance)
  if (iat > now + CLOCK_SKEW_SEC) return false;

  const hmac = crypto.createHmac("sha256", secretStr);
  hmac.update(`sec_auth:${sectionId}:${iat}`);
  const expected = hmac.digest("hex");

  // Both buffers must be hex strings of equal length for timingSafeEqual
  if (sig.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export async function hasSectionAccess(projectSlug: string, sectionId: string): Promise<boolean> {
  // Admin session bypass
  const session = await getSession();
  if (session && (session.role === "superadmin" || session.projects.includes(projectSlug))) {
    return true;
  }

  const cookieStore = await cookies();
  const cookieName = `sec_auth_${sectionId}`;
  const token = cookieStore.get(cookieName)?.value;
  if (!token) return false;

  return verifySectionAuthToken(sectionId, token);
}

export function generatePasscodeToken(projectSlug: string, passcodeHash: string): string {
  const iat = Math.floor(Date.now() / 1000);
  const hmac = crypto.createHmac("sha256", secretStr);
  hmac.update(`passcode:${projectSlug}:${passcodeHash}:${iat}`);
  return `${iat.toString(16)}.${hmac.digest("hex")}`;
}

export function verifyPasscodeToken(projectSlug: string, passcodeHash: string, token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const dot = token.indexOf(".");
  if (dot === -1) return false;

  const iatHex = token.substring(0, dot);
  const sig = token.substring(dot + 1);
  if (!iatHex || !sig) return false;

  const iat = parseInt(iatHex, 16);
  if (isNaN(iat)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (now > iat + TOKEN_TTL_SEC + CLOCK_SKEW_SEC) return false;
  if (iat > now + CLOCK_SKEW_SEC) return false;

  const hmac = crypto.createHmac("sha256", secretStr);
  hmac.update(`passcode:${projectSlug}:${passcodeHash}:${iat}`);
  const expected = hmac.digest("hex");

  if (sig.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export async function hasProjectPasscodeAccess(projectSlug: string, passcode?: string | null): Promise<boolean> {
  if (!passcode) return true;

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(`passcode_${projectSlug}`)?.value;
  if (!cookieToken) return false;

  const storedPassHash =
    passcode.length === 64 && /^[0-9a-f]+$/.test(passcode)
      ? passcode
      : crypto.createHash("sha256").update(passcode).digest("hex");

  return verifyPasscodeToken(projectSlug, storedPassHash, cookieToken);
}
