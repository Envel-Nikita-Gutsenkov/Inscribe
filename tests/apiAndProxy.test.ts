import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getHealth } from "../src/app/api/health/route";
import { GET as getSearch } from "../src/app/api/search/route";
import { proxy } from "../src/proxy";

// Mock next/server
vi.mock("next/server", () => {
  class MockNextResponse extends Response {
    static json(body: any, init?: ResponseInit) {
      const response = new MockNextResponse(JSON.stringify(body), init);
      response.headers.set("content-type", "application/json");
      return response;
    }
    static next() {
      return { type: "next" } as any;
    }
    static rewrite(url: URL) {
      return { type: "rewrite", url } as any;
    }
  }

  return {
    NextResponse: MockNextResponse,
  };
});

describe("API Routes & Proxy Rewriting", () => {
  describe("Health API Route", () => {
    it("should return status: healthy on successful check", async () => {
      const response = await getHealth();
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.status).toBe("healthy");
      expect(body.timestamp).toBeDefined();
    });
  });

  describe("Search API Route", () => {
    it("should return query results", async () => {
      // Mock search query
      const mockReq = {
        url: "http://localhost/api/search?q=welcome",
        headers: {
          get: (key: string) => null,
        },
      } as any;

      const response = await getSearch(mockReq);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe("Proxy Middleware Rewriter", () => {
    beforeEach(() => {
      delete process.env.INSCRIBE_ADMIN_DOMAIN;
    });

    it("should bypass system domains like localhost", async () => {
      const mockReq = {
        nextUrl: {
          clone: () => new URL("http://localhost:3000/admin"),
        },
        headers: {
          get: (key: string) => (key === "host" ? "localhost:3000" : null),
        },
        url: "http://localhost:3000/admin",
      } as any;

      const res = await proxy(mockReq);
      expect(res.type).toBe("next");
    });

    it("should block admin paths if accessing from a non-designated admin domain", async () => {
      process.env.INSCRIBE_ADMIN_DOMAIN = "admin.inscribe.net";

      const mockReq = {
        nextUrl: {
          clone: () => new URL("http://inscribe.net/admin"),
        },
        headers: {
          get: (key: string) => (key === "host" ? "inscribe.net" : null),
        },
        url: "http://inscribe.net/admin",
      } as any;

      const res = await proxy(mockReq);
      expect(res.status).toBe(403);
      const text = await res.text();
      expect(text).toContain("Forbidden: Administration access is restricted");
    });

    it("should rewrite to dynamic documentation path for custom domains", async () => {
      // Mock fetch for mapping API
      const globalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ projectSlug: "my-custom-slug" }),
      } as any);

      const mockReq = {
        nextUrl: {
          clone: () => new URL("http://docs.example.com/installation"),
          pathname: "/installation",
        },
        headers: {
          get: (key: string) => (key === "host" ? "docs.example.com" : null),
        },
        url: "http://docs.example.com/installation",
      } as any;

      const res = await proxy(mockReq);
      expect(res.type).toBe("rewrite");
      expect(res.url.pathname).toBe("/p/my-custom-slug/installation");

      // Restore fetch
      global.fetch = globalFetch;
    });
  });
});
