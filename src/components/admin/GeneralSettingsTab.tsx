"use client";

import React, { useState } from "react";
import { Project } from "@/lib/db";
import { updateProjectSettingsAction, deleteProjectAction } from "@/app/actions/projectActions";
import { useRouter } from "next/navigation";
import { Save, Trash2, AlertTriangle, HelpCircle } from "lucide-react";
import { PromptModal } from "./PromptModal";

interface GeneralSettingsTabProps {
  project: Project;
  setProject: (p: Project) => void;
  isSuper: boolean;
}

export default function GeneralSettingsTab({ project, setProject, isSuper }: GeneralSettingsTabProps) {
  const [name, setName] = useState(project.name);
  const [slug, setSlug] = useState(project.slug);
  const [description, setDescription] = useState(project.description);
  const [customDomain, setCustomDomain] = useState(project.customDomain || "");
  const [isPublic, setIsPublic] = useState(project.isPublic);
  const [passcode, setPasscode] = useState(project.passcode || "");
  const [historyMaxVersions, setHistoryMaxVersions] = useState(project.historyMaxVersions !== undefined ? project.historyMaxVersions : 50);
  const [historyRetentionDays, setHistoryRetentionDays] = useState(project.historyRetentionDays !== undefined ? project.historyRetentionDays : 30);
  const [webhookUrl, setWebhookUrl] = useState(project.webhookUrl || "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const [promptConfig, setPromptConfig] = useState({
    isOpen: false,
    title: "",
    description: "",
    defaultValue: "",
    onConfirm: (val: string) => {},
    onCancel: () => {}
  });
  const closePrompt = () => setPromptConfig(prev => ({ ...prev, isOpen: false }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsPending(true);

    const updatedData: Project = {
      slug,
      name,
      description,
      customDomain: customDomain.trim() ? customDomain.trim() : undefined,
      isPublic,
      passcode: !isPublic && passcode.trim() ? passcode.trim() : undefined,
      historyMaxVersions: Number(historyMaxVersions),
      historyRetentionDays: Number(historyRetentionDays),
      webhookUrl: webhookUrl.trim() ? webhookUrl.trim() : undefined,
    };

    const res = await updateProjectSettingsAction(project.slug, updatedData);
    setIsPending(false);

    if (res.success) {
      setSuccess("Settings updated successfully");
      setProject(updatedData);
      router.refresh();
    } else {
      setError(res.error || "Failed to update project settings");
    }
  };

  const handleDelete = async () => {
    if (!isSuper) return;
    
    setPromptConfig({
      isOpen: true,
      title: "Delete Project",
      description: `WARNING: This action is irreversible. It will delete all sections, articles and configurations for this project.\n\nPlease type the project slug "${project.slug}" to confirm deletion:`,
      defaultValue: "",
      onConfirm: async (confirmName: string) => {
        closePrompt();
        if (confirmName === project.slug) {
          setIsDeleting(true);
          const res = await deleteProjectAction(project.slug);
          if (res.success) {
            router.push("/admin");
            router.refresh();
          } else {
            setIsDeleting(false);
            alert(res.error || "Failed to delete project");
          }
        } else {
          alert("Verification slug did not match. Deletion cancelled.");
        }
      },
      onCancel: closePrompt
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "800px" }}>
      {/* Alert Notices */}
      {error && (
        <div style={{
          background: "rgba(244, 63, 94, 0.1)",
          border: "1px solid rgba(244, 63, 94, 0.2)",
          borderRadius: "var(--radius-md)",
          padding: "12px 16px",
          color: "#fda4af",
          fontSize: "0.9rem"
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          background: "rgba(16, 185, 129, 0.1)",
          border: "1px solid rgba(16, 185, 129, 0.2)",
          borderRadius: "var(--radius-md)",
          padding: "12px 16px",
          color: "#a7f3d0",
          fontSize: "0.9rem"
        }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 600, borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
          General Settings
        </h2>

        {/* Name */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Project Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
          />
        </div>

        {/* Slug */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>URL Slug</label>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ""))}
            disabled={isPending}
          />
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Changing the slug will change the public documentation URL path: /p/<strong>{slug}</strong>
          </span>
        </div>

        {/* Custom Domain */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            Custom Mapped Domain (Optional)
          </label>
          <input
            type="text"
            placeholder="docs.company.com"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ""))}
            disabled={isPending}
          />
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Map a unique hostname/domain to serve this project. Point the CNAME record of your domain to this server host.
          </span>
        </div>

        {/* Description */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isPending}
            rows={3}
            style={{ resize: "none" }}
          />
        </div>

        {/* Visibility */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
          <div className="flex-between">
            <div>
              <span style={{ fontSize: "0.9rem", fontWeight: 600, display: "block" }}>Public Access</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Make documentation readable by anyone on the internet.
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={isPending}
              />
              <span className="slider"></span>
            </label>
          </div>

          {!isPublic && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              background: "rgba(0,0,0,0.15)",
              padding: "16px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              animation: "fadeIn 0.2s"
            }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                Passcode Lock
              </label>
              <input
                type="text"
                placeholder="Enter access passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                disabled={isPending}
                style={{ background: "rgba(255,255,255,0.02)" }}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Readers must enter this passcode to unlock and read the documents.
              </span>
            </div>
          )}
        </div>

        {/* Revision History Retention Settings */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
            Revision History Retention
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Max Versions per Article</label>
              <input
                type="number"
                min={1}
                max={500}
                required
                value={historyMaxVersions}
                onChange={(e) => setHistoryMaxVersions(Number(e.target.value))}
                disabled={isPending}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Retention Period (Days)</label>
              <input
                type="number"
                min={1}
                max={365}
                required
                value={historyRetentionDays}
                onChange={(e) => setHistoryRetentionDays(Number(e.target.value))}
                disabled={isPending}
              />
            </div>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Control version storage limits. Older versions are pruned automatically during publication to optimize DB size.
          </span>
        </div>

        {/* Webhooks Integration */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
            Webhooks Integration
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Webhook URL</label>
            <input
              type="url"
              placeholder="https://example.com/api/webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              disabled={isPending}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              A POST request will be triggered to this URL when articles are saved or published.
            </span>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
          <button type="submit" className="btn btn-primary" disabled={isPending}>
            <Save size={16} />
            <span>{isPending ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      {isSuper && (
        <div className="card" style={{
          border: "1px solid rgba(244, 63, 94, 0.3)",
          background: "rgba(244, 63, 94, 0.03)",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}>
          <div>
            <h3 style={{
              fontFamily: "var(--font-display)",
              color: "#fda4af",
              fontSize: "1.1rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px"
            }}>
              <AlertTriangle size={18} />
              <span>Danger Zone</span>
            </h3>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Deleting this project deletes all its articles, files, and database indexes recursively.
            </span>
          </div>

          <div>
            <button
              type="button"
              onClick={handleDelete}
              className="btn btn-danger"
              disabled={isDeleting}
            >
              <Trash2 size={16} />
              <span>{isDeleting ? "Deleting..." : "Delete Project"}</span>
            </button>
          </div>
        </div>
      )}

      <PromptModal {...promptConfig} />
    </div>
  );
}
