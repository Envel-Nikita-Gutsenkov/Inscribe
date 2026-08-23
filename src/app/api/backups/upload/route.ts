import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { getSession } from "@/lib/auth";

const DATA_DIR = path.join(process.cwd(), "data");

function getUnzipper() {
  return require("unzipper");
}

export async function POST(req: NextRequest) {
  let tempFilePath = "";
  let tempExtractDir = "";
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

    const originalName = file.name || "";
    const isZip = originalName.endsWith(".zip");
    const isSqlite = originalName.endsWith(".sqlite");

    if (!isZip && !isSqlite) {
      return NextResponse.json({ error: "Unsupported file format. Please upload a .zip archive or .sqlite file." }, { status: 400 });
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
    const ext = isZip ? ".zip" : ".sqlite";
    const tempFilename = `upload-temp-${Date.now()}${ext}`;
    tempFilePath = path.join(tempDir, tempFilename);
    fs.writeFileSync(tempFilePath, buffer);

    if (isZip) {
      // Validate zip archive contains a valid SQLite db.sqlite
      tempExtractDir = path.join(tempDir, `extract-${Date.now()}`);
      fs.mkdirSync(tempExtractDir, { recursive: true });

      const unz = getUnzipper();
      const directory = await unz.Open.file(tempFilePath);
      await directory.extract({ path: tempExtractDir });

      const extractedDb = path.join(tempExtractDir, "db.sqlite");
      if (!fs.existsSync(extractedDb)) {
        throw new Error("Invalid backup archive: db.sqlite not found in zip");
      }

      const checkDb = new Database(extractedDb);
      const integrity = checkDb.pragma("integrity_check", { simple: true }) as string;
      checkDb.close();
      if (integrity !== "ok") {
        throw new Error(`Corrupted database inside archive: ${integrity}`);
      }

      // Cleanup extraction temp dir
      try { fs.rmSync(tempExtractDir, { recursive: true, force: true }); } catch {}
    } else {
      // Verify SQLite database integrity
      const checkDb = new Database(tempFilePath);
      const integrity = checkDb.pragma("integrity_check", { simple: true }) as string;
      checkDb.close();
      if (integrity !== "ok") {
        throw new Error(`Invalid SQLite database file: ${integrity}`);
      }
    }

    // Move to backups folder with standard timestamp name
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const finalFilename = isZip ? `inscribe-backup-${timestamp}.zip` : `db-backup-${timestamp}.sqlite`;
    const finalPath = path.join(backupsDir, finalFilename);
    
    fs.renameSync(tempFilePath, finalPath);

    return NextResponse.json({ success: true, filename: finalFilename });
  } catch (error: any) {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch {}
    }
    if (tempExtractDir && fs.existsSync(tempExtractDir)) {
      try { fs.rmSync(tempExtractDir, { recursive: true, force: true }); } catch {}
    }
    console.error("Backup upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload backup" }, { status: 500 });
  }
}
