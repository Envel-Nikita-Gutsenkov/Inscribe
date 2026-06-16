"use client";

import React, { useState } from "react";
import { User, Project } from "@/lib/db";
import { Plus, Trash2, Edit, X, KeyRound } from "lucide-react";
import { createUserAction, updateUserAction, deleteUserAction, regenerateUserRecoveryCodesAction } from "@/app/actions/userActions";
import { useRouter } from "next/navigation";

interface UserManagerProps {
  initialUsers: User[];
  projects: Project[];
}

export default function UserManager({ initialUsers, projects }: UserManagerProps) {
  const [users] = useState(initialUsers);
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"superadmin" | "editor">("editor");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [oneTimeCodeResult, setOneTimeCodeResult] = useState<string | null>(null);
  const [reset2FA, setReset2FA] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [regeneratedCodes, setRegeneratedCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit user state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const router = useRouter();

  const handleRegenerateCodes = async (userId: string) => {
    if (confirm("Are you sure you want to regenerate recovery codes for this user? This will invalidate all their current recovery codes.")) {
      setError(null);
      setIsPending(true);
      const res = await regenerateUserRecoveryCodesAction(userId);
      setIsPending(false);
      if (res.success && res.recoveryCodes) {
        setRegeneratedCodes(res.recoveryCodes);
      } else {
        alert(res.error || "Failed to regenerate recovery codes");
      }
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const res = await createUserAction(username, role, selectedProjects);

    if (res.success) {
      setUsername("");
      setRole("editor");
      setSelectedProjects([]);
      setIsOpen(false);
      setIsPending(false);
      if (res.oneTimeCode) {
        setOneTimeCodeResult(res.oneTimeCode);
      } else {
        router.refresh();
        window.location.reload();
      }
    } else {
      setError(res.error || "Failed to create user");
      setIsPending(false);
    }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError(null);
    setIsPending(true);

    const res = await updateUserAction(editingUser.id, editingUser.username, editingUser.role, editingUser.projects, reset2FA);

    if (res.success) {
      setEditingUser(null);
      setReset2FA(false);
      setIsPending(false);
      if (res.oneTimeCode) {
        setOneTimeCodeResult(res.oneTimeCode);
      } else {
        router.refresh();
        window.location.reload();
      }
    } else {
      setError(res.error || "Failed to update user");
      setIsPending(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      const res = await deleteUserAction(id);
      if (res.success) {
        router.refresh();
        window.location.reload();
      } else {
        alert(res.error || "Failed to delete user");
      }
    }
  };

  const toggleProject = (slug: string, isEditing = false) => {
    if (isEditing && editingUser) {
      const projs = editingUser.projects.includes(slug)
        ? editingUser.projects.filter((p) => p !== slug)
        : [...editingUser.projects, slug];
      setEditingUser({ ...editingUser, projects: projs });
    } else {
      setSelectedProjects((prev) =>
        prev.includes(slug) ? prev.filter((p) => p !== slug) : [...prev, slug]
      );
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}>
        <button onClick={() => { setIsOpen(true); setError(null); }} className="btn btn-primary">
          <Plus size={16} />
          <span>Add User</span>
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-color)", background: "rgba(255,255,255,0.02)" }}>
              <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Username</th>
              <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Role</th>
              <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Project Access</th>
              <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid var(--border-color)", transition: "background 0.2s" }}>
                <td style={{ padding: "16px 24px", fontWeight: 600 }}>{u.username}</td>
                <td style={{ padding: "16px 24px" }}>
                  <span className={`badge ${u.role === "superadmin" ? "badge-success" : "badge-secondary"}`}>
                    {u.role === "superadmin" ? "Super Admin" : "Editor"}
                  </span>
                </td>
                <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)", maxWidth: "300px" }}>
                  {u.role === "superadmin" ? (
                    <strong style={{ color: "var(--accent-cyan)" }}>All Projects (Global)</strong>
                  ) : u.projects.length === 0 ? (
                    <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No projects assigned</span>
                  ) : (
                    u.projects.map((slug) => {
                      const proj = projects.find((p) => p.slug === slug);
                      return proj ? proj.name : slug;
                    }).join(", ")
                  )}
                </td>
                <td style={{ padding: "16px 24px", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    {u.totpSecret !== "PENDING" && (
                      <button
                        title="Regenerate Recovery Codes"
                        onClick={() => handleRegenerateCodes(u.id)}
                        className="btn"
                        style={{ padding: "8px", color: "var(--accent-purple)", borderColor: "rgba(139, 92, 246, 0.2)" }}
                      >
                        <KeyRound size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => { setEditingUser(u); setError(null); }}
                      className="btn"
                      style={{ padding: "8px" }}
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="btn btn-danger"
                      style={{ padding: "8px" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE MODAL */}
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
          alignItems: "flex-start",
          justifyContent: "center",
          zIndex: 100,
          padding: "20px",
          paddingTop: "10vh",
          overflowY: "auto"
        }}>
          <div className="card" style={{ maxWidth: "520px", width: "100%", position: "relative", boxShadow: "var(--shadow-glow)" }}>
            <button
              onClick={() => setIsOpen(false)}
              style={{ position: "absolute", top: "20px", right: "20px", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", marginBottom: "6px" }}>Add User Account</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px" }}>
              Configure a new administrator or editor account. TOTP key generation is required.
            </p>

            {error && (
              <div style={{ background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.2)", borderRadius: "var(--radius-md)", padding: "10px 14px", color: "#fda4af", fontSize: "0.85rem", marginBottom: "20px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Username</label>
                <input
                  type="text"
                  required
                  placeholder="editor_john"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                  disabled={isPending}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value as "superadmin" | "editor")} disabled={isPending}>
                  <option value="editor">Editor (Access to assigned projects)</option>
                  <option value="superadmin">Super Admin (Access to all system settings)</option>
                </select>
              </div>

              {/* Project select (Only relevant for Editors) */}
              {role === "editor" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Assigned Projects</label>
                  <div style={{
                    maxHeight: "130px",
                    overflowY: "auto",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    padding: "10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px"
                  }}>
                    {projects.map((p) => (
                      <label key={p.slug} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={selectedProjects.includes(p.slug)}
                          onChange={() => toggleProject(p.slug)}
                        />
                        <span>{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <button type="button" onClick={() => setIsOpen(false)} className="btn" style={{ flex: 1, justifyContent: "center" }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={isPending}>
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingUser && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          zIndex: 100,
          padding: "20px",
          paddingTop: "10vh",
          overflowY: "auto"
        }}>
          <div className="card" style={{ maxWidth: "520px", width: "100%", position: "relative", boxShadow: "var(--shadow-glow)" }}>
            <button
              onClick={() => setEditingUser(null)}
              style={{ position: "absolute", top: "20px", right: "20px", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", marginBottom: "6px" }}>Edit User Account</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px" }}>
              Modify role and project access. Tick reset 2FA to generate a new one-time login code.
            </p>

            {error && (
              <div style={{ background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.2)", borderRadius: "var(--radius-md)", padding: "10px 14px", color: "#fda4af", fontSize: "0.85rem", marginBottom: "20px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleEditUserSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Username</label>
                <input
                  type="text"
                  required
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
                  disabled={isPending}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as "superadmin" | "editor" })}
                  disabled={isPending}
                >
                  <option value="editor">Editor (Access to assigned projects)</option>
                  <option value="superadmin">Super Admin (Access to all system settings)</option>
                </select>
              </div>

              {/* Reset 2FA Checkbox */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "10px 0" }}>
                <input
                  type="checkbox"
                  id="reset2fa-chk"
                  checked={reset2FA}
                  onChange={(e) => setReset2FA(e.target.checked)}
                  disabled={isPending}
                />
                <label htmlFor="reset2fa-chk" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                  Reset 2FA & Generate New One-Time Code
                </label>
              </div>

              {/* Project select (Only relevant for Editors) */}
              {editingUser.role === "editor" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Assigned Projects</label>
                  <div style={{
                    maxHeight: "130px",
                    overflowY: "auto",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    padding: "10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px"
                  }}>
                    {projects.map((p) => (
                      <label key={p.slug} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={editingUser.projects.includes(p.slug)}
                          onChange={() => toggleProject(p.slug, true)}
                        />
                        <span>{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <button type="button" onClick={() => setEditingUser(null)} className="btn" style={{ flex: 1, justifyContent: "center" }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={isPending}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ONE-TIME CODE SUCCESS MODAL */}
      {oneTimeCodeResult && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 110,
          padding: "20px"
        }}>
          <div className="card" style={{ maxWidth: "460px", width: "100%", textAlign: "center", padding: "32px", boxShadow: "var(--shadow-glow)" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--accent-cyan)", marginBottom: "12px" }}>
              One-Time Login Code Generated
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px" }}>
              Provide this code to the user. They will be prompted to set up their multi-factor authentication (2FA) when they log in for the first time.
            </p>
            
            <div style={{
              background: "var(--bg-input)",
              padding: "16px",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              fontFamily: "monospace",
              fontSize: "1.8rem",
              fontWeight: "bold",
              color: "var(--accent-cyan)",
              marginBottom: "24px",
              letterSpacing: "0.15em",
              userSelect: "all"
            }}>
              {oneTimeCodeResult}
            </div>

            <button
              onClick={() => {
                setOneTimeCodeResult(null);
                router.refresh();
                window.location.reload();
              }}
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* REGENERATED RECOVERY CODES SUCCESS MODAL */}
      {regeneratedCodes && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 110,
          padding: "20px"
        }}>
          <div className="card" style={{ maxWidth: "480px", width: "100%", padding: "36px", boxShadow: "var(--shadow-glow)" }}>
            <h3 style={{ fontSize: "1.4rem", fontWeight: 700, textAlign: "center", marginBottom: "8px", color: "var(--accent-cyan)" }}>
              New Recovery Codes Generated
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", textAlign: "center", marginBottom: "24px" }}>
              Copy these emergency codes and provide them to the user. They will not be shown again!
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              background: "var(--bg-input)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "20px",
              fontFamily: "monospace",
              fontSize: "1.1rem",
              color: "var(--accent-cyan)",
              marginBottom: "24px",
              fontWeight: "bold"
            }}>
              {regeneratedCodes.map((code) => (
                <div key={code} style={{ padding: "4px 0", userSelect: "all", textAlign: "center" }}>
                  {code}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(regeneratedCodes.join("\n"));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="btn"
                style={{ justifyContent: "center", width: "100%", gap: "8px", border: "1px solid var(--border-color)" }}
              >
                {copied ? (
                  <span>Copied to Clipboard!</span>
                ) : (
                  <span>Copy Recovery Codes</span>
                )}
              </button>
              
              <button
                onClick={() => {
                  setRegeneratedCodes(null);
                  router.refresh();
                  window.location.reload();
                }}
                className="btn btn-primary"
                style={{ justifyContent: "center", width: "100%" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
