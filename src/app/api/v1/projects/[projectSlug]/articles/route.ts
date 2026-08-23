import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/apiAuth";
import { getProjectBySlug } from "@/lib/db/projects";
import { getProjectToc, saveProjectToc, saveArticleContent, publishArticle, getArticleContent } from "@/lib/db/articles";
import { ArticleRef, Section } from "@/lib/db/types";
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

  const sectionId = req.nextUrl.searchParams.get("sectionId");
  const toc = getProjectToc(projectSlug);

  const articles: Array<{ sectionId: string; sectionTitle: string; slug: string; title: string; isPublished: boolean }> = [];
  for (const s of toc) {
    if (sectionId && s.id !== sectionId) continue;
    for (const a of s.articles) {
      articles.push({
        sectionId: s.id,
        sectionTitle: s.title,
        slug: a.slug,
        title: a.title,
        isPublished: Boolean(a.isPublished),
      });
    }
  }

  return NextResponse.json({ success: true, count: articles.length, articles });
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
    const { slug, sectionId, title, content, isPublished } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Field 'title' is required." }, { status: 400 });
    }

    const toc = getProjectToc(projectSlug);
    if (toc.length === 0) {
      return NextResponse.json({ error: "Project has no sections. Create a section before creating articles." }, { status: 400 });
    }

    const targetSectionId = sectionId || toc[0].id;
    const sectionIndex = toc.findIndex((s) => s.id === targetSectionId);
    if (sectionIndex === -1) {
      return NextResponse.json({ error: `Section '${targetSectionId}' not found in project.` }, { status: 404 });
    }

    let finalSlug = slug && typeof slug === "string" && slug.trim()
      ? slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "")
      : title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    
    if (!finalSlug) finalSlug = "article";

    if (toc.some((s) => s.articles.some((a) => a.slug === finalSlug))) {
      return NextResponse.json({ error: `Article with slug '${finalSlug}' already exists in this project.` }, { status: 409 });
    }

    const newArtRef: ArticleRef = {
      slug: finalSlug,
      title: title.trim(),
      isPublished: Boolean(isPublished),
    };

    const updatedToc = [...toc];
    updatedToc[sectionIndex] = {
      ...updatedToc[sectionIndex],
      articles: [...updatedToc[sectionIndex].articles, newArtRef],
    };

    saveProjectToc(projectSlug, updatedToc);

    const articleMarkdown = content !== undefined ? String(content) : `# ${title.trim()}\n\nStart writing here...`;
    saveArticleContent(projectSlug, finalSlug, articleMarkdown);

    if (isPublished) {
      publishArticle(projectSlug, finalSlug, auth.username || "api_service", "Created and published via API");
    }

    try {
      revalidatePath(`/p/${projectSlug}`);
    } catch {}

    return NextResponse.json({
      success: true,
      article: {
        slug: finalSlug,
        sectionId: targetSectionId,
        title: title.trim(),
        content: articleMarkdown,
        isPublished: Boolean(isPublished),
      },
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid request body" }, { status: 400 });
  }
}
