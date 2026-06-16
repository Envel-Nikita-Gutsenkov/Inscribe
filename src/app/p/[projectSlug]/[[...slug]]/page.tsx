import React from "react";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getProjectBySlug, getArticleContent, getProjectToc } from "@/lib/db";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import { Lock, FileText } from "lucide-react";
import Mermaid from "@/components/Mermaid";

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

// Public articles: cache 60s, stale-while-revalidate 5min
// Private/passcode pages are inherently dynamic (they read cookies)
export const revalidate = 60;

interface PageProps {
  params: Promise<{ projectSlug: string; slug?: string[] }>;
}

// Passcode verification action (Server Action)
async function verifyPasscode(formData: FormData) {
  "use server";
  const projectSlug = formData.get("projectSlug") as string;
  const passcode = formData.get("passcode") as string;
  
  const project = getProjectBySlug(projectSlug);
  if (project && project.passcode === passcode) {
    const cookieStore = await cookies();
    cookieStore.set(`passcode_${projectSlug}`, passcode, {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const { projectSlug, slug } = await params;
  
  const project = getProjectBySlug(projectSlug);
  if (!project) {
    notFound();
  }

  // Passcode authentication check
  if (!project.isPublic && project.passcode) {
    const cookieStore = await cookies();
    const enteredPasscode = cookieStore.get(`passcode_${projectSlug}`)?.value;
    
    if (enteredPasscode !== project.passcode) {
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
              Project Protected
            </h1>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "24px" }}>
              This project is private. Enter the passcode to view the documentation.
            </p>
            <form action={verifyPasscode} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="hidden" name="projectSlug" value={projectSlug} />
              <input
                type="password"
                name="passcode"
                placeholder="Passcode"
                required
                style={{ width: "100%", textAlign: "center" }}
              />
              <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                Verify
              </button>
            </form>
          </div>
        </div>
      );
    }
  }

  // Determine current article slug
  const articleSlug = slug && slug.length > 0 ? slug[0] : "welcome";
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
            Project is empty
          </h2>
          <p>This documentation workspace has no published articles yet.</p>
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


