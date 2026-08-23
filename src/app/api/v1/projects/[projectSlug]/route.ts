import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/apiAuth";
import { getProjectBySlug, saveProject, deleteProject } from "@/lib/db/projects";
import { getProjectToc, clearCache } from "@/lib/db/articles";
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

  return NextResponse.json({
    success: true,
    project,
    toc,
  });
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
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
    const { name, description, isPublic, passcode, customDomain, webhookUrl, historyMaxVersions, historyRetentionDays } = body;

    const updatedProject = {
      ...project,
      name: name !== undefined ? String(name).trim() : project.name,
      description: description !== undefined ? String(description).trim() : project.description,
      isPublic: isPublic !== undefined ? Boolean(isPublic) : project.isPublic,
      passcode: passcode !== undefined ? (passcode ? String(passcode).trim() : undefined) : project.passcode,
      customDomain: customDomain !== undefined ? (customDomain ? String(customDomain).trim() : undefined) : project.customDomain,
      webhookUrl: webhookUrl !== undefined ? (webhookUrl ? String(webhookUrl).trim() : undefined) : project.webhookUrl,
      historyMaxVersions: historyMaxVersions !== undefined ? Number(historyMaxVersions) : project.historyMaxVersions,
      historyRetentionDays: historyRetentionDays !== undefined ? Number(historyRetentionDays) : project.historyRetentionDays,
    };

    saveProject(updatedProject);
    try {
      revalidatePath(`/p/${projectSlug}`);
      revalidatePath("/");
    } catch {}

    return NextResponse.json({ success: true, project: updatedProject });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid request body" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await verifyApiAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const { projectSlug } = await params;
  const project = getProjectBySlug(projectSlug);
  if (!project) {
    return NextResponse.json({ error: `Project '${projectSlug}' not found.` }, { status: 404 });
  }

  deleteProject(projectSlug);
  clearCache(projectSlug);
  try {
    revalidatePath("/");
  } catch {}

  return NextResponse.json({ success: true, message: `Project '${projectSlug}' and its content deleted successfully.` });
}
