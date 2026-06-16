import { NextRequest, NextResponse } from "next/server";
import { searchArticles } from "@/lib/db";
import { checkSearchRateLimit } from "@/lib/rateLimit";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  if (!checkSearchRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const projectSlug = searchParams.get("project") || undefined;

  try {
    const results = searchArticles(query, projectSlug);
    return NextResponse.json(results, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
