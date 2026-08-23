import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/apiAuth";
import { getProjectBySlug } from "@/lib/db/projects";
import { getProjectToc, saveProjectToc, getSectionById } from "@/lib/db/articles";
import { revalidatePath } from "next/cache";

interface RouteParams {
  params: Promise<{ projectSlug: string; sectionId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await verifyApiAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const { projectSlug, sectionId } = await params;
  const project = getProjectBySlug(projectSlug);
  if (!project) {
    return NextResponse.json({ error: `Project '${projectSlug}' not found.` }, { status: 404 });
  }

  const section = getSectionById(sectionId);
  if (!section) {
    return NextResponse.json({ error: `Section '${sectionId}' not found.` }, { status: 404 });
  }

  return NextResponse.json({ success: true, section });
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const auth = await verifyApiAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const { projectSlug, sectionId } = await params;
  const project = getProjectBySlug(projectSlug);
  if (!project) {
    return NextResponse.json({ error: `Project '${projectSlug}' not found.` }, { status: 404 });
  }

  const toc = getProjectToc(projectSlug);
  const sectionIndex = toc.findIndex((s) => s.id === sectionId);
  if (sectionIndex === -1) {
    return NextResponse.json({ error: `Section '${sectionId}' not found in project.` }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { title, isProtected, protectionUsername, protectionPassword } = body;

    const current = toc[sectionIndex];
    const updatedSection = {
      ...current,
      title: title !== undefined ? String(title).trim() : current.title,
      isProtected: isProtected !== undefined ? Boolean(isProtected) : current.isProtected,
      protectionUsername: protectionUsername !== undefined ? (protectionUsername ? String(protectionUsername).trim() : undefined) : current.protectionUsername,
      protectionPassword: protectionPassword !== undefined ? (protectionPassword ? String(protectionPassword).trim() : undefined) : undefined,
    };

    const newToc = [...toc];
    newToc[sectionIndex] = updatedSection;

    saveProjectToc(projectSlug, newToc);
    try {
      revalidatePath(`/p/${projectSlug}`);
    } catch {}

    return NextResponse.json({ success: true, section: updatedSection });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid request body" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await verifyApiAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const { projectSlug, sectionId } = await params;
  const project = getProjectBySlug(projectSlug);
  if (!project) {
    return NextResponse.json({ error: `Project '${projectSlug}' not found.` }, { status: 404 });
  }

  const toc = getProjectToc(projectSlug);
  const filtered = toc.filter((s) => s.id !== sectionId);
  if (filtered.length === toc.length) {
    return NextResponse.json({ error: `Section '${sectionId}' not found in project.` }, { status: 404 });
  }

  saveProjectToc(projectSlug, filtered);
  try {
    revalidatePath(`/p/${projectSlug}`);
  } catch {}

  return NextResponse.json({ success: true, message: `Section '${sectionId}' and its articles deleted successfully.` });
}
