// Inscribe Service Worker — offline cache + 24h reader cache + adjacent prefetch

const CACHE_VERSION = "inscribe-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGES_CACHE  = `${CACHE_VERSION}-pages`;

// Max articles cached (LRU eviction)
const MAX_CACHED_PAGES = 80;
// How long a cached page is considered fresh (24h)
const PAGE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.startsWith("inscribe-") && k !== STATIC_CACHE && k !== PAGES_CACHE)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Disable service worker caching in development mode (localhost/127.0.0.1)
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return;

  // Next.js static assets: content-hashed, safe forever
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheForever(request));
    return;
  }

  // Public article pages: stale-while-revalidate with 24h max-age
  // Bypass SW cache for Next.js App Router internal RSC/prefetch requests to avoid hydration loop
  const isRSC = request.headers.has("rsc") || 
                request.headers.has("next-router-state-tree") || 
                request.headers.has("next-router-prefetch");
  const isHTML = request.headers.get("accept")?.includes("text/html") || request.mode === "navigate";

  if (url.pathname.startsWith("/p/") && isHTML && !isRSC) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});

// Message event for prefetching adjacent articles
self.addEventListener("message", (event) => {
  if (event.data?.type === "PREFETCH_ARTICLES") {
    const urls = event.data.urls;
    if (!Array.isArray(urls)) return;

    caches.open(PAGES_CACHE).then((cache) => {
      for (const url of urls.slice(0, 5)) {
        cache.match(url).then((cached) => {
          if (!cached) {
            // Fetch silently in background, don't block anything
            fetch(url, { priority: "low" })
              .then((res) => {
                if (res.ok) cache.put(url, res);
              })
              .catch(() => {});
          }
        });
      }
    });
  }
});

// Cache strategies

async function cacheForever(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(PAGES_CACHE);
  const cached = await cache.match(request);

  // Check freshness via custom header we inject on store
  const isFresh = cached && isCachedFresh(cached);

  const revalidatePromise = fetch(request, { signal: AbortSignal.timeout(8000) })
    .then(async (res) => {
      if (res.ok) {
        await evictIfFull(cache);
        // Clone with timestamp header for freshness tracking
        const headers = new Headers(res.headers);
        headers.set("x-sw-cached-at", String(Date.now()));
        const body = await res.arrayBuffer();
        const stamped = new Response(body, { status: res.status, headers });
        cache.put(request, stamped.clone());
        return stamped;
      }
      return res;
    })
    .catch(() => null);

  if (isFresh) {
    // Return cache immediately, update in background
    revalidatePromise.catch(() => {});
    return cached;
  }

  if (cached) {
    // Stale but present — return it while revalidating
    revalidatePromise.catch(() => {});
    return cached;
  }

  // No cache — must fetch
  const fresh = await revalidatePromise;
  if (fresh) return fresh;

  // Full offline fallback
  return offlinePage();
}

function isCachedFresh(response) {
  const cachedAt = response.headers.get("x-sw-cached-at");
  if (!cachedAt) return false;
  return (Date.now() - parseInt(cachedAt, 10)) < PAGE_MAX_AGE_MS;
}

async function evictIfFull(cache) {
  const keys = await cache.keys();
  if (keys.length >= MAX_CACHED_PAGES) {
    // Delete oldest N entries to make room
    const toDelete = keys.slice(0, keys.length - MAX_CACHED_PAGES + 1);
    await Promise.all(toDelete.map((k) => cache.delete(k)));
  }
}

function offlinePage() {
  return new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Offline — Inscribe</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#09090b;color:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh}
.c{text-align:center;max-width:400px;padding:40px}.icon{font-size:3rem;margin-bottom:24px}h1{font-size:1.8rem;margin-bottom:8px}p{color:#94a3b8;line-height:1.6;margin-bottom:20px}
a{color:#3b82f6;text-decoration:none}</style></head>
<body><div class="c"><div class="icon">📡</div><h1>You're offline</h1>
<p>This page hasn't been cached yet. Connect to the internet and reload to read this article.</p>
<a href="javascript:location.reload()">Try again</a></div></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
