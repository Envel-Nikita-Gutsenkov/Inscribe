import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get("host") || "";

  // Define system/main domains (e.g. localhost, main site domain)
  const systemDomains = ["localhost:3000", "127.0.0.1:3000", "inscribe.net"];
  const isSystemDomain = systemDomains.some((d) => host.includes(d));

  // If it's a system domain, let it route normally (e.g., to /admin, /p/..., etc.)
  if (isSystemDomain) {
    // Verify admin domain restriction if accessing /admin paths
    const adminDomain = process.env.INSCRIBE_ADMIN_DOMAIN;
    if (adminDomain && url.pathname.startsWith("/admin")) {
      if (host !== adminDomain && !host.includes(adminDomain)) {
        return new NextResponse("Forbidden: Administration access is restricted to the designated admin domain.", { status: 403 });
      }
    }
    return NextResponse.next();
  }


  // Prevent routing static/api files through custom domains
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/api") ||
    url.pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  try {
    // Call our internal API to get project slug by domain
    // We construct absolute URL since fetch requires it
    const apiUrl = new URL("/api/domain-mapping", request.url);
    apiUrl.searchParams.set("domain", host);

    const res = await fetch(apiUrl.toString());
    if (res.ok) {
      const data = await res.json();
      if (data && data.projectSlug) {
        // Rewrite the request to the project's sub-path: /p/[projectSlug]/...
        url.pathname = `/p/${data.projectSlug}${url.pathname}`;
        return NextResponse.rewrite(url);
      }
    }
  } catch (err) {
    console.error("Middleware domain mapping fetch failed:", err);
  }

  return NextResponse.next();
}

// Run middleware on all paths except static assets
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
