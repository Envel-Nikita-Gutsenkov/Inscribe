"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  public render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div style={{
        padding: "12px 16px",
        border: "1px dashed var(--accent-rose)",
        borderRadius: "8px",
        background: "rgba(244, 63, 94, 0.05)",
        color: "var(--accent-rose)",
        fontSize: "0.82rem",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        margin: "8px 0"
      }}>
        <AlertTriangle size={14} />
        <span>Component failed to render{this.state.error ? `: ${this.state.error.message}` : ""}</span>
      </div>
    );
  }
}
