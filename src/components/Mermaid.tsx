"use client";

import React, { useEffect, useRef, useState } from "react";

interface MermaidProps {
  chart: string;
}

let mermaidInstance: any = null;

export default function Mermaid({ chart }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<string>("dark");

  useEffect(() => {
    // Set initial theme
    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    setTheme(currentTheme);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "data-theme") {
          const nextTheme = document.documentElement.getAttribute("data-theme") || "dark";
          setTheme(nextTheme);
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    
    async function loadAndRender() {
      try {
        if (!mermaidInstance) {
          const mod = await import("mermaid");
          mermaidInstance = mod.default;
          mermaidInstance.initialize({
            startOnLoad: false,
            theme: theme === "light" ? "default" : "dark",
            securityLevel: "loose",
          });
        } else {
          // Re-initialize theme in case it changed
          mermaidInstance.initialize({
            theme: theme === "light" ? "default" : "dark",
          });
        }
        
        const id = "mermaid-" + Math.random().toString(36).substring(2, 9);
        const { svg: renderedSvg } = await mermaidInstance.render(id, chart);
        
        if (active) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err: any) {
        console.error("Mermaid rendering failed:", err);
        if (active) {
          setError(err.message || "Failed to parse Mermaid diagram");
        }
      }
    }

    loadAndRender();

    return () => {
      active = false;
    };
  }, [chart, theme]);

  if (error) {
    return (
      <div style={{
        padding: "16px",
        background: "rgba(244, 63, 94, 0.05)",
        border: "1px solid rgba(244, 63, 94, 0.2)",
        borderRadius: "var(--radius-md)",
        color: "var(--accent-rose)",
        fontFamily: "monospace",
        fontSize: "0.85rem",
        whiteSpace: "pre-wrap"
      }}>
        <strong>Mermaid Render Error:</strong>
        <div>{error}</div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      style={{ 
        display: "flex", 
        justifyContent: "center", 
        background: "var(--bg-secondary)", 
        padding: "20px", 
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-color)",
        overflowX: "auto",
        margin: "16px 0"
      }}
      dangerouslySetInnerHTML={{ __html: svg || '<div style="color: var(--text-muted); font-size: 0.85rem;">Rendering diagram...</div>' }} 
    />
  );
}
