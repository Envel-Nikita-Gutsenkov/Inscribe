"use client";

import React, { useState, useEffect } from "react";
import { Cpu, Database, HardDrive, RefreshCw, Layers, CheckCircle, AlertCircle, Save } from "lucide-react";
import { getSystemStatsAction, optimizeDatabaseAction, clearAllCachesAction, getPortalSettingsAction, updatePortalSettingsAction } from "@/app/actions/systemActions";

export default function SystemManager() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [portalTitle, setPortalTitle] = useState("Welcome to Inscribe");
  const [portalDescription, setPortalDescription] = useState("Search for articles or select a documentation workspace below to get started.");
  const [portalPending, setPortalPending] = useState(false);

  const fetchStats = async () => {
    const res = await getSystemStatsAction();
    if (res.success) {
      setStats(res);
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to load system stats" });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();

    getPortalSettingsAction().then((res) => {
      if (res.success) {
        if (res.title) setPortalTitle(res.title);
        if (res.description) setPortalDescription(res.description);
      }
    });

    // Poll every 10 seconds for real-time memory usage updates
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSavePortalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setPortalPending(true);
    setStatusMsg(null);
    const res = await updatePortalSettingsAction(portalTitle, portalDescription);
    if (res.success) {
      setStatusMsg({ type: "success", text: "Portal landing page settings saved successfully." });
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to update portal settings" });
    }
    setPortalPending(false);
  };

  const handleOptimize = async () => {
    setActionPending(true);
    setStatusMsg(null);
    const res = await optimizeDatabaseAction();
    if (res.success) {
      setStatusMsg({ type: "success", text: "Database maintenance completed successfully. Reclaimed unused storage and optimized SQLite query planner." });
      fetchStats();
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to optimize database" });
    }
    setActionPending(false);
  };

  const handleClearCaches = async () => {
    setActionPending(true);
    setStatusMsg(null);
    const res = await clearAllCachesAction();
    if (res.success) {
      setStatusMsg({ type: "success", text: "All LRU caches cleared successfully." });
      fetchStats();
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to clear caches" });
    }
    setActionPending(false);
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return "0s";
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(" ");
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "40px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", fontWeight: 700, letterSpacing: "-0.03em" }}>
          System Diagnostics
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Monitor system resource usage, storage efficiency, in-memory cache allocations, and perform database maintenance.
        </p>
      </div>

      {/* Status Alert */}
      {statusMsg && (
        <div
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "16px 20px",
            marginBottom: "24px",
            borderLeft: `4px solid ${statusMsg.type === "success" ? "var(--accent-cyan)" : "var(--accent-rose)"}`,
            background: "rgba(255, 255, 255, 0.01)"
          }}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle size={20} style={{ color: "var(--accent-cyan)" }} />
          ) : (
            <AlertCircle size={20} style={{ color: "var(--accent-rose)" }} />
          )}
          <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{statusMsg.text}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <RefreshCw className="spin" size={32} style={{ color: "var(--text-muted)", marginBottom: "12px" }} />
          <p style={{ color: "var(--text-secondary)" }}>Fetching system metrics...</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {/* Stats Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            {/* DB Size */}
            <div className="card" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{ background: "rgba(6, 182, 212, 0.1)", borderRadius: "12px", padding: "12px", color: "var(--accent-cyan)" }}>
                <Database size={24} />
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Database File</span>
                <h2 style={{ fontSize: "1.8rem", fontWeight: 700, margin: "4px 0 0 0" }}>{formatSize(stats?.dbSize)}</h2>
              </div>
            </div>

            {/* Backups Size */}
            <div className="card" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{ background: "rgba(139, 92, 246, 0.1)", borderRadius: "12px", padding: "12px", color: "var(--accent-purple)" }}>
                <HardDrive size={24} />
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Backups & Snapshots</span>
                <h2 style={{ fontSize: "1.8rem", fontWeight: 700, margin: "4px 0 0 0" }}>{formatSize(stats?.backupsSize)}</h2>
              </div>
            </div>

            {/* RAM RSS */}
            <div className="card" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{ background: "rgba(236, 72, 153, 0.1)", borderRadius: "12px", padding: "12px", color: "var(--accent-rose)" }}>
                <Cpu size={24} />
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Node Process RAM</span>
                <h2 style={{ fontSize: "1.8rem", fontWeight: 700, margin: "4px 0 0 0" }}>{formatSize(stats?.currentRss)}</h2>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Peak Observed: {formatSize(stats?.peakRss)}</span>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "32px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              {/* Cache status */}
              <div className="card">
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Layers size={18} style={{ color: "var(--accent-cyan)" }} />
                  <span>In-Memory LRU Cache Status</span>
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={{ padding: "16px", background: "rgba(255,255,255,0.01)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Articles Content Cache</span>
                      <strong style={{ color: "var(--accent-cyan)" }}>{stats?.cacheStats?.articles} / 1000</strong>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Cached raw article reader contents.</span>
                  </div>

                  <div style={{ padding: "16px", background: "rgba(255,255,255,0.01)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Table of Contents Cache</span>
                      <strong style={{ color: "var(--accent-cyan)" }}>{stats?.cacheStats?.tocs} / 100</strong>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Cached navigation outlines.</span>
                  </div>

                  <div style={{ padding: "16px", background: "rgba(255,255,255,0.01)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Projects Config Cache</span>
                      <strong style={{ color: "var(--accent-cyan)" }}>{stats?.cacheStats?.projects} / 200</strong>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Cached project metadata and settings.</span>
                  </div>

                  <div style={{ padding: "16px", background: "rgba(255,255,255,0.01)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Custom Domains Cache</span>
                      <strong style={{ color: "var(--accent-cyan)" }}>{stats?.cacheStats?.domains} / 200</strong>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Cached hostname-to-project mappings.</span>
                  </div>
                </div>
              </div>

              {/* Portal Landing Configuration */}
              <form onSubmit={handleSavePortalSettings} className="card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 600, borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", margin: 0 }}>
                  Portal Customization
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Portal Title</label>
                  <input
                    type="text"
                    required
                    value={portalTitle}
                    onChange={(e) => setPortalTitle(e.target.value)}
                    disabled={portalPending}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Portal Description</label>
                  <textarea
                    required
                    value={portalDescription}
                    onChange={(e) => setPortalDescription(e.target.value)}
                    disabled={portalPending}
                    rows={3}
                    style={{ resize: "none" }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" className="btn btn-primary" disabled={portalPending}>
                    <Save size={16} />
                    <span>{portalPending ? "Saving..." : "Save Portal Settings"}</span>
                  </button>
                </div>
              </form>

              {/* Maintenance Tools */}
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 600, borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", margin: 0 }}>
                  System Operations
                </h2>
                <div style={{ display: "flex", gap: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: "0 0 6px 0", fontSize: "0.95rem" }}>Optimize Database Storage</h4>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                      Run vacuum cleaning to rebuild database files and optimize index structures to lower disk consumption.
                    </p>
                    <button
                      onClick={handleOptimize}
                      disabled={actionPending}
                      className="btn btn-primary"
                      style={{ marginTop: "12px", padding: "8px 16px" }}
                    >
                      Optimize Database
                    </button>
                  </div>

                  <div style={{ flex: 1, borderLeft: "1px solid var(--border-color)", paddingLeft: "16px" }}>
                    <h4 style={{ margin: "0 0 6px 0", fontSize: "0.95rem" }}>Clear System Cache</h4>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                      Evict all in-memory caches (Articles, TOC, Domains). Forces Next.js to reload data directly from SQLite.
                    </p>
                    <button
                      onClick={handleClearCaches}
                      disabled={actionPending}
                      className="btn"
                      style={{ marginTop: "12px", padding: "8px 16px" }}
                    >
                      Clear All Caches
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Server Specs */}
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "20px", height: "fit-content" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 600, borderBottom: "1px solid var(--border-color)", paddingBottom: "10px", margin: 0 }}>
                Server Platform
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "0.85rem" }}>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block" }}>OS Version</span>
                  <strong>{stats?.osPlatform}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block" }}>Node Version</span>
                  <strong>{stats?.nodeVersion}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block" }}>Server Uptime</span>
                  <strong>{formatUptime(stats?.uptime)}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block" }}>System Memory (RAM)</span>
                  <strong>{formatSize(stats?.osTotalMem - stats?.osFreeMem)} / {formatSize(stats?.osTotalMem)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Build Info */}
          <div style={{
            marginTop: "32px",
            borderTop: "1px solid var(--border-color)",
            paddingTop: "16px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            width: "100%"
          }}>
            <span>Build Date: {stats?.buildDate ? new Date(stats.buildDate).toLocaleString() : "Unknown"}</span>
            <span>Version: {stats?.buildHash && stats.buildHash !== "unknown" ? stats.buildHash.slice(-6) : "Unknown"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
