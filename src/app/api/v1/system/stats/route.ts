import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/apiAuth";
import fs from "fs";
import path from "path";
import os from "os";
import { getCacheSizes } from "@/lib/db/articles";
import { getProjectCacheSizes } from "@/lib/db/projects";

export async function GET(req: NextRequest) {
  const auth = await verifyApiAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

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

  const mem = process.memoryUsage();
  const cacheStats = {
    ...getCacheSizes(),
    ...getProjectCacheSizes(),
  };

  return NextResponse.json({
    success: true,
    stats: {
      dbSizeBytes: dbSize,
      backupsSizeBytes: backupsSize,
      memory: {
        rssBytes: mem.rss,
        heapUsedBytes: mem.heapUsed,
        heapTotalBytes: mem.heapTotal,
      },
      system: {
        uptimeSeconds: process.uptime(),
        nodeVersion: process.version,
        osPlatform: `${os.type()} ${os.release()} (${os.arch()})`,
        freeMemoryBytes: os.freemem(),
        totalMemoryBytes: os.totalmem(),
      },
      caches: cacheStats,
    },
  });
}
