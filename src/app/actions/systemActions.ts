"use server";

import { getSession } from "@/lib/auth";
import { runGlobalMaintenance } from "@/lib/db/backup";
import { clearCache } from "@/lib/db/articles";
import { clearProjectCache } from "@/lib/db/projects";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import os from "os";

async function requireSuperadmin() {
  const session = await getSession();
  if (!session || session.role !== "superadmin") {
    throw new Error("Unauthorized: Superadmin access required");
  }
}

let peakRss = 0;

export async function getSystemStatsAction(): Promise<{
  success: boolean;
  dbSize?: number;
  backupsSize?: number;
  currentRss?: number;
  peakRss?: number;
  heapUsed?: number;
  osFreeMem?: number;
  osTotalMem?: number;
  uptime?: number;
  nodeVersion?: string;
  osPlatform?: string;
  cacheStats?: {
    articles: number;
    tocs: number;
    projects: number;
    domains: number;
  };
  buildHash?: string;
  buildDate?: string;
  error?: string;
}> {
  try {
    await requireSuperadmin();

    const DATA_DIR = path.join(process.cwd(), "data");
    const dbPath = path.join(DATA_DIR, "db.sqlite");
    
    let dbSize = 0;
    if (fs.existsSync(dbPath)) {
      dbSize = fs.statSync(dbPath).size;
    }

    let backupsSize = 0;
    const backupsDir = path.join(DATA_DIR, "backups");
    if (fs.existsSync(backupsDir)) {
      const files = fs.readdirSync(backupsDir);
      for (const f of files) {
        backupsSize += fs.statSync(path.join(backupsDir, f)).size;
      }
    }
    const snapshotsDir = path.join(DATA_DIR, "snapshots");
    if (fs.existsSync(snapshotsDir)) {
      const files = fs.readdirSync(snapshotsDir);
      for (const f of files) {
        backupsSize += fs.statSync(path.join(snapshotsDir, f)).size;
      }
    }

    const mem = process.memoryUsage();
    if (mem.rss > peakRss) {
      peakRss = mem.rss;
    }

    // Dynamic import to read LRU Cache sizes safely
    const { getProjectToc } = await import("@/lib/db/articles");
    // Since caches aren't exported directly, we can read them or export a getter.
    // Let's add getter helpers in articles.ts and projects.ts if needed,
    // or just return simple approximations. Let's export size getters in those modules.
    const { getCacheSizes } = await import("@/lib/db/articles");
    const { getProjectCacheSizes } = await import("@/lib/db/projects");

    const cacheStats = {
      ...getCacheSizes(),
      ...getProjectCacheSizes(),
    };

    let buildHash = "unknown";
    let buildDate = new Date().toISOString();
    try {
      const buildInfoPath = path.join(process.cwd(), "src/lib/build-info.json");
      if (fs.existsSync(buildInfoPath)) {
        const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, "utf8"));
        buildHash = buildInfo.buildHash || buildHash;
        buildDate = buildInfo.buildDate || buildDate;
      }
    } catch {}

    return {
      success: true,
      dbSize,
      backupsSize,
      currentRss: mem.rss,
      peakRss,
      heapUsed: mem.heapUsed,
      osFreeMem: os.freemem(),
      osTotalMem: os.totalmem(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      osPlatform: `${os.type()} ${os.release()} (${os.arch()})`,
      cacheStats,
      buildHash,
      buildDate,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function optimizeDatabaseAction(): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperadmin();
    // Force run maintenance (prune + vacuum + optimize)
    runGlobalMaintenance(true);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function clearAllCachesAction(): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperadmin();
    clearCache();
    clearProjectCache();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getPortalSettingsAction(): Promise<{
  success: boolean;
  title?: string;
  description?: string;
  error?: string;
}> {
  try {
    await requireSuperadmin();
    const { getSystemSetting } = await import("@/lib/db");
    const title = getSystemSetting("portal_title", "Welcome to Inscribe");
    const description = getSystemSetting("portal_description", "Search for articles or select a documentation workspace below to get started.");
    return { success: true, title, description };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updatePortalSettingsAction(
  title: string,
  description: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperadmin();
    if (!title.trim()) {
      return { success: false, error: "Title cannot be empty" };
    }
    const { setSystemSetting } = await import("@/lib/db");
    setSystemSetting("portal_title", title.trim());
    setSystemSetting("portal_description", description.trim());
    
    // Evict cache and trigger homepage revalidation
    const { clearProjectCache } = await import("@/lib/db/projects");
    clearProjectCache();
    revalidatePath("/");
    
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
