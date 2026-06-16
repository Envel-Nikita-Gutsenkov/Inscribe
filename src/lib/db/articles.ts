import { db } from "./connection";
import { compress, decompress } from "./compression";
import { Section, Article, ArticleHistoryEntry } from "./types";
import { backupDbDebounced } from "./backup";
import { recordHistory, pruneHistory, reconstructHistoryContent } from "./historyStore";
import crypto from "crypto";

import { LRUCache } from "lru-cache";

const articleCache = new LRUCache<string, string>({
  max: 1000,
  ttl: 60 * 1000,
});

const tocCache = new LRUCache<string, Section[]>({
  max: 100,
  ttl: 60 * 1000,
});

export function getCacheSizes() {
  return {
    articles: articleCache.size,
    tocs: tocCache.size,
  };
}

export function clearCache(projectSlug?: string, articleSlug?: string) {
  if (projectSlug) {
    tocCache.delete(projectSlug);
    if (articleSlug) {
      articleCache.delete(`${projectSlug}:${articleSlug}`);
    } else {
      for (const key of articleCache.keys()) {
        if (key.startsWith(`${projectSlug}:`)) {
          articleCache.delete(key);
        }
      }
    }
  } else {
    tocCache.clear();
    articleCache.clear();
  }
}

// Hoisted prepared statements
const stmtProjectHistory = db.prepare(
  "SELECT historyMaxVersions, historyRetentionDays FROM projects WHERE slug = ?"
);
const stmtPruneHistoryByAge = db.prepare(
  "DELETE FROM article_history WHERE projectSlug = ? AND articleSlug = ? AND createdAt < ?"
);
const stmtPruneHistoryByCount = db.prepare(`
  DELETE FROM article_history
  WHERE projectSlug = ? AND articleSlug = ? AND id NOT IN (
    SELECT id FROM article_history
    WHERE projectSlug = ? AND articleSlug = ?
    ORDER BY createdAt DESC
    LIMIT ?
  )
`);
const stmtSearchWithProject = db.prepare(`
  SELECT f.projectSlug, f.slug, f.title, snippet(articles_fts, 3, '==', '==', '...', 15) as snippet
  FROM articles_fts f
  WHERE f.articles_fts MATCH ? AND f.projectSlug = ?
`);
const stmtSearchGlobal = db.prepare(`
  SELECT f.projectSlug, f.slug, f.title, snippet(articles_fts, 3, '==', '==', '...', 15) as snippet
  FROM articles_fts f
  WHERE f.articles_fts MATCH ?
`);

// Helper functions
function getContentHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function stripMarkdown(md: string): string {
  return md
    .replace(/[#*`~_\[\]()\-+=>!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const selectSections = db.prepare(`
  SELECT * FROM sections 
  WHERE projectSlug = ? 
  ORDER BY sortOrder ASC
`);

const selectSectionArticles = db.prepare(`
  SELECT slug, title, isPublished FROM articles 
  WHERE projectSlug = ? AND sectionId = ? 
  ORDER BY sortOrder ASC
`);

const selectCurrentSections = db.prepare("SELECT id FROM sections WHERE projectSlug = ?");
const deleteSection = db.prepare("DELETE FROM sections WHERE id = ?");

const upsertSection = db.prepare(`
  INSERT INTO sections (id, projectSlug, title, sortOrder)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    sortOrder = excluded.sortOrder
`);

const selectSectionArticlesSlugs = db.prepare("SELECT slug FROM articles WHERE projectSlug = ? AND sectionId = ?");
const deleteArticle = db.prepare("DELETE FROM articles WHERE projectSlug = ? AND slug = ?");

const selectArticleContentStmt = db.prepare(`
  SELECT content, contentHash FROM articles 
  WHERE projectSlug = ? AND slug = ?
`);

const selectPublishedArticleContentStmt = db.prepare(`
  SELECT publishedContent FROM articles 
  WHERE projectSlug = ? AND slug = ? AND isPublished = 1
`);

const upsertArticle = db.prepare(`
  INSERT INTO articles (slug, projectSlug, sectionId, title, content, sortOrder, contentHash, searchText, updatedAt, publishedContent, isPublished)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(projectSlug, slug) DO UPDATE SET
    title = excluded.title,
    sectionId = excluded.sectionId,
    sortOrder = excluded.sortOrder,
    updatedAt = excluded.updatedAt
`);

const updateArticleContentStmt = db.prepare(`
  UPDATE articles 
  SET content = ?, contentHash = ?, searchText = ?, updatedAt = ? 
  WHERE projectSlug = ? AND slug = ?
`);

export function getProjectToc(projectSlug: string): Section[] {
  const cached = tocCache.get(projectSlug);
  if (cached !== undefined) {
    return cached;
  }

  const sectionRows = selectSections.all(projectSlug) as any[];
  const toc: Section[] = [];

  for (const s of sectionRows) {
    const articleRows = selectSectionArticles.all(projectSlug, s.id) as any[];
    toc.push({
      id: s.id,
      title: s.title,
      articles: articleRows.map((a) => ({ 
        slug: a.slug, 
        title: a.title,
        isPublished: a.isPublished === 1
      })),
    });
  }

  tocCache.set(projectSlug, toc);

  return toc;
}

export function saveProjectToc(projectSlug: string, toc: Section[]) {
  const now = Date.now();
  let changeDetected = false;

  const transaction = db.transaction(() => {
    const currentSections = selectCurrentSections.all(projectSlug) as { id: string }[];
    const tocSectionIds = new Set(toc.map((s) => s.id));

    for (const cs of currentSections) {
      if (!tocSectionIds.has(cs.id)) {
        deleteSection.run(cs.id);
        changeDetected = true;
      }
    }

    let sectionOrder = 0;
    for (const sec of toc) {
      const secResult = upsertSection.run(sec.id, projectSlug, sec.title, sectionOrder++);
      if (secResult.changes > 0) {
        changeDetected = true;
      }

      const activeSlugs = new Set(sec.articles.map((a) => a.slug));
      const currentSectionArticles = selectSectionArticlesSlugs.all(projectSlug, sec.id) as { slug: string }[];
      for (const ca of currentSectionArticles) {
        if (!activeSlugs.has(ca.slug)) {
          deleteArticle.run(projectSlug, ca.slug);
          changeDetected = true;
        }
      }

      let articleOrder = 0;
      for (const art of sec.articles) {
        const existing = selectArticleContentStmt.get(projectSlug, art.slug) as { content: any; contentHash: string } | undefined;
        const defaultContent = `# ${art.title}\n\nStart writing article content here...`;
        const content = existing ? decompress(existing.content) : defaultContent;
        const contentHash = existing?.contentHash || getContentHash(content);
        const searchText = stripMarkdown(content);

        // Created articles start unpublished (draft)
        const publishedContent = existing ? undefined : null;
        const isPublished = existing ? undefined : 0;

        const artResult = upsertArticle.run(
          art.slug,
          projectSlug,
          sec.id,
          art.title,
          compress(content),
          articleOrder++,
          contentHash,
          searchText,
          now,
          publishedContent !== null && publishedContent !== undefined ? compress(publishedContent as string) : publishedContent,
          isPublished
        );
        if (artResult.changes > 0) {
          changeDetected = true;
        }
      }
    }
  });

  transaction();
  clearCache(projectSlug);

  if (changeDetected) {
    backupDbDebounced();
  }
}

export function getArticleContent(projectSlug: string, articleSlug: string, isDraft = false): string {
  if (!isDraft) {
    const cacheKey = `${projectSlug}:${articleSlug}`;
    const cached = articleCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const row = selectPublishedArticleContentStmt.get(projectSlug, articleSlug) as { publishedContent: any } | undefined;
    const content = row ? decompress(row.publishedContent) : "";

    articleCache.set(cacheKey, content);
    return content;
  } else {
    const row = selectArticleContentStmt.get(projectSlug, articleSlug) as { content: any } | undefined;
    return row ? decompress(row.content) : "";
  }
}

export function saveArticleContent(projectSlug: string, articleSlug: string, content: string) {
  const existing = selectArticleContentStmt.get(projectSlug, articleSlug) as { contentHash: string } | undefined;
  const newHash = getContentHash(content);

  if (existing && existing.contentHash === newHash) {
    return;
  }

  const searchText = stripMarkdown(content);
  const now = Date.now();

  updateArticleContentStmt.run(compress(content), newHash, searchText, now, projectSlug, articleSlug);
  
  clearCache(projectSlug, articleSlug);
  backupDbDebounced();
}


export { pruneHistory };

export function publishArticle(projectSlug: string, articleSlug: string, userId: string, changeSummary?: string) {
  const now = Date.now();
  const article = db.prepare("SELECT content FROM articles WHERE projectSlug = ? AND slug = ?").get(projectSlug, articleSlug) as { content: any } | undefined;
  if (!article) return;

  const rawContent = decompress(article.content);

  db.transaction(() => {
    db.prepare(`
      UPDATE articles
      SET publishedContent = content, isPublished = 1, updatedAt = ?
      WHERE projectSlug = ? AND slug = ?
    `).run(now, projectSlug, articleSlug);

    recordHistory(projectSlug, articleSlug, rawContent, userId, changeSummary || "Published version");
    pruneHistory(projectSlug, articleSlug);
  })();

  clearCache(projectSlug, articleSlug);
  backupDbDebounced();
}

export function rollbackArticle(projectSlug: string, articleSlug: string, historyId: string) {
  const history = db.prepare("SELECT content, isDelta FROM article_history WHERE id = ?").get(historyId) as { content: string; isDelta: number } | undefined;
  if (!history) throw new Error("History version not found");

  const now = Date.now();
  // If the entry is a delta, reconstruct the full content first
  const rawContent = history.isDelta
    ? reconstructHistoryContent(projectSlug, articleSlug, historyId)
    : history.content;

  const hash = getContentHash(rawContent);
  const searchText = stripMarkdown(rawContent);
  const compressed = compress(rawContent);

  db.prepare(`
    UPDATE articles
    SET content = ?, contentHash = ?, searchText = ?, updatedAt = ?
    WHERE projectSlug = ? AND slug = ?
  `).run(compressed, hash, searchText, now, projectSlug, articleSlug);

  clearCache(projectSlug, articleSlug);
  backupDbDebounced();
}

export function getArticleHistory(projectSlug: string, articleSlug: string): ArticleHistoryEntry[] {
  const rows = db.prepare(`
    SELECT h.id, h.projectSlug, h.articleSlug, h.content, h.isDelta,
           h.changeSummary, h.createdAt, h.createdById, u.username
    FROM article_history h
    LEFT JOIN users u ON h.createdById = u.id
    WHERE h.projectSlug = ? AND h.articleSlug = ?
    ORDER BY h.createdAt DESC
  `).all(projectSlug, articleSlug) as any[];

  return rows.map((r) => ({
    id: r.id,
    projectSlug: r.projectSlug,
    articleSlug: r.articleSlug,
    // For display we always return full content (reconstruct if delta)
    content: r.isDelta
      ? reconstructHistoryContent(projectSlug, articleSlug, r.id)
      : r.content,
    changeSummary: r.changeSummary || "",
    createdAt: r.createdAt,
    createdById: r.createdById || undefined,
    username: r.username || "System",
    isDelta: Boolean(r.isDelta),
  }));
}

export function searchArticles(query: string, projectSlug?: string): { projectSlug: string; slug: string; title: string; contentSnippet: string }[] {
  const sanitizedQuery = query.replace(/["]/g, "").trim();
  if (!sanitizedQuery) return [];

  const rows = projectSlug
    ? stmtSearchWithProject.all(`${sanitizedQuery}*`, projectSlug)
    : stmtSearchGlobal.all(`${sanitizedQuery}*`);

  return (rows as any[]).map((r) => ({
    projectSlug: r.projectSlug,
    slug: r.slug,
    title: r.title,
    contentSnippet: r.snippet || "",
  }));
}
