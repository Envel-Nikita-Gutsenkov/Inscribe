"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import Mermaid from "@/components/Mermaid";

function getRawText(children: any): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(getRawText).join("");
  if (children?.props?.children) return getRawText(children.props.children);
  return "";
}

interface EditorWorkspaceProps {
  markdown: string;
  onChangeMarkdown: (val: string) => void;
  isPending: boolean;
  viewMode: "edit" | "split" | "preview";
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export default function EditorWorkspace({
  markdown,
  onChangeMarkdown,
  isPending,
  viewMode,
  textareaRef,
}: EditorWorkspaceProps) {
  const [editorWidthPercent, setEditorWidthPercent] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);

  // Calculate lines for gutter
  const linesCount = markdown.split("\n").length;
  const lineNumbers = Array.from({ length: Math.max(linesCount, 1) }, (_, i) => i + 1);

  // Sync scroll of line numbers gutter with textarea
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleResize = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const percent = (relativeX / rect.width) * 100;
    
    // Bounds check
    if (percent >= 20 && percent <= 80) {
      setEditorWidthPercent(percent);
    }
  }, []);

  const stopResize = useCallback(() => {
    isResizingRef.current = false;
    document.body.style.cursor = "";
    document.removeEventListener("mousemove", handleResize);
    document.removeEventListener("mouseup", stopResize);
  }, [handleResize]);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", handleResize);
    document.addEventListener("mouseup", stopResize);
  }, [handleResize, stopResize]);

  // Cleanup event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleResize);
      document.removeEventListener("mouseup", stopResize);
    };
  }, [handleResize, stopResize]);

  // If viewMode is not split, don't show resizer styles
  const isSplit = viewMode === "split";

  return (
    <div 
      ref={containerRef} 
      style={{ 
        flex: 1, 
        display: "flex", 
        gap: isSplit ? "0" : "16px", 
        height: "100%", 
        width: "100%", 
        position: "relative",
        padding: "10px",
        boxSizing: "border-box"
      }}
    >
      {/* Markdown Editor Pane */}
      {(viewMode === "edit" || isSplit) && (
        <div 
          style={{ 
            width: isSplit ? `${editorWidthPercent}%` : "100%", 
            display: "flex", 
            flexDirection: "column", 
            height: "100%",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: isSplit ? "var(--radius-lg) 0 0 var(--radius-lg)" : "var(--radius-lg)",
            overflow: "hidden"
          }}
        >
          {/* Editor Header Banner */}
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-color)", fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between", background: "var(--editor-header-bg)" }}>
            <span>MARKDOWN EDITOR</span>
            <span>{linesCount} lines</span>
          </div>

          <div style={{ display: "flex", flex: 1, height: "100%", position: "relative", overflow: "hidden" }}>
            {/* Line numbers gutter */}
            <div 
              ref={gutterRef}
              style={{
                width: "48px",
                overflow: "hidden",
                textAlign: "right",
                padding: "20px 8px 20px 0",
                fontSize: "0.9rem",
                fontFamily: "monospace",
                color: "var(--text-secondary)",
                background: "var(--editor-gutter-bg)",
                borderRight: "1px solid var(--border-color)",
                userSelect: "none",
                lineHeight: "1.5"
              }}
            >
              {lineNumbers.map((num) => (
                <div key={num} style={{ lineHeight: "1.5" }}>{num}</div>
              ))}
            </div>

            {/* Main textarea */}
            <textarea
              ref={textareaRef}
              value={markdown}
              onChange={(e) => onChangeMarkdown(e.target.value)}
              onScroll={handleScroll}
              disabled={isPending}
              placeholder="# Heading 1&#10;Start writing content here..."
              style={{
                flex: 1,
                height: "100%",
                fontFamily: "monospace",
                fontSize: "0.9rem",
                background: "transparent",
                border: "none",
                padding: "20px",
                resize: "none",
                outline: "none",
                color: "var(--editor-text)",
                lineHeight: "1.5",
                overflowY: "auto"
              }}
            />
          </div>
        </div>
      )}

      {/* Vertical Draggable Resizer Bar */}
      {isSplit && (
        <div 
          onMouseDown={startResize}
          style={{
            width: "8px",
            cursor: "col-resize",
            background: "rgba(0,0,0,0.3)",
            borderLeft: "1px solid var(--border-color)",
            borderRight: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            zIndex: 10,
            userSelect: "none",
            transition: "background 0.2s"
          }}
          className="editor-resizer-bar"
        >
          {/* Handle visual */}
          <div style={{ width: "2px", height: "24px", background: "var(--border-color)", borderRadius: "1px" }}></div>
        </div>
      )}

      {/* Rendered Live Preview Pane */}
      {(viewMode === "preview" || isSplit) && (
        <div
          className="markdown-body"
          style={{
            width: isSplit ? `${100 - editorWidthPercent}%` : "100%",
            overflowY: "auto",
            height: "100%",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: isSplit ? "0 var(--radius-lg) var(--radius-lg) 0" : "var(--radius-lg)",
            display: "flex",
            flexDirection: "column"
          }}
        >
          {/* Preview Header Banner */}
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-color)", fontSize: "0.75rem", color: "var(--text-secondary)", background: "var(--editor-header-bg)", flexShrink: 0 }}>
            DOCUMENT PREVIEW
          </div>

          <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
            {markdown.trim() === "" ? (
              <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.85rem" }}>
                Preview is empty. Write something in the editor.
              </span>
            ) : (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight]}
                components={{
                  pre({ children, ...props }) {
                    const childArray = React.Children.toArray(children);
                    const firstChild = childArray[0] as any;
                    if (
                      firstChild &&
                      firstChild.props &&
                      (firstChild.props.className === "language-mermaid" ||
                        (firstChild.props.className && firstChild.props.className.includes("language-mermaid")))
                    ) {
                      return <>{children}</>;
                    }
                    return <pre {...props}>{children}</pre>;
                  },
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const isMermaid = match && match[1] === "mermaid";
                    if (isMermaid) {
                      return <Mermaid chart={String(children).replace(/\n$/, "")} />;
                    }
                    const isBlock = className && (className.includes("language-") || className.includes("hljs"));
                    if (isBlock) {
                      const raw = getRawText(children);
                      const lines = raw.replace(/\n$/, "").split("\n");
                      const lineCount = lines.length;
                      return (
                        <div style={{ display: "flex", fontFamily: "monospace", fontSize: "0.9em" }}>
                          <div style={{
                            position: "sticky",
                            left: "-16px",
                            background: "#0d1117",
                            userSelect: "none",
                            textAlign: "right",
                            paddingLeft: "16px",
                            paddingRight: "12px",
                            marginRight: "12px",
                            borderRight: "1px solid rgba(255,255,255,0.1)",
                            color: "rgba(255,255,255,0.3)",
                            display: "flex",
                            flexDirection: "column"
                          }}>
                            {Array.from({ length: lineCount }).map((_, i) => (
                              <span key={i} style={{ lineHeight: "1.5" }}>{i + 1}</span>
                            ))}
                          </div>
                          <code className={className} style={{ flex: 1, padding: 0, background: "transparent", lineHeight: "1.5" }} {...props}>
                            {children}
                          </code>
                        </div>
                      );
                    }
                    return <code className={className} {...props}>{children}</code>;
                  }
                }}
              >
                {markdown}
              </ReactMarkdown>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
