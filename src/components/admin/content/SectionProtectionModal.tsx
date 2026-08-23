"use client";

import React, { useState } from "react";
import { Lock, Shield, X, Save, AlertCircle } from "lucide-react";
import { updateSectionProtectionAction } from "@/app/actions/articleActions";

interface SectionProtectionModalProps {
  projectSlug: string;
  sectionId: string;
  sectionTitle: string;
  isProtected?: boolean;
  protectionUsername?: string;
  onClose: () => void;
  onSaved: (isProtected: boolean, username?: string) => void;
}

export default function SectionProtectionModal({
  projectSlug,
  sectionId,
  sectionTitle,
  isProtected = false,
  protectionUsername = "",
  onClose,
  onSaved,
}: SectionProtectionModalProps) {
  const [enabled, setEnabled] = useState(isProtected);
  const [username, setUsername] = useState(protectionUsername || "");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enabled && !password.trim() && !isProtected) {
      setError("Please specify a password to protect this section.");
      return;
    }

    setPending(true);
    setError(null);

    const res = await updateSectionProtectionAction(
      projectSlug,
      sectionId,
      enabled,
      username.trim() || undefined,
      password.trim() || undefined
    );

    if (res.success) {
      onSaved(enabled, username.trim() || undefined);
      onClose();
    } else {
      setError(res.error || "Failed to update section protection");
      setPending(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.7)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "20px"
    }}>
      <div className="card" style={{ maxWidth: "460px", width: "100%", padding: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              background: enabled ? "rgba(244, 63, 94, 0.1)" : "rgba(139, 92, 246, 0.1)",
              borderRadius: "8px",
              padding: "8px",
              color: enabled ? "var(--accent-rose)" : "var(--accent-purple)"
            }}>
              <Lock size={18} />
            </div>
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 600 }}>
                Section Protection
              </h3>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {sectionTitle}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(244, 63, 94, 0.1)",
            color: "var(--accent-rose)",
            padding: "10px 14px",
            borderRadius: "6px",
            fontSize: "0.85rem",
            marginBottom: "16px"
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "var(--bg-input)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Require Login & Password</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Restrict articles in this section to authenticated users
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          {enabled && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Username / Identifier (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. partner-user (leave empty for password-only)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Password / Passcode {isProtected && <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(leave blank to keep existing)</span>}
                </label>
                <input
                  type="password"
                  placeholder="Enter section password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
            </>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={onClose} className="btn" disabled={pending}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              <Save size={14} />
              <span>{pending ? "Saving..." : "Save Protection"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
