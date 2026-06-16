import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { getSession } from "@/lib/auth";

const DATA_DIR = path.join(process.cwd(), "data");

export async function POST(req: NextRequest) {
  let tempFilePath = "";
  try {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const backupsDir = path.join(DATA_DIR, "backups");
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const tempDir = path.join(DATA_DIR, "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const tempFilename = `upload-temp-${Date.now()}.sqlite`;
    tempFilePath = path.join(tempDir, tempFilename);
    fs.writeFileSync(tempFilePath, buffer);

    // Verify SQLite database integrity
    try {
      const checkDb = new Database(tempFilePath);
      const integrity = checkDb.pragma("integrity_check", { simple: true }) as string;
      checkDb.close();
      if (integrity !== "ok") {
        throw new Error(`Integrity check failed: ${integrity}`);
      }
    } catch (dbErr: any) {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      return NextResponse.json({ error: `Invalid SQLite database file: ${dbErr.message}` }, { status: 400 });
    }

    // Move to backups folder with timestamp name
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const finalFilename = `db-backup-${timestamp}.sqlite`;
    const finalPath = path.join(backupsDir, finalFilename);
    
    fs.renameSync(tempFilePath, finalPath);

    return NextResponse.json({ success: true, filename: finalFilename });
  } catch (error: any) {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {}
    }
    console.error("Backup upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload backup" }, { status: 500 });
  }
}
