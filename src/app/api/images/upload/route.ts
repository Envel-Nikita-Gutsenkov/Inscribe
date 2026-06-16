import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { getSession } from "@/lib/auth";

const imagesDir = path.join(process.cwd(), "public", "images");
const metaPath = path.join(process.cwd(), "src", "lib", "images.json");

const MAX_WIDTH = 1920;
const QUALITY_DEFAULT = 85;
const QUALITY_HEAVY = 75;
const HEAVY_THRESHOLD_BYTES = 50 * 1024; // 50 KB

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

function generateFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const base = path
    .basename(originalName, ext)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const hash = Date.now().toString(36);
  return `${base}-${hash}.webp`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure output directory exists
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const meta = readMeta();
    const results: ImageMeta[] = [];

    for (const file of files) {
      // Validate mime type
      if (!file.type.startsWith("image/")) {
        continue;
      }

      const originalBuffer = Buffer.from(await file.arrayBuffer());
      const originalSize = originalBuffer.byteLength;

      // Determine quality based on original file size
      const quality = originalSize > HEAVY_THRESHOLD_BYTES ? QUALITY_HEAVY : QUALITY_DEFAULT;

      // Process with sharp: resize if too wide, convert to WebP
      const sharpInstance = sharp(originalBuffer).rotate(); // auto-rotate by EXIF

      // Get original metadata
      const sharpMeta = await sharpInstance.metadata();
      const origWidth = sharpMeta.width ?? 0;
      const origHeight = sharpMeta.height ?? 0;

      // Resize only if wider than MAX_WIDTH
      if (origWidth > MAX_WIDTH) {
        sharpInstance.resize(MAX_WIDTH, undefined, { withoutEnlargement: true });
      }

      const outputBuffer = await sharpInstance.webp({ quality }).toBuffer();

      // Get final dimensions
      const finalMeta = await sharp(outputBuffer).metadata();
      const finalWidth = finalMeta.width ?? origWidth;
      const finalHeight = finalMeta.height ?? origHeight;

      const filename = generateFilename(file.name);
      const outputPath = path.join(imagesDir, filename);
      fs.writeFileSync(outputPath, outputBuffer);

      const entry: ImageMeta = {
        filename,
        originalName: file.name,
        alt: path.basename(file.name, path.extname(file.name)),
        label: "",
        uploadedAt: new Date().toISOString(),
        size: outputBuffer.byteLength,
        width: finalWidth,
        height: finalHeight,
      };

      meta.push(entry);
      results.push(entry);
    }

    writeMeta(meta);

    return NextResponse.json({ success: true, images: results });
  } catch (error: any) {
    console.error("Image upload error:", error);
    return NextResponse.json(
      { error: error.message ?? "Upload failed" },
      { status: 500 }
    );
  }
}
