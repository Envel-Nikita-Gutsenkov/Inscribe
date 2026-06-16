// Shared user preferences logic — shared between UserPreferencesPanel and ReaderClientShell.
// Pure functions: no React, no side effects on import.

export interface UserPrefs {
  theme: "dark" | "light" | "system";
  fontSize: number;
  zoom: number;
  editorFont: string;
  reducedMotion: boolean;
  compactMode: boolean;
  highlightColor: string;
}

export const STORAGE_KEY = "inscribe_user_prefs";

export const DEFAULT_PREFS: UserPrefs = {
  theme: "dark",
  fontSize: 15,
  zoom: 100,
  editorFont: "noto",
  reducedMotion: false,
  compactMode: false,
  highlightColor: "#3b82f6",
};

export function loadPrefs(): UserPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const prefs = raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS };
    
    // Sync with legacy theme key if present
    const legacyTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    if (legacyTheme && legacyTheme !== prefs.theme) {
      prefs.theme = legacyTheme;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    }
    return prefs;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: UserPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    // Keep legacy theme key in sync
    const resolved =
      prefs.theme === "system"
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : prefs.theme;
    localStorage.setItem("theme", resolved);
  } catch {}
}

export function applyPrefs(prefs: UserPrefs) {
  const root = document.documentElement;

  const resolved =
    prefs.theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : prefs.theme;
  root.setAttribute("data-theme", resolved);
  // Keep legacy ThemeToggle key in sync
  localStorage.setItem("theme", resolved);

  root.style.setProperty("--user-font-size", `${prefs.fontSize}px`);

  document.body.style.zoom = `${prefs.zoom}%`;

  const fontMap: Record<string, string> = {
    sans:  "'Plus Jakarta Sans', system-ui, sans-serif",
    noto:  "'Noto Sans', system-ui, sans-serif",
    mono:  "'Courier New', 'Cascadia Code', monospace",
    serif: "Georgia, 'Times New Roman', serif",
  };
  root.style.setProperty("--user-editor-font", fontMap[prefs.editorFont]);

  if (prefs.reducedMotion) {
    root.setAttribute("data-reduced-motion", "true");
  } else {
    root.removeAttribute("data-reduced-motion");
  }

  if (prefs.compactMode) {
    root.setAttribute("data-compact", "true");
  } else {
    root.removeAttribute("data-compact");
  }

  root.style.setProperty("--accent-purple", prefs.highlightColor);
  root.style.setProperty("--accent-purple-glow", prefs.highlightColor + "33");
}

/** Returns the last-read article slug for a given project (if any). */
export function getReadingProgress(projectSlug: string): string | null {
  try {
    return localStorage.getItem(`inscribe_progress_${projectSlug}`);
  } catch {
    return null;
  }
}
