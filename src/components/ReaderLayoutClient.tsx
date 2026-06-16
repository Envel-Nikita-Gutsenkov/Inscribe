"use client";

import React, { useState, useEffect } from "react";
import SidebarSearch from "@/components/SidebarSearch";
import { Sidebar } from "@/components/Sidebar";
import { Menu } from "lucide-react";
import { ErrorBoundary } from "./ErrorBoundary";
import { applyPrefs, loadPrefs } from "@/lib/userPrefs";

interface Section {
  id: string;
  title: string;
  articles: Array<{
    slug: string;
    title: string;
    isPublished: boolean;
  }>;
}

interface ReaderLayoutClientProps {
  project: {
    slug: string;
    name: string;
    description: string | null;
    customDomain: string | null;
  };
  projects: Array<{
    slug: string;
    name: string;
  }>;
  toc: Section[];
  children: React.ReactNode;
}

export default function ReaderLayoutClient({ project, projects, toc, children }: ReaderLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Apply saved preferences immediately on mount
  useEffect(() => {
    applyPrefs(loadPrefs());
  }, []);

  // Register service worker in production, unregister in development to avoid HMR loops
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
    } else {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/p/" })
        .catch((err) => console.warn("[SW] Registration failed:", err));
    }
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <ErrorBoundary>
        <Sidebar
          projects={projects}
          currentProjectSlug={project.slug}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        >
          <ErrorBoundary>
            <SidebarSearch projectSlug={project.slug} toc={toc} />
          </ErrorBoundary>
        </Sidebar>
      </ErrorBoundary>

      {/* Floating button to open sidebar when closed */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          style={{
            position: "fixed",
            left: "20px",
            top: "12px",
            zIndex: 90,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            color: "var(--text-primary)",
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            cursor: "pointer",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            transition: "all 0.2s ease",
          }}
          title="Show menu"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Main Content Area */}
      <div 
        style={{ 
          marginLeft: isSidebarOpen ? "var(--sidebar-width)" : "0", 
          flex: 1, 
          display: "flex", 
          flexDirection: "column",
          transition: "margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Header */}
        <header style={{
          height: "var(--header-height)",
          borderBottom: "1px solid var(--border-color)",
          backdropFilter: "blur(12px)",
          background: "var(--bg-card)",
          position: "sticky",
          top: 0,
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isSidebarOpen ? "0 40px" : "0 40px 0 80px",
          transition: "padding 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary)" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{project.name}</span>
          </div>
          <div>
            {project.customDomain && (
              <span style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                border: "1px solid var(--border-color)",
                borderRadius: "9999px",
                padding: "2px 10px"
              }}>
                {project.customDomain}
              </span>
            )}
          </div>
        </header>

        {/* Page Body */}
        <main className="main-content" style={{ padding: "40px", marginLeft: 0 }}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
