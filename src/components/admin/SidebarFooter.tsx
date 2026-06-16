"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, LogOut, Settings, Sun, Moon } from "lucide-react";
import { logoutAction } from "@/app/actions/authActions";
import dynamic from "next/dynamic";
import { applyPrefs, loadPrefs } from "@/lib/userPrefs";

const UserPreferencesPanel = dynamic(
  () => import("./UserPreferencesPanel"),
  { ssr: false }
);

interface Props {
  username: string;
  role: "superadmin" | "editor";
}

export default function SidebarFooter({ username, role }: Props) {
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    applyPrefs(loadPrefs());
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    setTheme(saved || "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <>
      <div style={{
        padding: "16px 20px",
        borderTop: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}>
        {/* User info row */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          padding: "10px 12px",
          background: "rgba(0,0,0,0.15)",
          borderRadius: "10px",
          border: "1px solid var(--border-color)",
        }}>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {username}
            </span>
            <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
              {role === "superadmin" ? "Global Access" : "Assigned Projects"}
            </span>
          </div>

          {/* Preferences gear */}
          <button
            title="User Preferences"
            onClick={() => setPrefsOpen(true)}
            className="btn"
            style={{
              padding: "7px",
              borderRadius: "8px",
              flexShrink: 0,
              color: "var(--text-secondary)",
              background: "transparent",
              border: "1px solid transparent",
            }}
          >
            <Settings size={15} />
          </button>
        </div>

        {/* Action buttons row */}
        <div style={{ display: "flex", gap: "6px" }}>
          <Link
            href="/"
            className="btn"
            title="Go to main site"
            style={{ padding: "8px", flex: 1, justifyContent: "center" }}
          >
            <ArrowLeft size={15} />
          </Link>

          <button
            title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            onClick={toggleTheme}
            className="btn"
            style={{ padding: "8px", flex: 1, justifyContent: "center" }}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <form action={logoutAction} style={{ flex: 1, display: "flex" }}>
            <button
              type="submit"
              className="btn btn-danger"
              title="Sign Out"
              style={{ padding: "8px", width: "100%", justifyContent: "center" }}
            >
              <LogOut size={15} />
            </button>
          </form>
        </div>
      </div>

      {prefsOpen && (
        <UserPreferencesPanel onClose={() => setPrefsOpen(false)} />
      )}
    </>
  );
}
