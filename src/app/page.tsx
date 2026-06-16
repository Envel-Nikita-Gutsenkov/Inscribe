import React from "react";
import { getProjects, getSystemSetting } from "@/lib/db";
import Link from "next/link";
import { BookOpen, Shield, ArrowRight, Globe, Terminal, Code, Cpu } from "lucide-react";
import { HomeLayoutClient } from "@/components/HomeLayoutClient";
import { HomeSearch } from "@/components/HomeSearch";

const ICONS = [BookOpen, Globe, Shield, Terminal, Code, Cpu];
const COLORS = [
  { bg: "rgba(139, 92, 246, 0.1)", text: "var(--accent-purple)" },
  { bg: "rgba(6, 182, 212, 0.1)", text: "var(--accent-cyan)" },
  { bg: "rgba(16, 185, 129, 0.1)", text: "var(--accent-emerald)" },
];

export default async function HomePage() {
  const projects = getProjects().filter((p) => p.isPublic);
  const portalTitle = getSystemSetting("portal_title", "Welcome to Inscribe");
  const portalDescription = getSystemSetting("portal_description", "Search for articles or select a documentation workspace below to get started.");

  // Map projects to simplified format for client component
  const sidebarProjects = projects.map((p) => ({
    slug: p.slug,
    name: p.name,
  }));

  return (
    <HomeLayoutClient projects={sidebarProjects}>
      {/* Header section with Title and Search */}
      <header style={{
        textAlign: "center",
        padding: "30px 20px 20px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "3.5rem",
          fontWeight: 800,
          letterSpacing: "-0.04em",
          lineHeight: 1.1,
          marginBottom: "12px",
          display: "inline-flex",
          alignItems: "center",
          gap: "14px"
        }}>
          <span style={{
            background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            paddingRight: "0.1em"
          }}>
            {portalTitle}
          </span>
          <span>📖</span>
        </h1>
        <p style={{
          fontSize: "1.1rem",
          color: "var(--text-secondary)",
          maxWidth: "600px",
          margin: "0 auto 16px auto",
          lineHeight: "1.5"
        }}>
          {portalDescription}
        </p>

        <HomeSearch />
      </header>

      {/* Recommended/Public Projects Section */}
      <section style={{ marginTop: "16px", padding: "0 20px" }}>
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.75rem",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          marginBottom: "16px",
          textAlign: "left",
          color: "var(--text-primary)"
        }}>
          Recommended Projects
        </h2>

        {projects.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px", maxWidth: "500px", margin: "0 auto" }}>
            <p style={{ color: "var(--text-secondary)" }}>
              No public documentation spaces are currently available. Log in to the Admin Console to create a project and add content.
            </p>
          </div>
        ) : (
          <div className="grid-cols-3">
            {projects.map((project, idx) => {
              const IconComponent = ICONS[idx % ICONS.length];
              const colorTheme = COLORS[idx % COLORS.length];

              return (
                <Link key={project.slug} href={`/p/${project.slug}`} className="card" style={{
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "220px",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  cursor: "pointer",
                  textAlign: "left"
                }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "16px",
                    background: colorTheme.bg,
                    color: colorTheme.text
                  }}>
                    <IconComponent size={24} />
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      {project.name}
                    </h3>
                  </div>

                  <p style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.875rem",
                    lineHeight: "1.5",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginBottom: "20px"
                  }}>
                    {project.description || "Browse project documentation."}
                  </p>

                  <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "var(--accent-cyan)", fontWeight: 500 }}>
                    <span>Browse Docs</span>
                    <ArrowRight size={14} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer style={{
        marginTop: "80px",
        height: "64px",
        borderTop: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.8rem",
        color: "var(--text-muted)"
      }}>
        <span>Powered by Inscribe © {new Date().getFullYear()}</span>
      </footer>
    </HomeLayoutClient>
  );
}
