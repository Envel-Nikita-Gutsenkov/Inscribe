import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Clock, RotateCcw, GitBranch, X, Columns, Rows } from "lucide-react";
import { ArticleHistoryEntry } from "@/lib/db/types";
import { computeLineDiff, alignDiff, computeWordDiff } from "@/lib/diff";

interface RevisionHistoryProps {
  history: ArticleHistoryEntry[];
  currentContent: string;
  onRollback: (historyId: string) => void;
}

function DiffLineContent({
  type,
  content,
  otherContent,
}: {
  type: "added" | "removed" | "unchanged";
  content: string;
  otherContent?: string;
}) {
  if (type === "unchanged" || !otherContent) {
    return <span>{content || " "}</span>;
  }

  const oldText = type === "removed" ? content : otherContent;
  const newText = type === "added" ? content : otherContent;
  const wordTokens = computeWordDiff(oldText, newText);

  return (
    <>
      {wordTokens.map((token, idx) => {
        if (token.type === "unchanged") {
          return <span key={idx}>{token.content}</span>;
        }

        if (type === "removed" && token.type === "removed") {
          return (
            <mark
              key={idx}
              style={{
                backgroundColor: "var(--diff-removed-word-bg)",
                color: "var(--diff-removed-text)",
                padding: "1px 2px",
                borderRadius: "2px",
                textDecoration: "line-through",
              }}
            >
              {token.content}
            </mark>
          );
        }

        if (type === "added" && token.type === "added") {
          return (
            <mark
              key={idx}
              style={{
                backgroundColor: "var(--diff-added-word-bg)",
                color: "var(--diff-added-text)",
                padding: "1px 2px",
                borderRadius: "2px",
                fontWeight: 600,
              }}
            >
              {token.content}
            </mark>
          );
        }

        return null;
      })}
    </>
  );
}

export default function RevisionHistory({ history, currentContent, onRollback }: RevisionHistoryProps) {
  const [diffingRevision, setDiffingRevision] = useState<ArticleHistoryEntry | null>(null);
  const [viewMode, setViewMode] = useState<"split" | "unified">("split");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const diffLines = diffingRevision ? computeLineDiff(diffingRevision.content, currentContent) : [];
  const alignedRows = diffingRevision ? alignDiff(diffLines) : [];
  const sortedHistory = [...history].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div
      className="card"
      style={{
        width: "320px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        position: "absolute",
        right: "10px",
        top: "10px",
        bottom: "10px",
        height: "calc(100% - 20px)",
        overflowY: "auto",
        padding: "16px",
        background: "var(--bg-secondary)",
        zIndex: 40,
        boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.25)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-color)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", color: "var(--text-primary)" }}>
          <Clock size={14} style={{ color: "var(--accent-cyan)" }} />
          <span>Revisions</span>
        </h3>
      </div>

      {sortedHistory.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: "0.8rem" }}>
          No published history found.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {sortedHistory.map((h) => (
            <div
              key={h.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "rgba(255,255,255,0.01)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-cyan)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {h.username}
                  </span>
                </div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  {new Date(h.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
              <p style={{ fontSize: "0.8rem", margin: "2px 0", color: "var(--text-secondary)", lineHeight: 1.3 }}>
                {h.changeSummary || "Published version"}
              </p>
              <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                <button
                  onClick={() => setDiffingRevision(h)}
                  className="btn"
                  style={{
                    padding: "6px 8px",
                    fontSize: "0.75rem",
                    flex: 1,
                    justifyContent: "center",
                    gap: "4px",
                    minWidth: 0,
                  }}
                >
                  <GitBranch size={12} style={{ color: "var(--accent-cyan)", flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Compare</span>
                </button>
                <button
                  onClick={() => onRollback(h.id)}
                  className="btn"
                  style={{
                    padding: "6px 8px",
                    fontSize: "0.75rem",
                    flex: 1,
                    justifyContent: "center",
                    gap: "4px",
                    minWidth: 0,
                  }}
                >
                  <RotateCcw size={12} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Rollback</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VISUAL DIFF MODAL VIA PORTAL */}
      {diffingRevision && mounted && createPortal(
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px",
        }}>
          <div className="card" style={{
            maxWidth: "1440px",
            width: "100%",
            height: "90vh",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            boxShadow: "var(--shadow-glow)",
            padding: "24px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
          }}>
            <button
              onClick={() => setDiffingRevision(null)}
              style={{ position: "absolute", top: "20px", right: "20px", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
            >
              <X size={20} />
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginRight: "30px", marginBottom: "16px" }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 700, marginBottom: "4px", color: "var(--text-primary)" }}>
                  Compare Revision with Current Draft
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  Comparing revision published by <strong style={{ color: "var(--accent-cyan)" }}>{diffingRevision.username}</strong> on {new Date(diffingRevision.createdAt).toLocaleString()} against active draft.
                </p>
              </div>
              <div style={{ display: "flex", background: "var(--bg-input)", borderRadius: "var(--radius-md)", padding: "3px", border: "1px solid var(--border-color)", marginRight: "12px" }}>
                <button
                  onClick={() => setViewMode("split")}
                  style={{
                    padding: "6px 12px",
                    border: "none",
                    borderRadius: "4px",
                    background: viewMode === "split" ? "var(--accent-purple)" : "transparent",
                    cursor: "pointer",
                    color: viewMode === "split" ? "#ffffff" : "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.8rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Columns size={14} />
                  <span>Split</span>
                </button>
                <button
                  onClick={() => setViewMode("unified")}
                  style={{
                    padding: "6px 12px",
                    border: "none",
                    borderRadius: "4px",
                    background: viewMode === "unified" ? "var(--accent-purple)" : "transparent",
                    cursor: "pointer",
                    color: viewMode === "unified" ? "#ffffff" : "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.8rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Rows size={14} />
                  <span>Unified</span>
                </button>
              </div>
            </div>

            {/* DIFF SCROLL CONTAINER */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              fontFamily: "monospace",
              fontSize: "0.85rem",
              padding: "0",
            }}>
              {diffLines.length === 0 ? (
                <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "80px" }}>
                  No changes detected. Both versions are identical.
                </div>
              ) : viewMode === "split" ? (
                /* SPLIT VIEW (SIDE-BY-SIDE) */
                <div style={{ display: "grid", gridTemplateColumns: "45px 1fr 45px 1fr", rowGap: "0" }}>
                  {/* Grid Headers */}
                  <div style={{ gridColumn: "span 2", padding: "10px 12px", borderBottom: "1px solid var(--border-color)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-secondary)" }}>
                    Revision ({diffingRevision.username})
                  </div>
                  <div style={{ gridColumn: "span 2", padding: "10px 12px", borderBottom: "1px solid var(--border-color)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-secondary)", borderLeft: "1px solid var(--border-color)" }}>
                    Current Draft
                  </div>

                  {alignedRows.map((row, idx) => {
                    const hasLeft = !!row.left;
                    const hasRight = !!row.right;
                    const leftType = row.left?.type || "unchanged";
                    const rightType = row.right?.type || "unchanged";

                    let leftBg = "transparent";
                    let leftColor = "var(--text-secondary)";
                    let leftGutterBg = "var(--bg-secondary)";
                    let leftGutterColor = "var(--text-muted)";

                    if (leftType === "removed") {
                      leftBg = "var(--diff-removed-bg)";
                      leftColor = "var(--diff-removed-text)";
                      leftGutterBg = "var(--diff-removed-bg)";
                      leftGutterColor = "var(--diff-removed-text)";
                    } else if (leftType === "unchanged") {
                      leftColor = "var(--text-primary)";
                    }

                    let rightBg = "transparent";
                    let rightColor = "var(--text-secondary)";
                    let rightGutterBg = "var(--bg-secondary)";
                    let rightGutterColor = "var(--text-muted)";

                    if (rightType === "added") {
                      rightBg = "var(--diff-added-bg)";
                      rightColor = "var(--diff-added-text)";
                      rightGutterBg = "var(--diff-added-bg)";
                      rightGutterColor = "var(--diff-added-text)";
                    } else if (rightType === "unchanged") {
                      rightColor = "var(--text-primary)";
                    }

                    return (
                      <React.Fragment key={idx}>
                        {/* Left Line Number */}
                        <div style={{
                          background: leftGutterBg,
                          color: leftGutterColor,
                          textAlign: "right",
                          paddingRight: "10px",
                          userSelect: "none",
                          borderRight: "1px solid var(--border-color)",
                          padding: "3px 8px 3px 0",
                          borderBottom: "1px solid rgba(255,255,255,0.01)",
                        }}>
                          {row.left?.lineNumber || ""}
                        </div>
                        {/* Left Code */}
                        <div style={{
                          background: leftBg,
                          color: leftColor,
                          padding: "3px 12px",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                          borderBottom: "1px solid rgba(255,255,255,0.01)",
                          lineHeight: "1.4",
                        }}>
                          {row.left ? (
                            <>
                              <span style={{ color: leftType === "removed" ? "var(--diff-removed-text)" : "var(--text-muted)", marginRight: "8px", userSelect: "none" }}>
                                {row.left.type === "removed" ? "-" : " "}
                              </span>
                              <DiffLineContent
                                type={row.left.type}
                                content={row.left.content}
                                otherContent={row.right?.content}
                              />
                            </>
                          ) : " "}
                        </div>

                        {/* Right Line Number */}
                        <div style={{
                          background: rightGutterBg,
                          color: rightGutterColor,
                          textAlign: "right",
                          paddingRight: "10px",
                          userSelect: "none",
                          borderRight: "1px solid var(--border-color)",
                          borderLeft: "1px solid var(--border-color)",
                          padding: "3px 8px 3px 0",
                          borderBottom: "1px solid rgba(255,255,255,0.01)",
                        }}>
                          {row.right?.lineNumber || ""}
                        </div>
                        {/* Right Code */}
                        <div style={{
                          background: rightBg,
                          color: rightColor,
                          padding: "3px 12px",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                          borderBottom: "1px solid rgba(255,255,255,0.01)",
                          lineHeight: "1.4",
                        }}>
                          {row.right ? (
                            <>
                              <span style={{ color: rightType === "added" ? "var(--diff-added-text)" : "var(--text-muted)", marginRight: "8px", userSelect: "none" }}>
                                {row.right.type === "added" ? "+" : " "}
                              </span>
                              <DiffLineContent
                                type={row.right.type}
                                content={row.right.content}
                                otherContent={row.left?.content}
                              />
                            </>
                          ) : " "}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : (
                /* UNIFIED VIEW (INLINE) */
                <div style={{ display: "grid", gridTemplateColumns: "45px 45px 1fr", rowGap: "0" }}>
                  {diffLines.map((line, idx) => {
                    let bg = "transparent";
                    let color = "var(--text-primary)";
                    let prefix = " ";
                    let prefixColor = "var(--text-muted)";
                    let gutterBg = "var(--bg-secondary)";
                    let gutterColor = "var(--text-muted)";

                    if (line.type === "added") {
                      bg = "var(--diff-added-bg)";
                      color = "var(--diff-added-text)";
                      prefix = "+";
                      prefixColor = "var(--diff-added-text)";
                      gutterBg = "var(--diff-added-bg)";
                      gutterColor = "var(--diff-added-text)";
                    } else if (line.type === "removed") {
                      bg = "var(--diff-removed-bg)";
                      color = "var(--diff-removed-text)";
                      prefix = "-";
                      prefixColor = "var(--diff-removed-text)";
                      gutterBg = "var(--diff-removed-bg)";
                      gutterColor = "var(--diff-removed-text)";
                    }
                    
                    let otherContent: string | undefined;
                    if (line.type === "removed") {
                      const nextLine = diffLines[idx + 1];
                      if (nextLine && nextLine.type === "added") {
                        otherContent = nextLine.content;
                      }
                    } else if (line.type === "added") {
                      const prevLine = diffLines[idx - 1];
                      if (prevLine && prevLine.type === "removed") {
                        otherContent = prevLine.content;
                      }
                    }

                    return (
                      <React.Fragment key={idx}>
                        <div style={{
                          background: gutterBg,
                          color: gutterColor,
                          textAlign: "right",
                          paddingRight: "8px",
                          userSelect: "none",
                          padding: "3px 8px 3px 0",
                          borderBottom: "1px solid rgba(255,255,255,0.01)",
                        }}>
                          {line.type !== "added" ? idx + 1 : ""}
                        </div>
                        <div style={{
                          background: gutterBg,
                          color: gutterColor,
                          textAlign: "right",
                          paddingRight: "8px",
                          userSelect: "none",
                          borderRight: "1px solid var(--border-color)",
                          padding: "3px 8px 3px 0",
                          borderBottom: "1px solid rgba(255,255,255,0.01)",
                        }}>
                          {line.type !== "removed" ? idx + 1 : ""}
                        </div>
                        <div style={{
                          background: bg,
                          color: color,
                          padding: "3px 12px",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                          borderBottom: "1px solid rgba(255,255,255,0.01)",
                          lineHeight: "1.4",
                        }}>
                          <span style={{ color: prefixColor, marginRight: "8px", userSelect: "none" }}>{prefix}</span>
                          <DiffLineContent
                            type={line.type}
                            content={line.content}
                            otherContent={otherContent}
                          />
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px", gap: "12px" }}>
              <button onClick={() => setDiffingRevision(null)} className="btn">
                Close
              </button>
              <button
                onClick={() => {
                  onRollback(diffingRevision.id);
                  setDiffingRevision(null);
                }}
                className="btn btn-primary"
              >
                Rollback to this Version
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
