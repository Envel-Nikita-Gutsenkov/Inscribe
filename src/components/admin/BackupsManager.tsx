"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Database,
  Plus,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Settings2,
} from "lucide-react";
import {
  getBackupsListAction,
  triggerBackupAction,
  getBackupConfigAction,
  saveBackupConfigAction,
  restoreBackupAction,
  deleteBackupAction,
} from "@/app/actions/backupActions";

interface BackupFile {
  name: string;
  size: number;
  mtime: number;
}

interface BackupConfig {
  autoBackup: boolean;
  maxBackups: number;
  scheduleInterval: "daily" | "weekly" | "manual";
}

export default function BackupsManager() {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Settings state
  const [autoBackup, setAutoBackup] = useState(true);
  const [maxBackups, setMaxBackups] = useState(5);
  const [scheduleInterval, setScheduleInterval] = useState<"daily" | "weekly" | "manual">("daily");
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBackups = async () => {
    setLoading(true);
    const res = await getBackupsListAction();
    if (res.success) {
      setBackups(res.backups || []);
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to load backups" });
    }
    setLoading(false);
  };

  const fetchConfig = async () => {
    const res = await getBackupConfigAction();
    if (res.success && res.config) {
      setAutoBackup(res.config.autoBackup);
      setMaxBackups(res.config.maxBackups);
      setScheduleInterval(res.config.scheduleInterval);
    }
  };

  useEffect(() => {
    fetchBackups();
    fetchConfig();
  }, []);

  const handleBackupNow = async () => {
    setActionPending(true);
    setStatusMsg(null);
    const res = await triggerBackupAction();
    if (res.success) {
      setStatusMsg({ type: "success", text: `Database backup created successfully: ${res.filename}` });
      fetchBackups();
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to create backup" });
    }
    setActionPending(false);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setStatusMsg(null);
    const res = await saveBackupConfigAction({ autoBackup, maxBackups, scheduleInterval });
    if (res.success) {
      setStatusMsg({ type: "success", text: "Backup settings updated successfully" });
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to save settings" });
    }
    setSettingsSaving(false);
  };

  const handleRestore = async (filename: string) => {
    if (!confirm(`Вы действительно хотите восстановить базу данных из копии "${filename}"?\n\nТекущие данные будут перезаписаны.`)) {
      return;
    }
    setActionPending(true);
    setStatusMsg(null);
    const res = await restoreBackupAction(filename);
    if (res.success) {
      setStatusMsg({ type: "success", text: `База данных успешно восстановлена из резервной копии: ${filename}` });
      fetchBackups();
    } else {
      setStatusMsg({ type: "error", text: res.error || "Ошибка восстановления базы данных" });
    }
    setActionPending(false);
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Удалить файл резервной копии "${filename}"?`)) {
      return;
    }
    setActionPending(true);
    setStatusMsg(null);
    const res = await deleteBackupAction(filename);
    if (res.success) {
      setStatusMsg({ type: "success", text: "Резервная копия удалена" });
      fetchBackups();
    } else {
      setStatusMsg({ type: "error", text: res.error || "Ошибка удаления файла" });
    }
    setActionPending(false);
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatusMsg(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/backups/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: "success", text: `Резервная копия успешно загружена: ${data.filename}` });
        fetchBackups();
      } else {
        setStatusMsg({ type: "error", text: data.error || "Ошибка проверки/загрузки файла" });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Ошибка отправки файла" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: "40px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", fontWeight: 700, letterSpacing: "-0.03em" }}>
            Резервные копии БД
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Управление копиями базы данных, восстановление, скачивание и автоматические бэкапы
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".sqlite"
            style={{ display: "none" }}
            onChange={handleUploadFile}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || actionPending}
            className="btn"
            style={{ padding: "10px 20px" }}
          >
            {uploading ? (
              <>
                <RefreshCw className="spin" size={16} />
                <span>Загрузка...</span>
              </>
            ) : (
              <>
                <Upload size={16} />
                <span>Загрузить бэкап</span>
              </>
            )}
          </button>

          <button
            onClick={handleBackupNow}
            disabled={actionPending || uploading}
            className="btn btn-primary"
            style={{ padding: "10px 20px" }}
          >
            {actionPending ? (
              <>
                <RefreshCw className="spin" size={16} />
                <span>Создание бэкапа...</span>
              </>
            ) : (
              <>
                <Plus size={16} />
                <span>Создать бэкап</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Alert */}
      {statusMsg && (
        <div
          className={`card`}
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

      {/* Two Column Layout */}
      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
        
        {/* Left: Backups Table */}
        <div style={{ flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <RefreshCw className="spin" size={32} style={{ color: "var(--text-muted)", marginBottom: "12px" }} />
              <p style={{ color: "var(--text-secondary)" }}>Загрузка файлов резервных копий...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "60px 40px" }}>
              <div style={{
                background: "rgba(139, 92, 246, 0.08)",
                borderRadius: "50%",
                width: "80px",
                height: "80px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px auto",
                color: "var(--accent-purple)"
              }}>
                <Database size={40} />
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", marginBottom: "8px" }}>Копии не найдены</h2>
              <p style={{ color: "var(--text-secondary)", maxWidth: "450px", margin: "0 auto 24px auto", fontSize: "0.95rem" }}>
                Автоматическое резервное копирование запускается при изменении статей. Вы также можете запустить его вручную.
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding: "0", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", background: "rgba(255, 255, 255, 0.01)" }}>
                    <th style={{ padding: "16px 24px", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>Файл копии</th>
                    <th style={{ padding: "16px 24px", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>Размер</th>
                    <th style={{ padding: "16px 24px", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>Дата создания</th>
                    <th style={{ padding: "16px 24px", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em", textAlign: "right" }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup) => (
                    <tr key={backup.name} style={{ borderBottom: "1px solid var(--border-color)", transition: "background 0.2s" }} className="table-row-hover">
                      <td style={{ padding: "14px 24px", fontSize: "0.9rem", fontWeight: 600 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <FileSpreadsheet size={16} style={{ color: "var(--text-muted)" }} />
                          <code>{backup.name}</code>
                        </div>
                      </td>
                      <td style={{ padding: "14px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        {formatSize(backup.size)}
                      </td>
                      <td style={{ padding: "14px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        {new Date(backup.mtime).toLocaleString()}
                      </td>
                      <td style={{ padding: "14px 24px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "8px" }}>
                          <a
                            href={`/api/backups/download?file=${backup.name}`}
                            className="btn"
                            style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                            title="Скачать копию"
                          >
                            <Download size={14} />
                          </a>
                          <button
                            onClick={() => handleRestore(backup.name)}
                            disabled={actionPending || uploading}
                            className="btn"
                            style={{ padding: "6px 12px", fontSize: "0.8rem", color: "var(--accent-cyan)", borderColor: "rgba(96, 165, 250, 0.3)" }}
                            title="Восстановить БД из этой копии"
                          >
                            Восстановить
                          </button>
                          <button
                            onClick={() => handleDelete(backup.name)}
                            disabled={actionPending || uploading}
                            className="btn btn-danger"
                            style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                            title="Удалить копию"
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
          )}
        </div>

        {/* Right: Settings panel */}
        <div style={{ width: "320px", flexShrink: 0 }}>
          <div className="card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <Settings2 size={18} style={{ color: "var(--accent-purple)" }} />
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", fontWeight: 600 }}>
                Настройки резервирования
              </h3>
            </div>

            <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Auto Backup Toggle */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Авто-резервирование</span>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={autoBackup}
                      onChange={(e) => setAutoBackup(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>
                    {autoBackup ? "Включено" : "Выключено"}
                  </span>
                </div>
              </div>

              {/* Retention limit (Max backups) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Хранить последних копий
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={maxBackups}
                  onChange={(e) => setMaxBackups(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: "100%" }}
                  disabled={!autoBackup}
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Старые бэкапы будут автоматически перезаписываться
                </span>
              </div>

              {/* Interval Schedule */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Периодичность копий
                </label>
                <select
                  value={scheduleInterval}
                  onChange={(e) => setScheduleInterval(e.target.value as "daily" | "weekly" | "manual")}
                  disabled={!autoBackup}
                  style={{ width: "100%" }}
                >
                  <option value="daily">Каждый день (Daily)</option>
                  <option value="weekly">Каждую неделю (Weekly)</option>
                  <option value="manual">Только вручную (Manual)</option>
                </select>
              </div>

              {/* Save button */}
              <button
                type="submit"
                disabled={settingsSaving}
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}
              >
                {settingsSaving ? (
                  <>
                    <RefreshCw className="spin" size={14} />
                    <span>Сохранение...</span>
                  </>
                ) : (
                  <span>Сохранить настройки</span>
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
