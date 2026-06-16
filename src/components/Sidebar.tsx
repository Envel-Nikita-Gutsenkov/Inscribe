"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Shield, BookOpen, PanelLeftClose, Settings } from "lucide-react";
import styles from "./Sidebar.module.css";
import ThemeToggle from "./ThemeToggle";
import { ProjectSelector } from "./ProjectSelector";
import dynamic from "next/dynamic";

const UserPreferencesPanel = dynamic(
  () => import("@/components/admin/UserPreferencesPanel"),
  { ssr: false }
);

interface SidebarProps {
  projects: Array<{
    slug: string;
    name: string;
  }>;
  currentProjectSlug?: string;
  isOpen?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
}

export function Sidebar({ projects, currentProjectSlug, isOpen = true, onClose, children }: SidebarProps) {
  const pathname = usePathname();
  const [prefsOpen, setPrefsOpen] = useState(false);

  const links = [
    { href: "/", label: "Home", icon: Home },
  ];

  return (
    <aside className={`${styles.sidebar} ${!isOpen ? styles.sidebarClosed : ""}`}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Link href="/" className={styles.title}>
            <div style={{
              background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))",
              borderRadius: "6px",
              padding: "6px",
              display: "flex",
              color: "white"
            }}>
              <BookOpen size={16} />
            </div>
            <span>Inscribe</span>
          </Link>
          {onClose && (
            <button 
              onClick={onClose}
              className={styles.closeBtn}
              title="Close menu"
            >
              <PanelLeftClose size={18} />
            </button>
          )}
        </div>
        
        <ProjectSelector projects={projects} currentProjectSlug={currentProjectSlug} />
      </div>

      <nav className={styles.nav}>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));

          return (
            <div key={link.href} className={styles.navGroup}>
              <Link 
                href={link.href}
                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
              >
                <Icon size={18} />
                <span>{link.label}</span>
              </Link>
            </div>
          );
        })}

        {children}
      </nav>

      <div className={styles.footer}>
        <ThemeToggle />
        <button
          onClick={() => setPrefsOpen(true)}
          className={styles.navLink}
          style={{ padding: "8px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {prefsOpen && (
        <UserPreferencesPanel
          onClose={() => setPrefsOpen(false)}
          showAdminLink
        />
      )}
    </aside>
  );
}
