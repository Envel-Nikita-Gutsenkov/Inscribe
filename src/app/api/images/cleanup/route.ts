import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

const imagesDir = path.join(process.cwd(), "public", "images");
const metaPath = path.join(process.cwd(), "src", "lib", "images.json");

interface ImageMeta {
  filename: string;
  originalName: string;
  alt: string;
  label: string;
  uploadedAt: string;
  size: number;
  width: number;
  height: number;
}

function readMeta(): ImageMeta[] {
  try {
    if (!fs.existsSync(metaPath)) return [];
    return JSON.parse(fs.readFileSync(metaPath, "utf8"));
  } catch {
    return [];
  }
}

function writeMeta(data: ImageMeta[]) {
  fs.writeFileSync(metaPath, JSON.stringify(data, null, 2), "utf8");
}

function getCombinedArticleContent(): string {
  try {
    const rows = db.prepare("SELECT content FROM articles").all() as Array<{ content: string }>;
    return rows.map((r) => r.content).join("\n");
  } catch {
    return "";
  }
}

/** GET — returns { unused: ImageMeta[], used: ImageMeta[], total: number } */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const meta = readMeta();
    const combinedContent = getCombinedArticleContent();

    const used: ImageMeta[] = [];
    const unused: ImageMeta[] = [];

    for (const img of meta) {
      if (combinedContent.includes(img.filename)) {
        used.push(img);
      } else {
        unused.push(img);
      }
    }

    return NextResponse.json({ unused, used, total: meta.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** POST — actually deletes all unused images */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const meta = readMeta();
    const combinedContent = getCombinedArticleContent();

    const toDelete: string[] = [];
    const surviving: ImageMeta[] = [];

    for (const img of meta) {
      if (!combinedContent.includes(img.filename)) {
        toDelete.push(img.filename);
        const filePath = path.join(imagesDir, img.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } else {
        surviving.push(img);
      }
    }

    writeMeta(surviving);

    return NextResponse.json({ success: true, deleted: toDelete, remaining: surviving.length });
  } catch (error: any) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
