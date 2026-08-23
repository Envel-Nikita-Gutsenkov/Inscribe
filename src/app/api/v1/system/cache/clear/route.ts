import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/apiAuth";
import { clearCache } from "@/lib/db/articles";
import { clearProjectCache } from "@/lib/db/projects";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  const auth = await verifyApiAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  clearCache();
  clearProjectCache();
  try {
    revalidatePath("/", "layout");
  } catch {}

  return NextResponse.json({
    success: true,
    message: "All in-memory LRU caches evicted and paths revalidated.",
  });
}
