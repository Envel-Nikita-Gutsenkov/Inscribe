import * as OTPAuth from "otpauth";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getUsers, saveUser, User } from "./db";
import crypto from "crypto";

export function generateRecoveryCodes(): { plainCodes: string[]; hashedCodes: string } {
  const plainCodes: string[] = [];
  const hashedList: string[] = [];
  
  for (let i = 0; i < 8; i++) {
    const part1 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const part2 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const code = `${part1}-${part2}`;
    plainCodes.push(code);
    
    const hash = crypto.createHash("sha256").update(code).digest("hex");
    hashedList.push(hash);
  }
  
  return {
    plainCodes,
    hashedCodes: hashedList.join(","),
  };
}

export function verifyAndConsumeRecoveryCode(user: User, token: string): boolean {
  if (!user.recoveryCodes) {
    return false;
  }
  
  const formattedToken = token.trim().toUpperCase();
  const hash = crypto.createHash("sha256").update(formattedToken).digest("hex");
  const hashes = user.recoveryCodes.split(",");
  const index = hashes.indexOf(hash);
  
  if (index !== -1) {
    hashes.splice(index, 1);
    user.recoveryCodes = hashes.length > 0 ? hashes.join(",") : "";
    saveUser(user);
    return true;
  }
  
  return false;
}

export const SESSION_COOKIE = "inscribe_session";
const SESSION_DURATION_HOURS = 3;
const TOTP_ISSUER = "Inscribe Docs";

// Account Lockout Configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface SessionPayload {
  userId: string;
  username: string;
  role: "superadmin" | "editor";
  projects: string[];
}

const secretStr = process.env.INSCRIBE_JWT_SECRET;
const FALLBACK_SECRET = "inscribe-fallback-super-secret-key-at-least-32-chars";
const secretKey = new TextEncoder().encode(secretStr || FALLBACK_SECRET);

function getJwtSecret(): Uint8Array {
  if (!secretStr) {
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
      throw new Error("CRITICAL SECURITY ERROR: INSCRIBE_JWT_SECRET environment variable is missing!");
    }
  }
  return secretKey;
}


// Generate new TOTP configuration
export function generateTotp(username: string): { secret: string; uri: string } {
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label: username,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });
  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

// Verify TOTP token
export function verifyTotp(secret: string, token: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      issuer: TOTP_ISSUER,
      label: "",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
  } catch (err) {
    console.error("TOTP verification error:", err);
    return false;
  }
}

// JWT Session management
export async function createSession(user: User): Promise<string> {
  const secret = getJwtSecret();
  const payload: SessionPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    projects: user.projects,
  };
  
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_HOURS}h`)
    .sign(secret);
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// Lockout helpers
export function checkUserLock(user: User): { locked: boolean; remainingMs: number } {
  if (user.lockedUntil && user.lockedUntil > Date.now()) {
    return { locked: true, remainingMs: user.lockedUntil - Date.now() };
  }
  return { locked: false, remainingMs: 0 };
}

export function recordLoginAttempt(username: string, success: boolean): { error?: string } {
  const users = getUsers();
  const userIndex = users.findIndex((u) => u.username.toLowerCase() === username.toLowerCase());
  if (userIndex === -1) {
    return { error: "Invalid username or authorization code" };
  }
  
  const user = users[userIndex];
  
  // Check lock status
  const lock = checkUserLock(user);
  if (lock.locked) {
    const min = Math.ceil(lock.remainingMs / 60000);
    return { error: `Account is locked. Try again in ${min} min.` };
  }
  
  if (success) {
    user.failedAttempts = 0;
    user.lockedUntil = 0;
    saveUser(user);
    return {};
  } else {
    const attempts = (user.failedAttempts || 0) + 1;
    user.failedAttempts = attempts;
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      user.failedAttempts = 0; // reset counter after locking
    }
    saveUser(user);
    
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      return { error: "Too many failed attempts. Account locked for 15 minutes." };
    }
    return { error: `Invalid TOTP code. Attempts remaining: ${MAX_FAILED_ATTEMPTS - attempts}` };
  }
}
