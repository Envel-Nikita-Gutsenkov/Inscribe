import React from "react";
import { getSession } from "@/lib/auth";
import { getProjects } from "@/lib/db";
import Link from "next/link";
import { Plus, BookOpen, ExternalLink, ShieldAlert, Settings } from "lucide-react";
import CreateProjectButton from "@/components/admin/CreateProjectButton";

export default async function AdminDashboardPage() {
  const session = await getSession();
  const allProjects = getProjects();

  // Filter projects depending on user access
  const projects = session?.role === "superadmin" 
    ? allProjects 
    : allProjects.filter((p) => session?.projects.includes(p.slug));

  const isSuper = session?.role === "superadmin";

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: "40px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", fontWeight: 700, letterSpacing: "-0.03em" }}>
            Projects
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Select a project to edit its sections, articles, or manage settings
          </p>
        </div>
        
        {isSuper && <CreateProjectButton />}
      </div>

      {projects.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 40px" }}>
          <div style={{
            background: "rgba(139, 92, 246, 0.08)",
            borderRadius: "50%",
            width: "80px",
            height: "80px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px auto",
            color: "var(--accent-purple)"
          }}>
            <BookOpen size={40} />
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", marginBottom: "8px" }}>No projects found</h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: "450px", margin: "0 auto 24px auto", fontSize: "0.95rem" }}>
            {isSuper 
              ? "Get started by creating your first documentation project. You can define slugs, map domains, and configure visibility."
              : "You don't have access to any projects. Please contact your system administrator to assign projects to your account."
            }
          </p>
        </div>
      ) : (
        <div className="grid-cols-3">
          {projects.map((project) => (
            <div key={project.slug} className="card" style={{ 
              display: "flex", 
              flexDirection: "column", 
              justifyContent: "between",
              height: "220px",
              transition: "transform 0.2s ease, border-color 0.2s ease",
              position: "relative"
            }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "16px" }}>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 600 }}>
                    {project.name}
                  </h3>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <span className={`badge ${project.isPublic ? "badge-success" : "badge-secondary"}`}>
                      {project.isPublic ? "Public" : "Private"}
                    </span>
                  </div>
                </div>
                <p style={{ 
                  color: "var(--text-secondary)", 
                  fontSize: "0.85rem", 
                  lineHeight: "1.5",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  marginBottom: "20px"
                }}>
                  {project.description || "No description provided."}
                </p>
              </div>

              {/* Action row at bottom */}
              <div style={{ marginTop: "auto", display: "flex", gap: "8px" }}>
                <Link href={`/admin/projects/${project.slug}`} className="btn btn-primary" style={{ padding: "8px 12px", fontSize: "0.85rem", flex: 1, justifyContent: "center" }}>
                  <Settings size={14} />
                  <span>Manage</span>
                </Link>
                <Link href={`/p/${project.slug}`} target="_blank" className="btn" style={{ padding: "8px", justifyContent: "center" }}>
                  <ExternalLink size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
