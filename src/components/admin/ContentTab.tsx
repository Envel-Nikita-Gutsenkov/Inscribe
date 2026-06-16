import React, { useState, useEffect, useRef } from "react";
import { Project, Section, ArticleRef } from "@/lib/db/types";
import {
  Save,
  CheckCircle,
  AlertCircle,
  Eye,
  FileCode,
  Columns,
  Clock,
  Send,
  PanelLeftClose,
  PanelLeft,
  Maximize2,
  Minimize2,
  ImagePlus,
  Menu,
} from "lucide-react";
import { 
  getArticleContentAction, 
  saveArticleContentAction, 
  saveProjectTocAction,
  publishArticleAction,
  rollbackArticleAction,
  getArticleHistoryAction
} from "@/app/actions/articleActions";

import OutlineSidebar from "./content/OutlineSidebar";
import RevisionHistory from "./content/RevisionHistory";
import EditorWorkspace from "./content/EditorWorkspace";
import { ImagePickerModal } from "./ImagePickerModal";
import { PromptModal } from "./PromptModal";
import { useContentActions } from "./content/useContentActions";

interface ContentTabProps {
  project: Project;
  toc: Section[];
  setToc: (t: Section[]) => void;
}

export default function ContentTab({ project, toc, setToc }: ContentTabProps) {
  const [activeArticle, setActiveArticle] = useState<ArticleRef | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const [markdown, setMarkdown] = useState("");
  const [originalMarkdown, setOriginalMarkdown] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditorPending, setIsEditorPending] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [viewMode, setViewMode] = useState<"split" | "edit" | "preview">("split");

  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [publishStatus, setPublishStatus] = useState<"idle" | "publishing" | "published" | "error">("idle");

  // Layout control states
  const [isConsoleSidebarCollapsed, setIsConsoleSidebarCollapsed] = useState(false);
  const [isOutlineSidebarCollapsed, setIsOutlineSidebarCollapsed] = useState(false);
  const [isFullScreenEditor, setIsFullScreenEditor] = useState(false);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const {
    promptConfig,
    handleAddSection,
    handleRenameSection,
    handleDeleteSection,
    handleMoveSection,
    handleAddArticle,
    handleRenameArticle,
    handleDeleteArticle,
    handleMoveArticle,
  } = useContentActions(project.slug, toc, setToc, activeArticle, setActiveArticle);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth < 1400) {
        setIsConsoleSidebarCollapsed(true);
        setIsOutlineSidebarCollapsed(true);
      } else if (window.innerWidth < 1600) {
        setIsConsoleSidebarCollapsed(true);
      }
    }
  }, []);

  useEffect(() => {
    if (isConsoleSidebarCollapsed) {
      document.body.classList.add("console-sidebar-collapsed");
    } else {
      document.body.classList.remove("console-sidebar-collapsed");
    }
    return () => {
      document.body.classList.remove("console-sidebar-collapsed");
    };
  }, [isConsoleSidebarCollapsed]);

  useEffect(() => {
    if (isFullScreenEditor) {
      document.body.classList.add("fullscreen-editor-active");
    } else {
      document.body.classList.remove("fullscreen-editor-active");
    }
    return () => {
      document.body.classList.remove("fullscreen-editor-active");
    };
  }, [isFullScreenEditor]);

  const loadHistory = async () => {
    if (!activeArticle) return;
    const res = await getArticleHistoryAction(project.slug, activeArticle.slug);
    if (res.success) {
      setHistory(res.history || []);
    }
  };

  useEffect(() => {
    if (!activeArticle) {
      setMarkdown("");
      setOriginalMarkdown("");
      setHasChanges(false);
      setHistory([]);
      return;
    }

    const loadContent = async () => {
      setIsEditorPending(true);
      setSaveStatus("idle");
      setPublishStatus("idle");
      const res = await getArticleContentAction(project.slug, activeArticle.slug);
      setIsEditorPending(false);
      
      if (res.success) {
        setMarkdown(res.content || "");
        setOriginalMarkdown(res.content || "");
        setHasChanges(false);
        const histRes = await getArticleHistoryAction(project.slug, activeArticle.slug);
        if (histRes.success) {
          setHistory(histRes.history || []);
        }
      } else {
        alert(res.error || "Failed to load article content");
      }
    };

    loadContent();
  }, [activeArticle, project.slug]);

  useEffect(() => {
    setHasChanges(markdown !== originalMarkdown);
  }, [markdown, originalMarkdown]);

  const handleSaveArticle = async () => {
    if (!activeArticle) return;
    setSaveStatus("saving");
    
    const res = await saveArticleContentAction(project.slug, activeArticle.slug, markdown);
    if (res.success) {
      setOriginalMarkdown(markdown);
      setHasChanges(false);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
      
      const updatedToc = toc.map(s => ({
        ...s,
        articles: s.articles.map(a => a.slug === activeArticle.slug ? { ...a, isPublished: a.isPublished || false } : a)
      }));
      setToc(updatedToc);
    } else {
      setSaveStatus("error");
    }
  };

  const handlePublish = async () => {
    if (!activeArticle) return;
    const summary = "";
    setPublishStatus("publishing");
    
    const res = await publishArticleAction(project.slug, activeArticle.slug, summary);
    if (res.success) {
      setPublishStatus("published");
      setTimeout(() => setPublishStatus("idle"), 3000);
      loadHistory();
      
      const updatedToc = toc.map(s => ({
        ...s,
        articles: s.articles.map(a => a.slug === activeArticle.slug ? { ...a, isPublished: true } : a)
      }));
      setToc(updatedToc);
    } else {
      setPublishStatus("error");
      alert(res.error || "Failed to publish article");
    }
  };

  const handleRollback = async (historyId: string) => {
    if (!activeArticle) return;
    if (confirm("Are you sure you want to rollback the active draft to this historical revision? Unsaved changes will be lost.")) {
      const res = await rollbackArticleAction(project.slug, activeArticle.slug, historyId);
      if (res.success) {
        const loadRes = await getArticleContentAction(project.slug, activeArticle.slug);
        if (loadRes.success) {
          setMarkdown(loadRes.content || "");
          setOriginalMarkdown(loadRes.content || "");
          setHasChanges(false);
        }
      } else {
        alert(res.error || "Failed to rollback article version");
      }
    }
  };

  return (
    <div style={{ display: "flex", flex: 1, gap: "24px", height: "100%", padding: isFullScreenEditor ? "16px 20px" : "0", boxSizing: "border-box" }}>
      {/* Navigation Tree Sidebar */}
      {!isOutlineSidebarCollapsed && (
        <OutlineSidebar
          toc={toc}
          activeArticle={activeArticle}
          onSelectArticle={(art, secId) => {
            if (hasChanges && !confirm("You have unsaved changes. Discard them?")) return;
            setActiveArticle(art);
            setActiveSectionId(secId);
          }}
          onAddSection={handleAddSection}
          onRenameSection={handleRenameSection}
          onDeleteSection={handleDeleteSection}
          onMoveSection={handleMoveSection}
          onAddArticle={handleAddArticle}
          onRenameArticle={handleRenameArticle}
          onDeleteArticle={handleDeleteArticle}
          onMoveArticle={handleMoveArticle}
        />
      )}

      {/* Editor & Preview Workspace */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
        {!activeArticle ? (
          <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyItems: "center", justifyContent: "center", textAlign: "center", padding: "60px 40px" }}>
            <FileCode size={48} style={{ color: "var(--text-muted)", marginBottom: "16px" }} />
            <h3 style={{ fontFamily: "var(--font-display)", marginBottom: "6px" }}>No Active Article</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", maxWidth: "320px" }}>
              Select an article from the outline sidebar to begin editing or publishing drafts.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "16px", height: "100%" }}>
            {/* Toolbar Action Bar */}
            <div className="flex-between">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {/* Collapsible Panel Control Buttons */}
                <div style={{ display: "flex", background: "var(--bg-input)", borderRadius: "var(--radius-md)", padding: "3px", border: "1px solid var(--border-color)", gap: "2px" }}>
                  <button
                    onClick={() => setIsConsoleSidebarCollapsed(!isConsoleSidebarCollapsed)}
                    className="btn"
                    style={{
                      padding: "6px 8px",
                      border: "none",
                      background: isConsoleSidebarCollapsed ? "var(--accent-purple)" : "transparent",
                      color: isConsoleSidebarCollapsed ? "#ffffff" : "var(--text-secondary)"
                    }}
                    title={isConsoleSidebarCollapsed ? "Показать меню консоли" : "Скрыть меню консоли"}
                  >
                    {isConsoleSidebarCollapsed ? <PanelLeft size={14} /> : <PanelLeftClose size={14} />}
                  </button>
                  <button
                    onClick={() => setIsOutlineSidebarCollapsed(!isOutlineSidebarCollapsed)}
                    className="btn"
                    style={{
                      padding: "6px 8px",
                      border: "none",
                      background: isOutlineSidebarCollapsed ? "var(--accent-purple)" : "transparent",
                      color: isOutlineSidebarCollapsed ? "#ffffff" : "var(--text-secondary)"
                    }}
                    title={isOutlineSidebarCollapsed ? "Показать навигацию" : "Скрыть навигацию"}
                  >
                    <Menu size={14} />
                  </button>
                  <button
                    onClick={() => setIsFullScreenEditor(!isFullScreenEditor)}
                    className="btn"
                    style={{
                      padding: "6px 8px",
                      border: "none",
                      background: isFullScreenEditor ? "var(--accent-purple)" : "transparent",
                      color: isFullScreenEditor ? "#ffffff" : "var(--text-secondary)"
                    }}
                    title={isFullScreenEditor ? "Обычный режим" : "На весь экран"}
                  >
                    {isFullScreenEditor ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                </div>

                <div>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>{activeArticle.title}</h2>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Article Slug: <code>{activeArticle.slug}</code>
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  onClick={() => setIsImagePickerOpen(true)}
                  className="btn"
                  style={{ padding: "8px 12px", fontSize: "0.85rem" }}
                  title="Вставить изображение"
                >
                  <ImagePlus size={14} />
                  <span>Изображение</span>
                </button>

                <div style={{ display: "flex", background: "var(--bg-input)", borderRadius: "var(--radius-md)", padding: "3px", border: "1px solid var(--border-color)" }}>
                  <button onClick={() => setViewMode("edit")} style={{ padding: "6px 10px", border: "none", borderRadius: "4px", background: viewMode === "edit" ? "var(--accent-purple)" : "transparent", cursor: "pointer", color: viewMode === "edit" ? "#ffffff" : "var(--text-secondary)" }} title="Editor"><FileCode size={14} /></button>
                  <button onClick={() => setViewMode("split")} style={{ padding: "6px 10px", border: "none", borderRadius: "4px", background: viewMode === "split" ? "var(--accent-purple)" : "transparent", cursor: "pointer", color: viewMode === "split" ? "#ffffff" : "var(--text-secondary)" }} title="Split Mode"><Columns size={14} /></button>
                  <button onClick={() => setViewMode("preview")} style={{ padding: "6px 10px", border: "none", borderRadius: "4px", background: viewMode === "preview" ? "var(--accent-purple)" : "transparent", cursor: "pointer", color: viewMode === "preview" ? "#ffffff" : "var(--text-secondary)" }} title="Preview"><Eye size={14} /></button>
                </div>

                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="btn"
                  style={{
                    padding: "8px 12px",
                    fontSize: "0.85rem",
                    background: showHistory ? "rgba(139, 92, 246, 0.15)" : "transparent",
                    color: showHistory ? "var(--accent-cyan)" : "var(--text-secondary)",
                    border: `1px solid ${showHistory ? "var(--accent-cyan)" : "var(--border-color)"}`
                  }}
                  title="Revision History"
                >
                  <Clock size={14} />
                  <span>History</span>
                </button>

                {hasChanges && (
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "#f59e0b" }}>
                    <AlertCircle size={12} />
                    <span>Unsaved Changes</span>
                  </span>
                )}

                <button
                  onClick={handleSaveArticle}
                  disabled={!hasChanges || saveStatus === "saving" || isEditorPending}
                  className="btn"
                  style={{ padding: "8px 14px", fontSize: "0.85rem" }}
                >
                  {saveStatus === "saving" ? (
                    <span>Saving...</span>
                  ) : saveStatus === "saved" ? (
                    <>
                      <CheckCircle size={14} />
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Save Draft</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handlePublish}
                  disabled={publishStatus === "publishing" || isEditorPending}
                  className="btn btn-primary"
                  style={{
                    padding: "8px 14px",
                    fontSize: "0.85rem",
                    background: "var(--accent-cyan)",
                    color: "white",
                    borderColor: "var(--accent-cyan)"
                  }}
                >
                  {publishStatus === "publishing" ? (
                    <span>Publishing...</span>
                  ) : publishStatus === "published" ? (
                    <>
                      <CheckCircle size={14} />
                      <span>Published</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Publish</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Split workspace area */}
            <div style={{ flex: 1, display: "flex", gap: "16px", minHeight: "calc(100vh - 280px)", position: "relative", overflow: "hidden" }}>
              <EditorWorkspace
                markdown={markdown}
                onChangeMarkdown={setMarkdown}
                isPending={isEditorPending}
                viewMode={viewMode}
                textareaRef={textareaRef}
              />

              {showHistory && (
                <RevisionHistory
                  history={history}
                  currentContent={markdown}
                  onRollback={handleRollback}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {isImagePickerOpen && (
        <ImagePickerModal
          onClose={() => setIsImagePickerOpen(false)}
          onInsert={(md) => {
            const ta = textareaRef.current;
            if (ta) {
              const start = ta.selectionStart;
              const end = ta.selectionEnd;
              const newContent = markdown.slice(0, start) + "\n" + md + "\n" + markdown.slice(end);
              setMarkdown(newContent);
              setTimeout(() => {
                const pos = start + md.length + 2;
                ta.setSelectionRange(pos, pos);
                ta.focus();
              }, 0);
            } else {
              setMarkdown((prev) => prev + "\n" + md + "\n");
            }
          }}
        />
      )}

      <PromptModal {...promptConfig} />
    </div>
  );
}
