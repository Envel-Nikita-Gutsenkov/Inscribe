import crypto from "crypto";
import { NextRequest } from "next/server";
import { getSession } from "./auth";
import { getSystemSetting } from "./db/settings";

export interface ApiAuthResult {
  authorized: boolean;
  role?: "superadmin" | "editor" | "api_key";
  username?: string;
  error?: string;
  status?: number;
}

export async function verifyApiAuth(req: NextRequest): Promise<ApiAuthResult> {
  // 1. Check Bearer token / x-api-key
  const authHeader = req.headers.get("authorization");
  const apiKeyHeader = req.headers.get("x-api-key");
  let bearerToken = "";

  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    bearerToken = authHeader.substring(7).trim();
  } else if (apiKeyHeader) {
    bearerToken = apiKeyHeader.trim();
  }

  if (bearerToken) {
    const configuredApiKey = process.env.INSCRIBE_API_KEY || getSystemSetting("api_key", "");
    if (configuredApiKey && configuredApiKey.trim()) {
      const tokenBuf = Buffer.from(bearerToken);
      const expectedBuf = Buffer.from(configuredApiKey.trim());
      if (tokenBuf.length === expectedBuf.length && crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
        return { authorized: true, role: "api_key", username: "api_service" };
      }
    }
  }

  // 2. Check Admin Session cookie
  const session = await getSession();
  if (session) {
    return {
      authorized: true,
      role: session.role,
      username: session.username,
    };
  }

  return {
    authorized: false,
    error: "Unauthorized: Invalid or missing API key (Bearer token) or admin session",
    status: 401,
  };
}
