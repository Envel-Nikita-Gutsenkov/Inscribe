"use server";

import fs from "fs";
import path from "path";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

const imagesMetaPath = path.join(process.cwd(), "src", "lib", "images.json");

export interface ImageMeta {
  filename: string;
  originalName: string;
  alt: string;
  label: string;
  uploadedAt: string;
  size: number;
  width: number;
  height: number;
}

async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized: active session required");
  }
  return session;
}

export async function getImagesData(): Promise<ImageMeta[]> {
  try {
    if (!fs.existsSync(imagesMetaPath)) return [];
    return JSON.parse(fs.readFileSync(imagesMetaPath, "utf8"));
  } catch {
    return [];
  }
}

export async function updateImageMeta(
  filename: string,
  fields: { alt?: string; label?: string }
): Promise<{ success: boolean; error?: string }> {
  await requireSession();
  try {
    const data: ImageMeta[] = fs.existsSync(imagesMetaPath)
      ? JSON.parse(fs.readFileSync(imagesMetaPath, "utf8"))
      : [];

    const idx = data.findIndex((img) => img.filename === filename);
    if (idx === -1) return { success: false, error: "Image not found" };

    data[idx] = { ...data[idx], ...fields };
    fs.writeFileSync(imagesMetaPath, JSON.stringify(data, null, 2), "utf8");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update image metadata" };
  }
}

export async function getImageUsages(filename: string): Promise<string[]> {
  await requireSession();
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
