"use client";

import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { createProjectAction } from "@/app/actions/projectActions";
import { useRouter } from "next/navigation";

export default function CreateProjectButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    // Auto-generate slug from name
    const autoSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setSlug(autoSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const res = await createProjectAction(name, slug, description);
    setIsPending(false);

    if (res.success) {
      setIsOpen(false);
      setName("");
      setSlug("");
      setDescription("");
      router.refresh();
    } else {
      setError(res.error || "Failed to create project");
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-primary">
        <Plus size={16} />
        <span>Create Project</span>
      </button>

      {isOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          padding: "20px"
        }}>
          <div className="card" style={{
            maxWidth: "500px",
            width: "100%",
            position: "relative",
            animation: "fadeIn 0.2s ease",
            boxShadow: "var(--shadow-glow)"
          }}>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "4px"
              }}
            >
              <X size={20} />
            </button>

            <h2 style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 600,
              marginBottom: "6px"
            }}>Create New Project</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "24px" }}>
              Define details for your new documentation project space.
            </p>

            {error && (
              <div style={{
                background: "rgba(244, 63, 94, 0.1)",
                border: "1px solid rgba(244, 63, 94, 0.2)",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
                color: "#fda4af",
                fontSize: "0.85rem",
                marginBottom: "20px"
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Inscribe Documentation"
                  value={name}
                  onChange={handleNameChange}
                  disabled={isPending}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Project Slug / URL Path
                </label>
                <input
                  type="text"
                  required
                  placeholder="inscribe-docs"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ""))}
                  disabled={isPending}
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Accessible at: /p/<strong>{slug || "[slug]"}</strong>
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Description
                </label>
                <textarea
                  placeholder="Short description of what is documented in this project..."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isPending}
                  style={{ resize: "none" }}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn"
                  style={{ flex: 1, justifyContent: "center" }}
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: "center" }}
                  disabled={isPending}
                >
                  {isPending ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
