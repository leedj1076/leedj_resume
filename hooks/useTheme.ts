"use client";

import { useCallback, useState } from "react";

export function useTheme() {
  const [darkMode, setDarkMode] = useState(() => typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  const toggleDarkMode = useCallback(() => {
    const next = !darkMode;
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch { /* Storage may be blocked. */ }
    setDarkMode(next);
  }, [darkMode]);
  return { darkMode, toggleDarkMode };
}
