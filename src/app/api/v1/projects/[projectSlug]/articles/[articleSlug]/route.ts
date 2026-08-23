import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/apiAuth";
import { getProjectBySlug } from "@/lib/db/projects";
import { db } from "@/lib/db/connection";
import { 
  getProjectToc, 
  saveProjectToc, 
  getArticleContent, 
  saveArticleContent, 
  publishArticle, 
  getArticleHistory,
  clearCache
} from "@/lib/db/articles";
import { revalidatePath } from "next/cache";

interface RouteParams {
  params: Promise<{ projectSlug: string; articleSlug: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await verifyApiAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const { projectSlug, articleSlug } = await params;
  const project = getProjectBySlug(projectSlug);
  if (!project) {
    return NextResponse.json({ error: `Project '${projectSlug}' not found.` }, { status: 404 });
  }

  const isDraft = req.nextUrl.searchParams.get("draft") === "true";
  const content = getArticleContent(projectSlug, articleSlug, isDraft);

  const row = db.prepare(`
    SELECT a.slug, a.projectSlug, a.sectionId, a.title, a.isPublished, a.createdAt, a.updatedAt, s.title as sectionTitle, s.isProtected as sectionIsProtected
    FROM articles a
    LEFT JOIN sections s ON a.sectionId = s.id
    WHERE a.projectSlug = ? AND a.slug = ?
  `).get(projectSlug, articleSlug) as any;

  if (!row) {
    return NextResponse.json({ error: `Article '${articleSlug}' not found in project '${projectSlug}'.` }, { status: 404 });
  }

  const history = getArticleHistory(projectSlug, articleSlug);

  return NextResponse.json({
    success: true,
    article: {
      slug: row.slug,
      projectSlug: row.projectSlug,
      sectionId: row.sectionId,
      sectionTitle: row.sectionTitle,
      sectionIsProtected: Boolean(row.sectionIsProtected),
      title: row.title,
      content,
      isPublished: Boolean(row.isPublished),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      historyCount: history.length,
    },
    history,
  });
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const auth = await verifyApiAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const { projectSlug, articleSlug } = await params;
  const project = getProjectBySlug(projectSlug);
  if (!project) {
    return NextResponse.json({ error: `Project '${projectSlug}' not found.` }, { status: 404 });
  }

  const row = db.prepare("SELECT * FROM articles WHERE projectSlug = ? AND slug = ?").get(projectSlug, articleSlug) as any;
  if (!row) {
    return NextResponse.json({ error: `Article '${articleSlug}' not found in project '${projectSlug}'.` }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { title, content, isPublished, changeSummary, sectionId } = body;

    let toc = getProjectToc(projectSlug);
    let tocModified = false;

    if (title !== undefined && String(title).trim() !== row.title) {
      const newTitle = String(title).trim();
      db.prepare("UPDATE articles SET title = ? WHERE projectSlug = ? AND slug = ?").run(newTitle, projectSlug, articleSlug);
      toc = toc.map((s) => ({
        ...s,
        articles: s.articles.map((a) => (a.slug === articleSlug ? { ...a, title: newTitle } : a)),
      }));
      tocModified = true;
    }

    if (sectionId !== undefined && sectionId !== row.sectionId) {
      if (!toc.some((s) => s.id === sectionId)) {
        return NextResponse.json({ error: `Target section '${sectionId}' does not exist.` }, { status: 400 });
      }
      db.prepare("UPDATE articles SET sectionId = ? WHERE projectSlug = ? AND slug = ?").run(sectionId, projectSlug, articleSlug);
      // Move in TOC
      let movingArt: any = null;
      toc = toc.map((s) => {
        const found = s.articles.find((a) => a.slug === articleSlug);
        if (found) movingArt = found;
        return {
          ...s,
          articles: s.articles.filter((a) => a.slug !== articleSlug),
        };
      });
      if (movingArt) {
        toc = toc.map((s) => (s.id === sectionId ? { ...s, articles: [...s.articles, movingArt] } : s));
      }
      tocModified = true;
    }

    if (tocModified) {
      saveProjectToc(projectSlug, toc);
    }

    if (content !== undefined) {
      saveArticleContent(projectSlug, articleSlug, String(content));
    }

    if (isPublished === true) {
      publishArticle(projectSlug, articleSlug, auth.username || "api_service", changeSummary || "Updated via API");
    }

    clearCache(projectSlug, articleSlug);
    try {
      revalidatePath(`/p/${projectSlug}`);
      revalidatePath(`/p/${projectSlug}/${articleSlug}`);
    } catch {}

    const updatedContent = getArticleContent(projectSlug, articleSlug, false);

    return NextResponse.json({
      success: true,
      article: {
        slug: articleSlug,
        projectSlug,
        title: title !== undefined ? String(title).trim() : row.title,
        content: updatedContent,
        isPublished: isPublished !== undefined ? Boolean(isPublished) : Boolean(row.isPublished),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid request body" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await verifyApiAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const { projectSlug, articleSlug } = await params;
  const project = getProjectBySlug(projectSlug);
  if (!project) {
    return NextResponse.json({ error: `Project '${projectSlug}' not found.` }, { status: 404 });
  }

  const toc = getProjectToc(projectSlug);
  const updatedToc = toc.map((s) => ({
    ...s,
    articles: s.articles.filter((a) => a.slug !== articleSlug),
  }));

  saveProjectToc(projectSlug, updatedToc);
  clearCache(projectSlug, articleSlug);
  try {
    revalidatePath(`/p/${projectSlug}`);
  } catch {}

  return NextResponse.json({ success: true, message: `Article '${articleSlug}' deleted successfully.` });
}
