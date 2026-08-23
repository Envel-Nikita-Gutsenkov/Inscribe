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

export async function updateSectionProtectionAction(
  projectSlug: string,
  sectionId: string,
  isProtected: boolean,
  protectionUsername?: string,
  protectionPassword?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireProjectAccess(projectSlug);
    const { getSectionById, clearCache } = await import("@/lib/db/articles");
    const section = getSectionById(sectionId);
    if (!section) {
      return { success: false, error: "Section not found" };
    }

    // Always hash password before storing — never keep plaintext in DB
    let hashedPassword: string | undefined | null = undefined;
    if (protectionPassword !== undefined) {
      hashedPassword = protectionPassword
        ? require("crypto").createHash("sha256").update(protectionPassword.trim()).digest("hex")
        : null;
    }

    db.prepare(`
      UPDATE sections
      SET isProtected = ?, protectionUsername = ?, protectionPassword = CASE WHEN ? IS NOT NULL THEN ? ELSE protectionPassword END
      WHERE id = ? AND projectSlug = ?
    `).run(
      isProtected ? 1 : 0,
      protectionUsername ? protectionUsername.trim() : null,
      hashedPassword !== undefined ? hashedPassword : null,
      hashedPassword !== undefined ? hashedPassword : null,
      sectionId,
      projectSlug
    );

    clearCache(projectSlug);
    revalidatePath(`/p/${projectSlug}`);
    revalidatePath(`/admin/projects/${projectSlug}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function verifySectionLoginAction(
  projectSlug: string,
  sectionId: string,
  username: string,
  passcode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { verifySectionCredentials } = await import("@/lib/db/articles");
    const { generateSectionAuthToken, checkSectionRateLimit, recordSectionAttempt } = await import("@/lib/sectionAuth");
    const { cookies } = await import("next/headers");

    const rateKey = `sec_${sectionId}_${username}`;
    const limit = checkSectionRateLimit(rateKey);
    if (limit.locked) {
      return { success: false, error: `Too many failed attempts. Try again in ${limit.remainingSec} seconds.` };
    }

    const isValid = verifySectionCredentials(sectionId, username, passcode);
    recordSectionAttempt(rateKey, isValid);

    if (!isValid) {
      return { success: false, error: "Invalid username or password" };
    }

    const token = generateSectionAuthToken(sectionId);
    const cookieStore = await cookies();
    cookieStore.set(`sec_auth_${sectionId}`, token, {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    revalidatePath(`/p/${projectSlug}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function logoutProjectPasscodeAction(
  projectSlug: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.delete(`passcode_${projectSlug}`);
    revalidatePath(`/p/${projectSlug}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function logoutSectionAuthAction(
  projectSlug: string,
  sectionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.delete(`sec_auth_${sectionId}`);
    revalidatePath(`/p/${projectSlug}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


