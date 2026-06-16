"use client";

import { useState } from "react";
import { ChevronDown, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProjectSelectorProps {
  projects: Array<{
    slug: string;
    name: string;
  }>;
  currentProjectSlug?: string;
}

export function ProjectSelector({ projects, currentProjectSlug }: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const currentProject = projects.find((p) => p.slug === currentProjectSlug);

  return (
    <div style={{ position: "relative" }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          color: "var(--text-primary)",
          fontSize: "0.9rem",
          fontWeight: 600,
          cursor: "pointer",
          transition: "border-color 0.2s ease"
        }}
        onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--accent-purple)"}
        onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--border-color)"}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          <BookOpen size={16} style={{ color: "var(--accent-cyan)", flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {currentProject ? currentProject.name : "Select Project..."}
          </span>
        </span>
        <ChevronDown size={16} style={{ flexShrink: 0 }} />
      </button>

      {isOpen && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          marginTop: "4px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          boxShadow: "var(--shadow-glow)",
          zIndex: 10,
          overflow: "hidden"
        }}>
          {projects.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              No projects available
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project.slug}
                onClick={() => {
                  setIsOpen(false);
                  router.push(`/p/${project.slug}`);
                }}
                style={{
                  padding: "10px 12px",
                  fontSize: "0.9rem",
                  color: currentProjectSlug === project.slug ? "var(--accent-purple)" : "var(--text-secondary)",
                  cursor: "pointer",
                  background: currentProjectSlug === project.slug ? "var(--bg-card)" : "transparent",
                  transition: "background 0.2s ease, color 0.2s ease"
                }}
                onMouseOver={(e) => {
                  if (currentProjectSlug !== project.slug) {
                    e.currentTarget.style.background = "var(--bg-card-hover)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }
                }}
                onMouseOut={(e) => {
                  if (currentProjectSlug !== project.slug) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }
                }}
              >
                {project.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
