"use client";

import React from "react";
import { ImageManager } from "@/components/admin/ImageManager";

export default function ImagesPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 700 }}>
          Media Gallery
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          Upload, optimize, and manage documentation assets
        </p>
      </div>
      <div className="card" style={{ flex: 1, overflow: "hidden", padding: 0 }}>
        <ImageManager />
      </div>
    </div>
  );
}
