import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSession } from "@/lib/auth";

const DATA_DIR = path.join(process.cwd(), "data");

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("file");

    if (!filename) {
      return NextResponse.json({ error: "Missing file parameter" }, { status: 400 });
    }

    const safeFilename = path.basename(filename);
    const filePath = path.join(DATA_DIR, "backups", safeFilename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileStream = fs.createReadStream(filePath);

    // @ts-ignore
    return new NextResponse(fileStream, {
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Content-Length": stat.size.toString(),
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to download backup" }, { status: 500 });
  }
}
