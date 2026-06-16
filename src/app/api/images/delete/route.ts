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

function findUsages(filename: string): string[] {
  try {
    const rows = db.prepare("SELECT projectSlug, slug, title FROM articles WHERE content LIKE ?").all(`%${filename}%`) as Array<{
      projectSlug: string;
      slug: string;
      title: string;
    }>;
    return rows.map((r) => `${r.projectSlug}/${r.slug} (${r.title})`);
  } catch {
    return [];
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filename } = await req.json();

    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "filename required" }, { status: 400 });
    }

    // Security: prevent path traversal
    const safe = path.basename(filename);
    const filePath = path.join(imagesDir, safe);

    // Check usages before delete
    const usages = findUsages(safe);

    if (usages.length > 0) {
      return NextResponse.json({
        error: "Image is used in articles",
        usages,
        canForce: true,
      }, { status: 409 });
    }

    // Delete file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from meta
    const meta = readMeta().filter((img) => img.filename !== safe);
    writeMeta(meta);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Image delete error:", error);
    return NextResponse.json({ error: error.message ?? "Delete failed" }, { status: 500 });
  }
}

/** Force delete — ignores usages */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filename } = await req.json();
    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "filename required" }, { status: 400 });
    }

    const safe = path.basename(filename);
    const filePath = path.join(imagesDir, safe);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const meta = readMeta().filter((img) => img.filename !== safe);
    writeMeta(meta);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Force delete error:", error);
    return NextResponse.json({ error: error.message ?? "Delete failed" }, { status: 500 });
  }
}
