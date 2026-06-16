"use server";

import { getSession } from "@/lib/auth";
import { 
  getProjectToc, 
  saveProjectToc, 
  saveArticleContent, 
  getArticleContent, 
  publishArticle, 
  rollbackArticle, 
  getArticleHistory,
  db
} from "@/lib/db";
import { triggerWebhook } from "@/lib/webhooks";
import { revalidatePath } from "next/cache";

async function requireProjectAccess(projectSlug: string) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized: session required");
  }
  if (session.role !== "superadmin" && !session.projects.includes(projectSlug)) {
    throw new Error("Unauthorized: you do not have permission for this project");
  }
}

export async function getArticleContentAction(
  projectSlug: string,
  articleSlug: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    await requireProjectAccess(projectSlug);
    // Editors always load the draft content for editing
    const content = getArticleContent(projectSlug, articleSlug, true);
    return { success: true, content };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveArticleContentAction(
  projectSlug: string,
  articleSlug: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireProjectAccess(projectSlug);
    saveArticleContent(projectSlug, articleSlug, content);
    revalidatePath(`/p/${projectSlug}/${articleSlug}`);
    revalidatePath(`/p/${projectSlug}`);

    const art = db.prepare("SELECT title FROM articles WHERE projectSlug = ? AND slug = ?").get(projectSlug, articleSlug) as { title: string } | undefined;
    if (art) {
      triggerWebhook(projectSlug, {
        event: "article.update",
        articleSlug,
        title: art.title,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveProjectTocAction(
  projectSlug: string,
  toc: any[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireProjectAccess(projectSlug);
    saveProjectToc(projectSlug, toc);
    revalidatePath(`/p/${projectSlug}`);
    revalidatePath(`/admin/projects/${projectSlug}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function publishArticleAction(
  projectSlug: string,
  articleSlug: string,
  changeSummary?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized: admin session required");
    await requireProjectAccess(projectSlug);
    
    publishArticle(projectSlug, articleSlug, session.userId, changeSummary);
    revalidatePath(`/p/${projectSlug}/${articleSlug}`);
    revalidatePath(`/p/${projectSlug}`);

    const art = db.prepare("SELECT title FROM articles WHERE projectSlug = ? AND slug = ?").get(projectSlug, articleSlug) as { title: string } | undefined;
    if (art) {
      triggerWebhook(projectSlug, {
        event: "article.publish",
        articleSlug,
        title: art.title,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function rollbackArticleAction(
  projectSlug: string,
  articleSlug: string,
  historyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireProjectAccess(projectSlug);
    rollbackArticle(projectSlug, articleSlug, historyId);
    revalidatePath(`/p/${projectSlug}/${articleSlug}`);
    revalidatePath(`/p/${projectSlug}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getArticleHistoryAction(
  projectSlug: string,
  articleSlug: string
): Promise<{ success: boolean; history?: any[]; error?: string }> {
  try {
    await requireProjectAccess(projectSlug);
    const history = getArticleHistory(projectSlug, articleSlug);
    return { success: true, history };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

