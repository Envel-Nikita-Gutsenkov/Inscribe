import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/apiAuth";
import { backupDb } from "@/lib/db/backup";

export async function POST(req: NextRequest) {
  const auth = await verifyApiAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  try {
    const filename = backupDb();
    return NextResponse.json({
      success: true,
      message: "Database backup created successfully.",
      filename,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create database backup" }, { status: 500 });
  }
}
