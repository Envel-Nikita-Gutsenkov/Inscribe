import React from "react";
import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import { getProjectBySlug, getArticleContent, getProjectToc, getSystemSetting, getArticleSection } from "@/lib/db";
import { getDictionary } from "@/lib/i18n";
import { 
  hasSectionAccess, 
  generateSectionAuthToken, 
  checkSectionRateLimit, 
  recordSectionAttempt,
  generatePasscodeToken,
  hasProjectPasscodeAccess
} from "@/lib/sectionAuth";
import { verifySectionCredentials } from "@/lib/db/articles";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import { Lock, FileText, ShieldAlert } from "lucide-react";
import Mermaid from "@/components/Mermaid";
import crypto from "crypto";

function getRawText(children: any, depth = 0, visited = new Set()): string {
  if (depth > 10 || !children) return "";
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (visited.has(children)) return "";
  visited.add(children);

  if (Array.isArray(children)) {
    return children.map((c) => getRawText(c, depth + 1, visited)).join("");
  }
  if (children?.props && "children" in children.props) {
    return getRawText(children.props.children, depth + 1, visited);
  }
  return "";
}

const PASSCODE_TOKEN_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

// Public articles: cache 60s, stale-while-revalidate 5min
// Private/passcode pages are inherently dynamic (they read cookies)
export const revalidate = 60;

interface PageProps {
  params: Promise<{ projectSlug: string; slug?: string[] }>;
  searchParams?: Promise<{ error?: string }>;
}

// Passcode verification action (Server Action)
async function verifyPasscode(formData: FormData) {
  "use server";
  const projectSlug = formData.get("projectSlug") as string;
  const passcode = (formData.get("passcode") as string) || "";

  // IP-based rate-limiting: key by project+IP
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  const rateKey = `passcode:${projectSlug}:${ip}`;
  const limit = checkSectionRateLimit(rateKey);
  if (limit.locked) return;

  const project = getProjectBySlug(projectSlug);
  if (!project || !project.passcode) return;

  // Stored passcode may be plaintext or a SHA-256 hex hash (migration-safe)
  const storedPassHash =
    project.passcode.length === 64 && /^[0-9a-f]+$/.test(project.passcode)
      ? project.passcode
      : crypto.createHash("sha256").update(project.passcode).digest("hex");

  const inputHash = crypto.createHash("sha256").update(passcode).digest("hex");
  const isValid =
    inputHash.length === storedPassHash.length &&
    crypto.timingSafeEqual(Buffer.from(inputHash, "hex"), Buffer.from(storedPassHash, "hex"));

  recordSectionAttempt(rateKey, isValid);

  if (isValid) {
    const token = generatePasscodeToken(projectSlug, storedPassHash);
    const cookieStore = await cookies();
    cookieStore.set(`passcode_${projectSlug}`, token, {
      maxAge: PASSCODE_TOKEN_TTL_SEC,
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }
}

// Section credential verification action (Server Action)
async function verifySectionCredentialsForm(formData: FormData) {
  "use server";
  const projectSlug = formData.get("projectSlug") as string;
  const sectionId = formData.get("sectionId") as string;
  const username = (formData.get("username") as string) || "";
  const password = (formData.get("password") as string) || "";

  const rateKey = `sec_${sectionId}_${username}`;
  const limit = checkSectionRateLimit(rateKey);
  if (limit.locked) {
    return;
  }

  const isValid = verifySectionCredentials(sectionId, username, password);
  recordSectionAttempt(rateKey, isValid);

  if (isValid) {
    const token = generateSectionAuthToken(sectionId);
    const cookieStore = await cookies();
    cookieStore.set(`sec_auth_${sectionId}`, token, {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }
}

export default async function ArticlePage({ params, searchParams }: PageProps) {
  const { projectSlug, slug } = await params;
  const siteLanguage = getSystemSetting("site_language", "en");
  const dict = getDictionary(siteLanguage);
  
  const project = getProjectBySlug(projectSlug);
  if (!project) {
    notFound();
  }

  // Passcode authentication check
  if (!project.isPublic && project.passcode) {
    const hasPasscodeAccess = await hasProjectPasscodeAccess(projectSlug, project.passcode);

    if (!hasPasscodeAccess) {
      // Show password lock screen
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "50vh",
          textAlign: "center"
        }}>
          <div className="card" style={{ maxWidth: "400px", width: "100%", padding: "40px" }}>
            <div style={{
              background: "rgba(244, 63, 94, 0.1)",
              borderRadius: "50%",
              width: "64px",
              height: "64px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px auto",
              color: "var(--accent-rose)"
            }}>
              <Lock size={28} />
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", marginBottom: "8px" }}>
              {dict.reader.projectProtected}
            </h1>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "24px" }}>
              {dict.reader.projectProtectedDesc}
            </p>
            <form action={verifyPasscode} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="hidden" name="projectSlug" value={projectSlug} />
              <input
                type="password"
                name="passcode"
                placeholder={dict.common.passcode}
                required
                style={{ width: "100%", textAlign: "center" }}
              />
              <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                {dict.common.verify}
              </button>
            </form>
          </div>
        </div>
      );
    }
  }

  // Determine current article slug
  const articleSlug = slug && slug.length > 0 ? slug[0] : "welcome";

  // Section authentication check
  const sectionMeta = getArticleSection(projectSlug, articleSlug);
  if (sectionMeta && sectionMeta.isProtected) {
    const hasAccess = await hasSectionAccess(projectSlug, sectionMeta.sectionId);
    if (!hasAccess) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "50vh",
          textAlign: "center"
        }}>
          <div className="card" style={{ maxWidth: "420px", width: "100%", padding: "40px" }}>
            <div style={{
              background: "rgba(244, 63, 94, 0.1)",
              borderRadius: "50%",
              width: "64px",
              height: "64px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px auto",
              color: "var(--accent-rose)"
            }}>
              <Lock size={28} />
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", marginBottom: "8px" }}>
              {dict.reader.sectionProtected}
            </h1>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "24px" }}>
              {dict.reader.sectionProtectedDesc}
            </p>
            <form action={verifySectionCredentialsForm} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="hidden" name="projectSlug" value={projectSlug} />
              <input type="hidden" name="sectionId" value={sectionMeta.sectionId} />
              {sectionMeta.protectionUsername && (
                <input
                  type="text"
                  name="username"
                  placeholder={dict.common.username}
                  required
                  style={{ width: "100%", textAlign: "center" }}
                />
              )}
              <input
                type="password"
                name="password"
                placeholder={dict.common.password}
                required
                style={{ width: "100%", textAlign: "center" }}
              />
              <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                {dict.common.login}
              </button>
            </form>
          </div>
        </div>
      );
    }
  }

  const content = getArticleContent(projectSlug, articleSlug);

  if (!content) {
    // If not found, try to redirect to the first article of the project
    const toc = getProjectToc(projectSlug);
    if (toc.length > 0 && toc[0].articles.length > 0 && articleSlug === "welcome") {
      const firstSlug = toc[0].articles[0].slug;
      const firstContent = getArticleContent(projectSlug, firstSlug);
      if (firstContent) {
        return (
          <div className="markdown-body">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]} 
              rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight]}
              components={{
                pre({ children, ...props }) {
                  const childArray = React.Children.toArray(children);
                  const firstChild = childArray[0] as any;
                  if (
                    firstChild &&
                    firstChild.props &&
                    (firstChild.props.className === "language-mermaid" ||
                      (firstChild.props.className && firstChild.props.className.includes("language-mermaid")))
                  ) {
                    return <>{children}</>;
                  }
                  return <pre {...props}>{children}</pre>;
                },
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const isMermaid = match && match[1] === "mermaid";
                  if (isMermaid) {
                    return <Mermaid chart={String(children).replace(/\n$/, "")} />;
                  }
                  const isBlock = className && (className.includes("language-") || className.includes("hljs"));
                  if (isBlock) {
                    const raw = getRawText(children);
                    const lines = raw.replace(/\n$/, "").split("\n");
                    const lineCount = lines.length;
                    return (
                      <div style={{ display: "flex", fontFamily: "monospace", fontSize: "0.9em" }}>
                        <div style={{
                          position: "sticky",
                          left: "-16px",
                          background: "#0d1117",
                          userSelect: "none",
                          textAlign: "right",
                          paddingLeft: "16px",
                          paddingRight: "12px",
                          marginRight: "12px",
                          borderRight: "1px solid rgba(255,255,255,0.1)",
                          color: "rgba(255,255,255,0.3)",
                          display: "flex",
                          flexDirection: "column"
                        }}>
                          {Array.from({ length: lineCount }).map((_, i) => (
                            <span key={i} style={{ lineHeight: "1.5" }}>{i + 1}</span>
                          ))}
                        </div>
                        <code className={className} style={{ flex: 1, padding: 0, background: "transparent", lineHeight: "1.5" }} {...props}>
                          {children}
                        </code>
                      </div>
                    );
                  }
                  return <code className={className} {...props}>{children}</code>;
                }
              }}
            >
              {firstContent}
            </ReactMarkdown>
          </div>
        );
      }
    }
    if (toc.length === 0) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "50vh",
          textAlign: "center",
          color: "var(--text-muted)"
        }}>
          <FileText size={48} style={{ opacity: 0.5, marginBottom: "16px" }} />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--text-primary)", marginBottom: "8px" }}>
            {dict.reader.emptyProject}
          </h2>
          <p>{dict.reader.emptyProjectDesc}</p>
        </div>
      );
    }
    notFound();
  }

  return (
    <article className="markdown-body" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]} 
        rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight]}
        components={{
          pre({ children, ...props }) {
            const childArray = React.Children.toArray(children);
            const firstChild = childArray[0] as any;
            if (
              firstChild &&
              firstChild.props &&
              (firstChild.props.className === "language-mermaid" ||
                (firstChild.props.className && firstChild.props.className.includes("language-mermaid")))
            ) {
              return <>{children}</>;
            }
            return <pre {...props}>{children}</pre>;
          },
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isMermaid = match && match[1] === "mermaid";
            if (isMermaid) {
              return <Mermaid chart={String(children).replace(/\n$/, "")} />;
            }
            const isBlock = className && (className.includes("language-") || className.includes("hljs"));
            if (isBlock) {
              const raw = getRawText(children);
              const lines = raw.replace(/\n$/, "").split("\n");
              const lineCount = lines.length;
              return (
                <div style={{ display: "flex", fontFamily: "monospace", fontSize: "0.9em" }}>
                  <div style={{
                    position: "sticky",
                    left: "-16px",
                    background: "#0d1117",
                    userSelect: "none",
                    textAlign: "right",
                    paddingLeft: "16px",
                    paddingRight: "12px",
                    marginRight: "12px",
                    borderRight: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.3)",
                    display: "flex",
                    flexDirection: "column"
                  }}>
                    {Array.from({ length: lineCount }).map((_, i) => (
                      <span key={i} style={{ lineHeight: "1.5" }}>{i + 1}</span>
                    ))}
                  </div>
                  <code className={className} style={{ flex: 1, padding: 0, background: "transparent", lineHeight: "1.5" }} {...props}>
                    {children}
                  </code>
                </div>
              );
            }
            return <code className={className} {...props}>{children}</code>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}


