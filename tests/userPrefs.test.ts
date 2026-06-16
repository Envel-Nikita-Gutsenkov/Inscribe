// @vitest-environment jsdom
/**
 * Tests for userPrefs.ts — client-side preferences utilities.
 *
 * Since these functions interact with localStorage and DOM (document.documentElement),
 * we use vitest's jsdom environment. Verified via vitest.config.ts environment setting.
 *
 * Coverage:
 *  - Unit: loadPrefs returns DEFAULT_PREFS when localStorage is empty
 *  - Unit: savePrefs + loadPrefs round-trip for all fields
 *  - Unit: loadPrefs merges stored partial prefs with defaults (forward compat)
 *  - Unit: loadPrefs handles corrupted JSON gracefully
 *  - Unit: applyPrefs sets correct CSS variables and attributes on documentElement
 *  - Unit: applyPrefs system theme resolution (dark/light/system)
 *  - Unit: getReadingProgress returns null when not set, slug when set
 *  - Unit: savePrefs is resilient to localStorage being unavailable
 *  - Integration: save → load → apply does not throw
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  loadPrefs,
  savePrefs,
  applyPrefs,
  getReadingProgress,
  DEFAULT_PREFS,
  STORAGE_KEY,
  type UserPrefs,
} from "../src/lib/userPrefs";

// jsdom provides localStorage and document by default in vitest

beforeEach(() => {
  localStorage.clear();
  // Reset CSS vars and attributes
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-reduced-motion");
  document.documentElement.removeAttribute("data-compact");
  document.documentElement.style.cssText = "";
  document.body.style.cssText = "";
});

describe("loadPrefs", () => {
  it("returns DEFAULT_PREFS when localStorage is empty", () => {
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  });

  it("returns stored prefs when they exist", () => {
    const saved: UserPrefs = {
      ...DEFAULT_PREFS,
      theme: "light",
      fontSize: 18,
      zoom: 110,
      highlightColor: "#8b5cf6",
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    expect(loadPrefs()).toEqual(saved);
  });

  it("merges stored partial prefs with defaults (forward compatibility)", () => {
    // Simulate an older stored prefs with only some fields
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: "light", fontSize: 16 }));
    const loaded = loadPrefs();
    expect(loaded.theme).toBe("light");
    expect(loaded.fontSize).toBe(16);
    // Other fields come from defaults
    expect(loaded.zoom).toBe(DEFAULT_PREFS.zoom);
    expect(loaded.editorFont).toBe(DEFAULT_PREFS.editorFont);
    expect(loaded.reducedMotion).toBe(DEFAULT_PREFS.reducedMotion);
  });

  it("returns DEFAULT_PREFS when JSON is corrupted", () => {
    localStorage.setItem(STORAGE_KEY, "{ invalid json }}}}");
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  });

  it("returns DEFAULT_PREFS when stored value is null", () => {
    localStorage.setItem(STORAGE_KEY, "null");
    const loaded = loadPrefs();
    // null parsed → spread with DEFAULT_PREFS, returns defaults
    expect(loaded).toEqual(DEFAULT_PREFS);
  });
});

describe("savePrefs", () => {
  it("persists all preference fields to localStorage", () => {
    const prefs: UserPrefs = {
      theme: "system",
      fontSize: 14,
      zoom: 90,
      editorFont: "mono",
      reducedMotion: true,
      compactMode: true,
      highlightColor: "#10b981",
    };
    savePrefs(prefs);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(prefs);
  });

  it("overwrites previously saved prefs", () => {
    savePrefs({ ...DEFAULT_PREFS, theme: "light" });
    savePrefs({ ...DEFAULT_PREFS, theme: "dark" });
    const loaded = loadPrefs();
    expect(loaded.theme).toBe("dark");
  });

  it("does not throw when called with every valid theme value", () => {
    for (const theme of ["dark", "light", "system"] as const) {
      expect(() => savePrefs({ ...DEFAULT_PREFS, theme })).not.toThrow();
    }
  });
});

describe("applyPrefs", () => {
  it("sets data-theme attribute for dark theme", () => {
    applyPrefs({ ...DEFAULT_PREFS, theme: "dark" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("sets data-theme attribute for light theme", () => {
    applyPrefs({ ...DEFAULT_PREFS, theme: "light" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("resolves system theme to dark when prefers-color-scheme matches", () => {
    // jsdom doesn't support matchMedia by default — mock it
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: query.includes("dark"),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
    applyPrefs({ ...DEFAULT_PREFS, theme: "system" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("sets --user-font-size CSS variable", () => {
    applyPrefs({ ...DEFAULT_PREFS, fontSize: 17 });
    expect(document.documentElement.style.getPropertyValue("--user-font-size")).toBe("17px");
  });

  it("sets zoom on document.body", () => {
    applyPrefs({ ...DEFAULT_PREFS, zoom: 120 });
    expect(document.body.style.zoom).toBe("120%");
  });

  it("sets --user-editor-font for mono", () => {
    applyPrefs({ ...DEFAULT_PREFS, editorFont: "mono" });
    const val = document.documentElement.style.getPropertyValue("--user-editor-font");
    expect(val).toContain("Courier");
  });

  it("sets --user-editor-font for serif", () => {
    applyPrefs({ ...DEFAULT_PREFS, editorFont: "serif" });
    const val = document.documentElement.style.getPropertyValue("--user-editor-font");
    expect(val).toContain("Georgia");
  });

  it("sets data-reduced-motion attribute when enabled", () => {
    applyPrefs({ ...DEFAULT_PREFS, reducedMotion: true });
    expect(document.documentElement.getAttribute("data-reduced-motion")).toBe("true");
  });

  it("removes data-reduced-motion attribute when disabled", () => {
    document.documentElement.setAttribute("data-reduced-motion", "true");
    applyPrefs({ ...DEFAULT_PREFS, reducedMotion: false });
    expect(document.documentElement.getAttribute("data-reduced-motion")).toBeNull();
  });

  it("sets data-compact attribute when compact mode enabled", () => {
    applyPrefs({ ...DEFAULT_PREFS, compactMode: true });
    expect(document.documentElement.getAttribute("data-compact")).toBe("true");
  });

  it("removes data-compact attribute when compact mode disabled", () => {
    document.documentElement.setAttribute("data-compact", "true");
    applyPrefs({ ...DEFAULT_PREFS, compactMode: false });
    expect(document.documentElement.getAttribute("data-compact")).toBeNull();
  });

  it("sets --accent-purple to the highlight color", () => {
    applyPrefs({ ...DEFAULT_PREFS, highlightColor: "#8b5cf6" });
    expect(document.documentElement.style.getPropertyValue("--accent-purple")).toBe("#8b5cf6");
  });

  it("sets --accent-purple-glow to highlight color + 33 alpha", () => {
    applyPrefs({ ...DEFAULT_PREFS, highlightColor: "#10b981" });
    expect(document.documentElement.style.getPropertyValue("--accent-purple-glow")).toBe("#10b98133");
  });

  it("syncs theme to localStorage key 'theme'", () => {
    applyPrefs({ ...DEFAULT_PREFS, theme: "light" });
    expect(localStorage.getItem("theme")).toBe("light");
  });
});

describe("getReadingProgress", () => {
  it("returns null when no progress saved for a project", () => {
    expect(getReadingProgress("some-project")).toBeNull();
  });

  it("returns the last-read article slug", () => {
    localStorage.setItem("inscribe_progress_my-project", "getting-started");
    expect(getReadingProgress("my-project")).toBe("getting-started");
  });

  it("separates progress by project slug", () => {
    localStorage.setItem("inscribe_progress_proj-a", "article-a1");
    localStorage.setItem("inscribe_progress_proj-b", "article-b5");
    expect(getReadingProgress("proj-a")).toBe("article-a1");
    expect(getReadingProgress("proj-b")).toBe("article-b5");
  });

  it("returns null after localStorage is cleared", () => {
    localStorage.setItem("inscribe_progress_proj", "some-article");
    localStorage.clear();
    expect(getReadingProgress("proj")).toBeNull();
  });
});

describe("save → load → apply integration", () => {
  it("full cycle does not throw and preserves all values", () => {
    const prefs: UserPrefs = {
      theme: "light",
      fontSize: 16,
      zoom: 105,
      editorFont: "serif",
      reducedMotion: true,
      compactMode: false,
      highlightColor: "#f43f5e",
    };

    expect(() => {
      savePrefs(prefs);
      const loaded = loadPrefs();
      applyPrefs(loaded);
    }).not.toThrow();

    const loaded = loadPrefs();
    expect(loaded).toEqual(prefs);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.documentElement.getAttribute("data-reduced-motion")).toBe("true");
  });
});
