import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { verifyApiAuth } from "../src/lib/apiAuth";
import { GET as getProjectsRoute, POST as createProjectRoute } from "../src/app/api/v1/projects/route";
import { GET as getProjectDetailRoute, PUT as updateProjectRoute } from "../src/app/api/v1/projects/[projectSlug]/route";
import { GET as getSectionsRoute, POST as createSectionRoute } from "../src/app/api/v1/projects/[projectSlug]/sections/route";
import { GET as getArticlesRoute, POST as createArticleRoute } from "../src/app/api/v1/projects/[projectSlug]/articles/route";
import { GET as getStatsRoute } from "../src/app/api/v1/system/stats/route";
import { POST as clearCacheRoute } from "../src/app/api/v1/system/cache/clear/route";
import { saveProject } from "../src/lib/db/projects";

describe("v1 Internal REST API & Auth", () => {
  const apiKey = "test-secret-api-key-12345";
  process.env.INSCRIBE_API_KEY = apiKey;

  function createAuthRequest(url: string, method = "GET", body?: any): NextRequest {
    const headers = new Headers();
    headers.set("authorization", `Bearer ${apiKey}`);
    headers.set("content-type", "application/json");

    const req = new Request(new URL(url, "http://localhost:3000").toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return new NextRequest(req);
  }

  function createUnauthRequest(url: string, method = "GET"): NextRequest {
    const req = new Request(new URL(url, "http://localhost:3000").toString(), {
      method,
    });
    return new NextRequest(req);
  }

  it("blocks unauthorized requests without valid bearer token", async () => {
    const req = createUnauthRequest("http://localhost:3000/api/v1/projects");
    const auth = await verifyApiAuth(req);
    expect(auth.authorized).toBe(false);
  });

  it("authorizes requests with valid bearer token", async () => {
    const req = createAuthRequest("http://localhost:3000/api/v1/projects");
    const auth = await verifyApiAuth(req);
    expect(auth.authorized).toBe(true);
    expect(auth.role).toBe("api_key");
  });

  it("lists projects via GET /api/v1/projects", async () => {
    saveProject({
      slug: "v1-api-proj",
      name: "V1 API Test Project",
      description: "API testing",
      isPublic: true,
    });

    const req = createAuthRequest("http://localhost:3000/api/v1/projects");
    const res = await getProjectsRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.projects)).toBe(true);
    expect(data.projects.some((p: any) => p.slug === "v1-api-proj")).toBe(true);
  });

  it("creates, retrieves, and updates projects via /api/v1/projects", async () => {
    const createReq = createAuthRequest("http://localhost:3000/api/v1/projects", "POST", {
      slug: "new-api-proj",
      name: "New API Project",
      description: "Created through REST API",
      isPublic: true,
    });

    const createRes = await createProjectRoute(createReq);
    expect(createRes.status).toBe(201);
    const createData = await createRes.json();
    expect(createData.success).toBe(true);
    expect(createData.project.slug).toBe("new-api-proj");

    // Get detail
    const detailReq = createAuthRequest("http://localhost:3000/api/v1/projects/new-api-proj");
    const detailRes = await getProjectDetailRoute(detailReq, { params: Promise.resolve({ projectSlug: "new-api-proj" }) });
    expect(detailRes.status).toBe(200);
    const detailData = await detailRes.json();
    expect(detailData.project.name).toBe("New API Project");

    // Update
    const updateReq = createAuthRequest("http://localhost:3000/api/v1/projects/new-api-proj", "PUT", {
      name: "Updated API Project Name",
    });
    const updateRes = await updateProjectRoute(updateReq, { params: Promise.resolve({ projectSlug: "new-api-proj" }) });
    expect(updateRes.status).toBe(200);
    const updateData = await updateRes.json();
    expect(updateData.project.name).toBe("Updated API Project Name");
  });

  it("creates sections and articles via v1 API", async () => {
    // Create section
    const secReq = createAuthRequest("http://localhost:3000/api/v1/projects/new-api-proj/sections", "POST", {
      id: "sec-guides",
      title: "Guides & Tutorials",
      isProtected: true,
      protectionUsername: "guideuser",
      protectionPassword: "GuidePassword!",
    });
    const secRes = await createSectionRoute(secReq, { params: Promise.resolve({ projectSlug: "new-api-proj" }) });
    expect(secRes.status).toBe(201);

    // Create article
    const artReq = createAuthRequest("http://localhost:3000/api/v1/projects/new-api-proj/articles", "POST", {
      slug: "quickstart-guide",
      sectionId: "sec-guides",
      title: "Quickstart Guide",
      content: "# Quickstart Guide\n\nWelcome to our documentation!",
      isPublished: true,
    });
    const artRes = await createArticleRoute(artReq, { params: Promise.resolve({ projectSlug: "new-api-proj" }) });
    const artData = await artRes.json();
    if (artRes.status !== 201) {
      console.error("DEBUG ARTICLE CREATE ERROR:", artData);
    }
    expect(artRes.status).toBe(201);
    expect(artData.article.slug).toBe("quickstart-guide");
    expect(artData.article.isPublished).toBe(true);

    // List articles
    const listReq = createAuthRequest("http://localhost:3000/api/v1/projects/new-api-proj/articles");
    const listRes = await getArticlesRoute(listReq, { params: Promise.resolve({ projectSlug: "new-api-proj" }) });
    const listData = await listRes.json();
    expect(listData.count).toBeGreaterThanOrEqual(1);
  });

  it("fetches system diagnostics and clears cache via system endpoints", async () => {
    const statsReq = createAuthRequest("http://localhost:3000/api/v1/system/stats");
    const statsRes = await getStatsRoute(statsReq);
    expect(statsRes.status).toBe(200);
    const statsData = await statsRes.json();
    expect(statsData.success).toBe(true);
    expect(statsData.stats.system.uptimeSeconds).toBeGreaterThanOrEqual(0);

    const clearReq = createAuthRequest("http://localhost:3000/api/v1/system/cache/clear", "POST");
    const clearRes = await clearCacheRoute(clearReq);
    expect(clearRes.status).toBe(200);
    const clearData = await clearRes.json();
    expect(clearData.success).toBe(true);
  });
});
