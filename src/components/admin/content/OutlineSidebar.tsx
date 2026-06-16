import React from "react";
import { FolderPlus, FilePlus, Trash2, Edit, ArrowUp, ArrowDown } from "lucide-react";
import { Section, ArticleRef } from "@/lib/db/types";

interface OutlineSidebarProps {
  toc: Section[];
  activeArticle: ArticleRef | null;
  onSelectArticle: (art: ArticleRef, sectionId: string) => void;
  onAddSection: () => void;
  onRenameSection: (id: string, title: string) => void;
  onDeleteSection: (id: string, title: string) => void;
  onMoveSection: (index: number, dir: "up" | "down") => void;
  onAddArticle: (sectionId: string) => void;
  onRenameArticle: (sectionId: string, slug: string, title: string) => void;
  onDeleteArticle: (sectionId: string, slug: string, title: string) => void;
  onMoveArticle: (sectionId: string, index: number, dir: "up" | "down") => void;
}

export default function OutlineSidebar({
  toc,
  activeArticle,
  onSelectArticle,
  onAddSection,
  onRenameSection,
  onDeleteSection,
  onMoveSection,
  onAddArticle,
  onRenameArticle,
  onDeleteArticle,
  onMoveArticle,
}: OutlineSidebarProps) {
  return (
    <div style={{ width: "300px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div className="flex-between">
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-secondary)" }}>Navigation Outline</h2>
        <button onClick={onAddSection} className="btn" style={{ padding: "6px 10px", fontSize: "0.8rem" }}>
          <FolderPlus size={14} />
          <span>Add Section</span>
        </button>
      </div>

      <div className="card" style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: "16px", maxHeight: "calc(100vh - 240px)", overflowY: "auto" }}>
        {toc.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Outline is empty. Create sections to get started.
          </div>
        ) : (
          toc.map((section, secIdx) => (
            <div key={section.id} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {/* Section header block */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4px 8px",
                borderRadius: "6px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--border-color)"
              }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-primary)" }}>
                  {section.title}
                </span>
                
                {/* Section action tools */}
                <div style={{ display: "flex", gap: "2px" }}>
                  <button onClick={() => onMoveSection(secIdx, "up")} disabled={secIdx === 0} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px" }} title="Move Up"><ArrowUp size={10} /></button>
                  <button onClick={() => onMoveSection(secIdx, "down")} disabled={secIdx === toc.length - 1} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px" }} title="Move Down"><ArrowDown size={10} /></button>
                  <button onClick={() => onRenameSection(section.id, section.title)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px" }} title="Rename"><Edit size={10} /></button>
                  <button onClick={() => onDeleteSection(section.id, section.title)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--accent-rose)", padding: "2px" }} title="Delete"><Trash2 size={10} /></button>
                </div>
              </div>

              {/* Section Articles list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", paddingLeft: "8px", marginTop: "2px" }}>
                {section.articles.map((art, artIdx) => {
                  const isActive = activeArticle?.slug === art.slug;
                  return (
                    <div
                      key={art.slug}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 8px 6px 12px",
                        borderRadius: "4px",
                        fontSize: "0.85rem",
                        background: isActive ? "rgba(139, 92, 246, 0.1)" : "transparent",
                        color: isActive ? "var(--accent-cyan)" : "var(--text-secondary)",
                        cursor: "pointer"
                      }}
                      onClick={() => onSelectArticle(art, section.id)}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, paddingRight: "4px", display: "flex", alignItems: "center" }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{art.title}</span>
                        {!art.isPublished && (
                          <span style={{
                            fontSize: "0.65rem",
                            marginLeft: "6px",
                            padding: "1px 5px",
                            borderRadius: "4px",
                            backgroundColor: "rgba(245, 158, 11, 0.15)",
                            color: "#fbbf24",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            fontWeight: 600,
                            lineHeight: 1
                          }}>
                            Draft
                          </span>
                        )}
                      </span>

                      <div style={{ display: "flex", gap: "2px" }} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => onMoveArticle(section.id, artIdx, "up")} disabled={artIdx === 0} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px" }}><ArrowUp size={10} /></button>
                        <button onClick={() => onMoveArticle(section.id, artIdx, "down")} disabled={artIdx === section.articles.length - 1} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px" }}><ArrowDown size={10} /></button>
                        <button onClick={() => onRenameArticle(section.id, art.slug, art.title)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px" }}><Edit size={10} /></button>
                        <button onClick={() => onDeleteArticle(section.id, art.slug, art.title)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--accent-rose)", padding: "2px" }}><Trash2 size={10} /></button>
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={() => onAddArticle(section.id)}
                  className="btn"
                  style={{
                    background: "transparent",
                    border: "1px dashed var(--border-color)",
                    justifyContent: "center",
                    padding: "4px 8px",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    marginTop: "4px"
                  }}
                >
                  <FilePlus size={12} />
                  <span>Add Article</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
