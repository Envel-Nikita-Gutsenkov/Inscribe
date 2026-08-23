import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/apiAuth";
import { getProjectBySlug } from "@/lib/db/projects";
import { getProjectToc, saveProjectToc } from "@/lib/db/articles";
import { Section } from "@/lib/db/types";
import { revalidatePath } from "next/cache";

interface RouteParams {
  params: Promise<{ projectSlug: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await verifyApiAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const { projectSlug } = await params;
  const project = getProjectBySlug(projectSlug);
  if (!project) {
    return NextResponse.json({ error: `Project '${projectSlug}' not found.` }, { status: 404 });
  }

  const toc = getProjectToc(projectSlug);
  return NextResponse.json({ success: true, sections: toc });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await verifyApiAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const { projectSlug } = await params;
  const project = getProjectBySlug(projectSlug);
  if (!project) {
    return NextResponse.json({ error: `Project '${projectSlug}' not found.` }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { id, title, isProtected, protectionUsername, protectionPassword } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Field 'title' is required." }, { status: 400 });
    }

    const sectionId = id && typeof id === "string" && id.trim()
      ? id.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "")
      : "sec-" + Math.random().toString(36).substring(2, 9);

    const toc = getProjectToc(projectSlug);
    if (toc.some((s) => s.id === sectionId)) {
      return NextResponse.json({ error: `Section with id '${sectionId}' already exists in this project.` }, { status: 409 });
    }

    const newSection: Section = {
      id: sectionId,
      title: title.trim(),
      isProtected: Boolean(isProtected),
      protectionUsername: protectionUsername ? String(protectionUsername).trim() : undefined,
      protectionPassword: protectionPassword ? String(protectionPassword).trim() : undefined,
      articles: [],
    };

    saveProjectToc(projectSlug, [...toc, newSection]);
    try {
      revalidatePath(`/p/${projectSlug}`);
    } catch {}

    return NextResponse.json({ success: true, section: newSection }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid request body" }, { status: 400 });
  }
}
