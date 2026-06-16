import { NextResponse } from "next/server";
import { getProjectByDomain } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");

  if (!domain) {
    return NextResponse.json({ error: "Missing domain" }, { status: 400 });
  }

  try {
    const project = getProjectByDomain(domain);
    if (project) {
      return NextResponse.json({ projectSlug: project.slug });
    }
    return NextResponse.json({ projectSlug: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
