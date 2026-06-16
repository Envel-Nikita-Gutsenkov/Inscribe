"use client";

import React, { useState } from "react";
import { Project, Section } from "@/lib/db";
import { FileEdit, Settings2, ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import GeneralSettingsTab from "./GeneralSettingsTab";
import ContentTab from "./ContentTab";

interface WorkspaceProps {
  initialProject: Project;
  initialToc: Section[];
  isSuper: boolean;
}

export default function Workspace({ initialProject, initialToc, isSuper }: WorkspaceProps) {
  const [project, setProject] = useState<Project>(initialProject);
  const [toc, setToc] = useState<Section[]>(initialToc);
  const [activeTab, setActiveTab] = useState<"content" | "settings">("content");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "calc(100vh - 80px)" }}>
      {/* Top Breadcrumb Header */}
      <div className="flex-between workspace-header" style={{ marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid var(--border-color)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/admin" className="btn" style={{ padding: "8px" }} title="Back to Projects">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 700 }}>
                {project.name}
              </h1>
              <span className={`badge ${project.isPublic ? "badge-success" : "badge-secondary"}`} style={{ fontSize: "0.65rem" }}>
                {project.isPublic ? "Public" : "Private"}
              </span>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              Project Slug: <code>{project.slug}</code>
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          {/* Tab toggles */}
          <div style={{
            display: "flex",
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-md)",
            padding: "4px",
            border: "1px solid var(--border-color)"
          }}>
            <button
              onClick={() => setActiveTab("content")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                background: activeTab === "content" ? "var(--accent-purple)" : "transparent",
                color: activeTab === "content" ? "white" : "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.85rem",
                fontWeight: 500,
                transition: "all 0.2s"
              }}
            >
              <FileEdit size={14} />
              <span>Content Editor</span>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                background: activeTab === "settings" ? "var(--accent-purple)" : "transparent",
                color: activeTab === "settings" ? "white" : "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.85rem",
                fontWeight: 500,
                transition: "all 0.2s"
              }}
            >
              <Settings2 size={14} />
              <span>Settings</span>
            </button>
          </div>

          <Link href={`/p/${project.slug}`} target="_blank" className="btn btn-primary">
            <span>View Docs</span>
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>

      {/* Tab Contents */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {activeTab === "content" ? (
          <ContentTab project={project} toc={toc} setToc={setToc} />
        ) : (
          <GeneralSettingsTab project={project} setProject={setProject} isSuper={isSuper} />
        )}
      </div>
    </div>
  );
}
