import { db } from "./connection";
import { Project } from "./types";
import { backupDbDebounced } from "./backup";
import { LRUCache } from "lru-cache";

const projectCache = new LRUCache<string, Project | false>({
  max: 200,
  ttl: 60 * 1000, // 60 seconds
});

const domainCache = new LRUCache<string, Project | false>({
  max: 200,
  ttl: 60 * 1000, // 60 seconds
});

export function clearProjectCache() {
  projectCache.clear();
  domainCache.clear();
}

export function getProjectCacheSizes() {
  return {
    projects: projectCache.size,
    domains: domainCache.size,
  };
}

const selectAllProjects = db.prepare("SELECT * FROM projects");
const selectProjectBySlug = db.prepare("SELECT * FROM projects WHERE slug = ?");
const selectProjectByDomain = db.prepare("SELECT * FROM projects WHERE customDomain = ?");

const insertProject = db.prepare(`
  INSERT INTO projects (slug, name, description, customDomain, isPublic, passcode, updatedAt, historyMaxVersions, historyRetentionDays, webhookUrl)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const upsertProject = db.prepare(`
  INSERT INTO projects (slug, name, description, customDomain, isPublic, passcode, updatedAt, historyMaxVersions, historyRetentionDays, webhookUrl)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(slug) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    customDomain = excluded.customDomain,
    isPublic = excluded.isPublic,
    passcode = excluded.passcode,
    updatedAt = excluded.updatedAt,
    historyMaxVersions = excluded.historyMaxVersions,
    historyRetentionDays = excluded.historyRetentionDays,
    webhookUrl = excluded.webhookUrl
`);

const deleteProjectStmt = db.prepare("DELETE FROM projects WHERE slug = ?");

export function getProjects(): Project[] {
  const rows = selectAllProjects.all() as any[];
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    description: r.description || "",
    customDomain: r.customDomain || undefined,
    isPublic: r.isPublic === 1,
    passcode: r.passcode || undefined,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    historyMaxVersions: r.historyMaxVersions,
    historyRetentionDays: r.historyRetentionDays,
    webhookUrl: r.webhookUrl || undefined,
  }));
}

export function getProjectBySlug(slug: string): Project | null {
  const cached = projectCache.get(slug);
  if (cached !== undefined) {
    return cached === false ? null : cached;
  }

  const r: any = selectProjectBySlug.get(slug);
  if (!r) {
    projectCache.set(slug, false);
    return null;
  }

  const project = {
    slug: r.slug,
    name: r.name,
    description: r.description || "",
    customDomain: r.customDomain || undefined,
    isPublic: r.isPublic === 1,
    passcode: r.passcode || undefined,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    historyMaxVersions: r.historyMaxVersions,
    historyRetentionDays: r.historyRetentionDays,
    webhookUrl: r.webhookUrl || undefined,
  };

  projectCache.set(slug, project);
  return project;
}

export function getProjectByDomain(domain: string): Project | null {
  const cached = domainCache.get(domain);
  if (cached !== undefined) {
    return cached === false ? null : cached;
  }

  const r: any = selectProjectByDomain.get(domain);
  if (!r) {
    domainCache.set(domain, false);
    return null;
  }

  const project = {
    slug: r.slug,
    name: r.name,
    description: r.description || "",
    customDomain: r.customDomain || undefined,
    isPublic: r.isPublic === 1,
    passcode: r.passcode || undefined,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    historyMaxVersions: r.historyMaxVersions,
    historyRetentionDays: r.historyRetentionDays,
    webhookUrl: r.webhookUrl || undefined,
  };

  domainCache.set(domain, project);
  return project;
}

export function saveProject(project: Project, oldSlug?: string) {
  const now = Date.now();
  const maxV = project.historyMaxVersions !== undefined ? project.historyMaxVersions : 50;
  const retD = project.historyRetentionDays !== undefined ? project.historyRetentionDays : 30;

  const transaction = db.transaction(() => {
    if (oldSlug && oldSlug !== project.slug) {
      insertProject.run(
        project.slug,
        project.name,
        project.description,
        project.customDomain || null,
        project.isPublic ? 1 : 0,
        project.passcode || null,
        now,
        maxV,
        retD,
        project.webhookUrl || null
      );
      deleteProjectStmt.run(oldSlug);
    } else {
      upsertProject.run(
        project.slug,
        project.name,
        project.description,
        project.customDomain || null,
        project.isPublic ? 1 : 0,
        project.passcode || null,
        now,
        maxV,
        retD,
        project.webhookUrl || null
      );
    }
  });

  transaction();
  clearProjectCache();
  backupDbDebounced();
}

export function deleteProject(slug: string) {
  deleteProjectStmt.run(slug);
  clearProjectCache();
  backupDbDebounced();
}
