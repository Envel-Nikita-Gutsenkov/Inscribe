"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ChevronDown, FileText, Loader } from "lucide-react";

interface ArticleRef {
  slug: string;
  title: string;
}

interface Section {
  id: string;
  title: string;
  articles: ArticleRef[];
}

interface SidebarSearchProps {
  projectSlug: string;
  toc: Section[];
}

interface SearchResult {
  slug: string;
  title: string;
  contentSnippet: string;
}

export default function SidebarSearch({ projectSlug, toc }: SidebarSearchProps) {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const pathname = usePathname();

  // Debounced server-side search fetch
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(search)}&project=${projectSlug}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data || []);
        }
      } catch (err) {
        console.error("Search fetch failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250); // 250ms debounce

    return () => clearTimeout(delayDebounce);
  }, [search, projectSlug]);

  // Helper to parse sqlite FTS5 snippet and highlight matches
  const renderSnippet = (snippet: string) => {
    if (!snippet) return null;
    const parts = snippet.split("==");
    return (
      <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4, marginTop: "4px" }}>
        {parts.map((part, index) =>
          index % 2 === 1 ? (
            <mark
              key={index}
              style={{
                backgroundColor: "rgba(6, 182, 212, 0.25)",
                color: "var(--accent-cyan)",
                padding: "0 2px",
                borderRadius: "2px",
              }}
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <>
      {/* Search Input Box */}
      <div style={{ padding: "8px 0 12px 0" }}>
        <div style={{ position: "relative", width: "100%" }}>
          <input
            type="text"
            placeholder="Search documentation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px 10px 38px",
              fontSize: "0.85rem",
            }}
          />
          {isSearching ? (
            <Loader
              size={14}
              className="spin"
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
          ) : (
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
          )}
        </div>
      </div>

      {/* Navigation list or Search results view */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {search.trim() !== "" ? (
          /* Search Results Display */
          <div>
            <div style={{ padding: "4px 12px 12px 12px", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Search Results
            </div>
            
            {searchResults.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                {isSearching ? "Searching index..." : "No matches found"}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {searchResults.map((res) => {
                  const href = `/p/${projectSlug}/${res.slug}`;
                  const isActive = pathname === href;

                  return (
                    <Link
                      key={res.slug}
                      href={href}
                      style={{
                        display: "block",
                        padding: "10px 12px",
                        borderRadius: "var(--radius-md)",
                        background: isActive ? "var(--bg-card)" : "transparent",
                        border: isActive ? "1px solid var(--border-color)" : "1px solid transparent",
                        transition: "all 0.15s ease",
                      }}
                      className="nav-link-toc"
                      onMouseOver={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "var(--bg-card)";
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>
                        <FileText size={12} style={{ color: "var(--accent-cyan)" }} />
                        <span>{res.title}</span>
                      </div>
                      {renderSnippet(res.contentSnippet)}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Standard Table of Contents View */
          toc.map((section) => (
            <div key={section.id} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {/* Section Header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                <ChevronDown size={12} />
                <span>{section.title}</span>
              </div>

              {/* Section Articles */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {section.articles.map((art) => {
                  const href = `/p/${projectSlug}/${art.slug}`;
                  const isActive = pathname === href || (art.slug === "welcome" && pathname === `/p/${projectSlug}`);

                  return (
                    <Link
                      key={art.slug}
                      href={href}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px 10px 24px",
                        borderRadius: "var(--radius-md)",
                        fontSize: "0.85rem",
                        color: isActive ? "var(--accent-purple)" : "var(--text-secondary)",
                        background: isActive ? "var(--bg-card)" : "transparent",
                        border: isActive ? "1px solid var(--border-color)" : "1px solid transparent",
                        transition: "all 0.15s ease",
                        fontWeight: isActive ? 600 : 500,
                      }}
                      className="nav-link-toc"
                      onMouseOver={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "var(--bg-card)";
                          e.currentTarget.style.color = "var(--accent-purple)";
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--text-secondary)";
                        }
                      }}
                    >
                      <FileText size={14} style={{ opacity: isActive ? 1 : 0.6 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {art.title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
