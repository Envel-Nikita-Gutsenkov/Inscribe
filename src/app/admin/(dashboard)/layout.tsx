import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Users, Database, Shield, Cpu, Image as ImageIcon, KeyRound } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import SidebarFooter from "@/components/admin/SidebarFooter";
import { getUserById } from "@/lib/db";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await getSession();
  
  if (!session) {
    redirect("/admin/login");
  }

  const user = getUserById(session.userId);
  if (user && user.totpSecret === "PENDING") {
    redirect("/admin/setup-2fa");
  }

  const isSuper = session.role === "superadmin";

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Admin Sidebar */}
      <aside className="sidebar">
        {/* Header */}
        <div style={{
          padding: "24px",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}>
          <div style={{
            background: "linear-gradient(135deg, var(--accent-purple), #7c3aed)",
            borderRadius: "8px",
            padding: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white"
          }}>
            <Shield size={20} />
          </div>
          <div>
            <h2 style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.1rem",
              fontWeight: 600,
              lineHeight: 1.2
            }}>Inscribe Console</h2>
            <span style={{ fontSize: "0.75rem", color: "var(--accent-purple)" }}>
              {isSuper ? "Super Admin" : "Project Editor"}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <ErrorBoundary>
          <nav style={{ flex: 1, padding: "24px 16px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <Link
              href="/admin"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                transition: "all 0.2s ease"
              }}
              className="btn-nav"
            >
              <BookOpen size={16} />
              <span>Projects</span>
            </Link>

            <Link
              href="/admin/images"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                transition: "all 0.2s ease"
              }}
              className="btn-nav"
            >
              <ImageIcon size={16} />
              <span>Images</span>
            </Link>

            <Link
              href="/admin/security"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                transition: "all 0.2s ease"
              }}
              className="btn-nav"
            >
              <KeyRound size={16} />
              <span>Security</span>
            </Link>

            {isSuper && (
              <>
                <Link
                  href="/admin/users"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                    transition: "all 0.2s ease"
                  }}
                  className="btn-nav"
                >
                  <Users size={16} />
                  <span>Users</span>
                </Link>

                <Link
                  href="/admin/backups"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                    transition: "all 0.2s ease"
                  }}
                  className="btn-nav"
                >
                  <Database size={16} />
                  <span>Backups</span>
                </Link>

                <Link
                  href="/admin/system"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                    transition: "all 0.2s ease"
                  }}
                  className="btn-nav"
                >
                  <Cpu size={16} />
                  <span>System</span>
                </Link>
              </>
            )}
          </nav>
        </ErrorBoundary>

        {/* Footer */}
        <ErrorBoundary fallback={<div style={{ padding: "16px", color: "var(--text-muted)", fontSize: "0.8rem" }}>Footer offline</div>}>
          <SidebarFooter
            username={session.username}
            role={session.role}
          />
        </ErrorBoundary>
      </aside>

      {/* Main Content Area */}
      <div className="main-content-area" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <main style={{ padding: "40px 60px", flex: 1 }}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
