"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Menu } from "lucide-react";
import { ErrorBoundary } from "./ErrorBoundary";

interface HomeLayoutClientProps {
  projects: Array<{
    slug: string;
    name: string;
  }>;
  children: React.ReactNode;
}

export function HomeLayoutClient({ projects, children }: HomeLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <ErrorBoundary>
        <Sidebar 
          projects={projects} 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />
      </ErrorBoundary>

      {/* Mobile/collapsible backdrop */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          style={{
            display: "none",
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.4)",
            zIndex: 99,
            backdropFilter: "blur(4px)",
          }}
          className="mobile-backdrop"
        />
      )}

      {/* Floating button to open sidebar when closed */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          style={{
            position: "fixed",
            left: "20px",
            top: "20px",
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

      {/* Main Content Wrapper */}
      <div 
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          padding: "40px",
          marginLeft: isSidebarOpen ? "var(--sidebar-width)" : "0",
          transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        className="main-content-wrapper"
      >
        <main 
          style={{
            width: "100%",
            maxWidth: "1200px",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
