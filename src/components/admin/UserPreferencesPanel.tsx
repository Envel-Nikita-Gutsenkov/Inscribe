"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Sun, Moon, Monitor, Type, ZoomIn, ZoomOut,
  RotateCcw, Check, Palette, Layout, Eye, Shield, X
} from "lucide-react";
import {
  UserPrefs, DEFAULT_PREFS, loadPrefs, savePrefs, applyPrefs,
} from "@/lib/userPrefs";

const ACCENT_PRESETS: { label: string; value: string }[] = [
  { label: "Blue",    value: "#3b82f6" },
  { label: "Purple",  value: "#8b5cf6" },
  { label: "Emerald", value: "#10b981" },
  { label: "Rose",    value: "#f43f5e" },
  { label: "Amber",   value: "#f59e0b" },
  { label: "Cyan",    value: "#06b6d4" },
];

export function useUserPrefs() {
  const [prefs, setPrefsState] = useState<UserPrefs>(() => {
    if (typeof window !== "undefined") {
      return loadPrefs();
    }
    return DEFAULT_PREFS;
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    applyPrefs(prefs);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, [prefs]);

  const setPrefs = useCallback((next: Partial<UserPrefs>) => {
    setPrefsState((prev) => {
      const merged = { ...prev, ...next };
      savePrefs(merged);
      applyPrefs(merged);
      return merged;
    });
  }, []);

  const resetPrefs = useCallback(() => {
    localStorage.removeItem("inscribe_user_prefs");
    setPrefsState(DEFAULT_PREFS);
    applyPrefs(DEFAULT_PREFS);
  }, []);

  return { prefs, setPrefs, resetPrefs, mounted };
}

interface Props {
  onClose?: () => void;
  showAdminLink?: boolean;
}

export default function UserPreferencesPanel({ onClose, showAdminLink = false }: Props) {
  const { prefs, setPrefs, resetPrefs, mounted } = useUserPrefs();
  const [saved, setSaved] = useState(false);

  function handleChange<K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) {
    setPrefs({ [key]: value });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (!mounted) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "20px",
          width: "460px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "24px 28px 20px",
          borderBottom: "1px solid var(--border-color)",
          position: "sticky", top: 0,
          background: "var(--bg-secondary)",
          borderRadius: "20px 20px 0 0",
          zIndex: 1,
        }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700 }}>
              Preferences
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {saved && (
              <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.78rem", color: "var(--accent-emerald)" }}>
                <Check size={12} /> Saved
              </span>
            )}
            <button onClick={onClose} className="btn"
              style={{ padding: "6px", borderRadius: "8px", background: "transparent", border: "1px solid transparent" }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "28px" }}>

          <Section icon={<Palette size={14} />} title="Appearance">
            <SettingRow label="Theme">
              <SegmentedControl
                options={[
                  { value: "dark",   label: "Dark",   icon: <Moon size={13} /> },
                  { value: "light",  label: "Light",  icon: <Sun size={13} /> },
                  { value: "system", label: "System", icon: <Monitor size={13} /> },
                ]}
                value={prefs.theme}
                onChange={(v) => handleChange("theme", v as UserPrefs["theme"])}
              />
            </SettingRow>

            <SettingRow label="Accent Color">
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {ACCENT_PRESETS.map((p) => (
                  <button key={p.value} title={p.label}
                    onClick={() => handleChange("highlightColor", p.value)}
                    style={{
                      width: "26px", height: "26px", borderRadius: "50%",
                      background: p.value,
                      border: prefs.highlightColor === p.value
                        ? "3px solid var(--text-primary)" : "2px solid transparent",
                      cursor: "pointer",
                      transform: prefs.highlightColor === p.value ? "scale(1.25)" : "scale(1)",
                      transition: "transform 0.15s",
                    }}
                  />
                ))}
              </div>
            </SettingRow>
          </Section>

          <Section icon={<Type size={14} />} title="Typography">
            <SettingRow label={`Font Size · ${prefs.fontSize}px`}>
              <SliderRow min={12} max={20} step={1} value={prefs.fontSize}
                onChange={(v) => handleChange("fontSize", v)} />
            </SettingRow>

            <SettingRow label="Editor Font">
              <SegmentedControl
                options={[
                  { value: "sans",  label: "Sans" },
                  { value: "mono",  label: "Mono" },
                  { value: "serif", label: "Serif" },
                ]}
                value={prefs.editorFont}
                onChange={(v) => handleChange("editorFont", v as UserPrefs["editorFont"])}
              />
            </SettingRow>
          </Section>

          <Section icon={<Layout size={14} />} title="Layout">
            <SettingRow label={`Interface Scale · ${prefs.zoom}%`}>
              <SliderRow min={80} max={130} step={5} value={prefs.zoom}
                onChange={(v) => handleChange("zoom", v)} />
            </SettingRow>

            <SettingRow label="Compact Mode">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Reduce padding and spacing</span>
                <Toggle checked={prefs.compactMode} onChange={(v) => handleChange("compactMode", v)} />
              </div>
            </SettingRow>
          </Section>

          <Section icon={<Eye size={14} />} title="Accessibility">
            <SettingRow label="Reduce Motion">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Disable animations</span>
                <Toggle checked={prefs.reducedMotion} onChange={(v) => handleChange("reducedMotion", v)} />
              </div>
            </SettingRow>
          </Section>

          {showAdminLink && (
            <Link
              href="/admin"
              onClick={onClose}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--text-muted)",
                fontSize: "0.8rem",
                textDecoration: "none",
                transition: "all 0.2s ease",
                marginTop: "-8px",
                padding: "6px 10px",
                borderRadius: "6px",
                alignSelf: "flex-start",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--accent-purple)";
                e.currentTarget.style.background = "rgba(139,92,246,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Shield size={13} />
              Administration Panel
            </Link>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 28px",
          borderTop: "1px solid var(--border-color)",
          borderRadius: "0 0 20px 20px",
        }}>
          <button className="btn" onClick={resetPrefs}
            style={{ fontSize: "0.8rem", gap: "6px", color: "var(--text-muted)", background: "transparent", border: "1px solid transparent" }}>
            <RotateCcw size={12} /> Reset defaults
          </button>
          <button className="btn btn-primary" onClick={onClose}
            style={{ fontSize: "0.85rem", padding: "8px 20px" }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "7px",
        color: "var(--text-muted)", fontSize: "0.72rem",
        textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700,
      }}>
        {icon}{title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <label style={{ fontSize: "0.83rem", color: "var(--text-secondary)", fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SliderRow({ min, max, step, value, onChange }: {
  min: number; max: number; step: number; value: number; onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <button className="btn" style={{ padding: "5px 9px", flexShrink: 0 }}
        onClick={() => onChange(Math.max(min, value - step))}>
        <ZoomOut size={13} />
      </button>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: "var(--accent-purple)" }} />
      <button className="btn" style={{ padding: "5px 9px", flexShrink: 0 }}
        onClick={() => onChange(Math.min(max, value + step))}>
        <ZoomIn size={13} />
      </button>
    </div>
  );
}

function SegmentedControl({ options, value, onChange }: {
  options: { value: string; label: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{
      display: "flex", background: "rgba(0,0,0,0.2)",
      borderRadius: "10px", padding: "3px",
      border: "1px solid var(--border-color)", gap: "2px",
    }}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          style={{
            flex: 1, padding: "6px 8px", borderRadius: "7px", border: "none",
            background: value === o.value ? "var(--accent-purple)" : "transparent",
            color: value === o.value ? "white" : "var(--text-secondary)",
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: "5px",
            fontSize: "0.8rem", fontWeight: 500, transition: "all 0.15s ease",
          }}
        >
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)}
      style={{
        width: "42px", height: "23px", borderRadius: "12px",
        background: checked ? "var(--accent-purple)" : "var(--border-color)",
        position: "relative", cursor: "pointer",
        transition: "background 0.2s ease", flexShrink: 0,
      }}>
      <div style={{
        position: "absolute", top: "3px",
        left: checked ? "21px" : "3px",
        width: "17px", height: "17px", borderRadius: "50%",
        background: "white", transition: "left 0.2s ease",
        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
      }} />
    </div>
  );
}
