import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/apiAuth";
import { getProjects, saveProject, getProjectBySlug } from "@/lib/db/projects";
import { Project } from "@/lib/db/types";
import { getProjectToc } from "@/lib/db/articles";

export async function GET(req: NextRequest) {
  const auth = await verifyApiAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const projects = getProjects();
  const detailed = projects.map((p) => {
    const toc = getProjectToc(p.slug);
    const totalArticles = toc.reduce((acc, s) => acc + s.articles.length, 0);
    return {
      ...p,
      sectionsCount: toc.length,
      articlesCount: totalArticles,
    };
  });

  return NextResponse.json({ success: true, count: detailed.length, projects: detailed });
}

export async function POST(req: NextRequest) {
  const auth = await verifyApiAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  try {
    const body = await req.json();
    const { slug, name, description, isPublic, passcode, customDomain, webhookUrl } = body;

    if (!slug || typeof slug !== "string" || !slug.trim()) {
      return NextResponse.json({ error: "Field 'slug' is required and must be a string." }, { status: 400 });
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Field 'name' is required and must be a string." }, { status: 400 });
    }

    const sanitizedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");
    const existing = getProjectBySlug(sanitizedSlug);
    if (existing) {
      return NextResponse.json({ error: `Project with slug '${sanitizedSlug}' already exists.` }, { status: 409 });
    }

    const newProject: Project = {
      slug: sanitizedSlug,
      name: name.trim(),
      description: description ? String(description).trim() : "",
      isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
      passcode: passcode ? String(passcode).trim() : undefined,
      customDomain: customDomain ? String(customDomain).trim() : undefined,
      webhookUrl: webhookUrl ? String(webhookUrl).trim() : undefined,
    };

    saveProject(newProject);

    return NextResponse.json({ success: true, project: newProject }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to parse request body" }, { status: 400 });
  }
}
