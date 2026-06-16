"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserByUsername, saveUser, getUserById } from "@/lib/db";
import { verifyTotp, createSession, SESSION_COOKIE, recordLoginAttempt, verifyAndConsumeRecoveryCode, getSession, generateRecoveryCodes } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

export async function loginAction(
  prevState: any,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  // Extract client IP and verify rate limits
  const reqHeaders = await headers();
  const ip = reqHeaders.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  if (!checkRateLimit(ip)) {
    return { success: false, error: "Too many requests. Please try again later." };
  }

  const username = (formData.get("username") as string)?.trim();
  const token = (formData.get("token") as string)?.trim();

  if (!username || !token) {
    return { success: false, error: "All fields are required" };
  }

  const user = getUserByUsername(username);
  if (!user) {
    // Prevent username enumeration by returning generic error
    return { success: false, error: "Invalid username or authorization code" };
  }

  // Check TOTP token or recovery codes or one-time invitation code
  let isAuthValid = false;
  if (user.oneTimeCode && token === user.oneTimeCode) {
    isAuthValid = true;
  } else {
    isAuthValid = verifyTotp(user.totpSecret, token);
    if (!isAuthValid) {
      isAuthValid = verifyAndConsumeRecoveryCode(user, token);
    }
  }

  const attempt = recordLoginAttempt(username, isAuthValid);

  if (attempt.error) {
    return { success: false, error: attempt.error };
  }

  if (!isAuthValid) {
    return { success: false, error: "Invalid authorization code" };
  }

  // Create JWT session
  const jwt = await createSession(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, jwt, {
    maxAge: 60 * 60 * 3, // 3 hours
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return { success: true };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/admin/login");
}

export async function confirm2FAAction(secret: string, token: string): Promise<{ success: boolean; recoveryCodes?: string[]; error?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const user = getUserById(session.userId);
    if (!user || user.totpSecret !== "PENDING") {
      return { success: false, error: "Invalid request or 2FA already set up" };
    }

    // Verify token
    const isValid = verifyTotp(secret, token);
    if (!isValid) {
      return { success: false, error: "Invalid verification code. Please check your authenticator app." };
    }

    // Generate recovery codes
    const recovery = generateRecoveryCodes();

    // Update user
    user.totpSecret = secret;
    user.oneTimeCode = undefined;
    user.recoveryCodes = recovery.hashedCodes;

    saveUser(user);

    return { success: true, recoveryCodes: recovery.plainCodes };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function resetMy2FAAction(): Promise<{ success: boolean; oneTimeCode?: string; error?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const user = getUserById(session.userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    const oneTimeCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.totpSecret = "PENDING";
    user.oneTimeCode = oneTimeCode;
    user.recoveryCodes = undefined;

    saveUser(user);

    return { success: true, oneTimeCode };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function regenerateMyRecoveryCodesAction(): Promise<{ success: boolean; recoveryCodes?: string[]; error?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const user = getUserById(session.userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.totpSecret === "PENDING") {
      return { success: false, error: "Please configure 2FA first before generating recovery codes" };
    }

    const recovery = generateRecoveryCodes();
    user.recoveryCodes = recovery.hashedCodes;

    saveUser(user);

    return { success: true, recoveryCodes: recovery.plainCodes };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

