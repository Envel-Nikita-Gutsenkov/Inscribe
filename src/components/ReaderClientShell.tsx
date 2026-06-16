"use client";

import { useEffect, useState } from "react";
import { Settings, ArrowLeft, Sun, Moon } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { applyPrefs, loadPrefs } from "@/lib/userPrefs";
import type { Section } from "@/lib/db/types";

const UserPreferencesPanel = dynamic(
  () => import("@/components/admin/UserPreferencesPanel"),
  { ssr: false }
);

interface Props {
  projectSlug: string;
  articleSlug?: string;
  /** TOC passed from server so SW can prefetch adjacent articles */
  toc?: Section[];
}

export default function ReaderClientShell({ projectSlug, articleSlug, toc }: Props) {
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Apply saved preferences immediately on mount (before paint)
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

  // Track reading progress per project
  useEffect(() => {
    if (!articleSlug) return;
    try {
      localStorage.setItem(`inscribe_progress_${projectSlug}`, articleSlug);
    } catch {}
  }, [projectSlug, articleSlug]);

  // Prefetch adjacent articles via SW when browser is idle
  useEffect(() => {
    if (!toc || !articleSlug) return;

    const prefetch = () => {
      const adjacent = getAdjacentSlugs(toc, articleSlug, 4);
      if (adjacent.length === 0) return;

      const urls = adjacent.map((slug) => `/p/${projectSlug}/${slug}`);

      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "PREFETCH_ARTICLES",
          urls,
        });
      }
    };

    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(prefetch, { timeout: 3000 });
      return () => cancelIdleCallback(id);
    } else {
      const t = setTimeout(prefetch, 1500);
      return () => clearTimeout(t);
    }
  }, [projectSlug, articleSlug, toc]);

  return (
    <>
      <div style={{ display: "flex", gap: "6px", width: "100%" }}>
        <Link
          href="/"
          className="btn"
          title="Exit to home"
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

        <button
          id="reader-prefs-btn"
          className="btn"
          onClick={() => setPrefsOpen(true)}
          title="Preferences"
          style={{
            padding: "8px",
            flex: 1,
            justifyContent: "center",
          }}
        >
          <Settings size={15} />
        </button>
      </div>

      {prefsOpen && (
        <UserPreferencesPanel
          onClose={() => setPrefsOpen(false)}
          showAdminLink
        />
      )}
    </>
  );
}

/** Get N adjacent article slugs (prev + next) relative to current, across all sections. */
function getAdjacentSlugs(toc: Section[], currentSlug: string, count: number): string[] {
  const flat: string[] = toc.flatMap((s) => s.articles.map((a) => a.slug));
  const idx = flat.indexOf(currentSlug);
  if (idx === -1) return flat.slice(0, count);

  const result: string[] = [];
  for (let offset = 1; result.length < count; offset++) {
    if (idx + offset < flat.length) result.push(flat[idx + offset]);
    if (result.length < count && idx - offset >= 0) result.push(flat[idx - offset]);
    if (idx + offset >= flat.length && idx - offset < 0) break;
  }
  return result;
}
