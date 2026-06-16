"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import styles from "./ThemeToggle.module.css";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    const initialTheme = savedTheme || "dark";
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
  }, []);

  if (!mounted) {
    return <div style={{ width: 100, height: 32 }} />;
  }

  const isDark = theme === "dark";

  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    try {
      const raw = localStorage.getItem("inscribe_user_prefs");
      const prefs = raw ? JSON.parse(raw) : {};
      prefs.theme = newTheme;
      localStorage.setItem("inscribe_user_prefs", JSON.stringify(prefs));
    } catch {}
  };

  return (
    <div 
      className={styles.toggleContainer}
      onClick={toggleTheme}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      <div className={`${styles.slider} ${isDark ? styles.sliderDark : styles.sliderLight}`} />
      <div className={`${styles.iconWrapper} ${!isDark ? styles.activeLight : ""}`}>
        <Sun size={16} className={styles.lightIcon} />
      </div>
      <div className={`${styles.iconWrapper} ${isDark ? styles.activeDark : ""}`}>
        <Moon size={16} className={styles.darkIcon} />
      </div>
    </div>
  );
}
