import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { apiFetch } from "@/shared/lib/apiClient";

export type AdminThemeId = "classic" | "modern" | "luxury" | "nature" | "midnight" | "slate";

export interface AdminThemePreset {
  id: AdminThemeId;
  name: string;
  /** HSL triplets for CSS variables */
  primary: string;
  accent: string;
  sidebarBg: string;
  /** Hex for visual preview swatches */
  previewPrimary: string;
  previewAccent: string;
}

export const ADMIN_THEME_PRESETS: AdminThemePreset[] = [
  {
    id: "classic",
    name: "Klasik",
    primary: "0 55% 25%",
    accent: "38 75% 55%",
    sidebarBg: "0 55% 25%",
    previewPrimary: "#5c1a1a",
    previewAccent: "#d4a52a",
  },
  {
    id: "modern",
    name: "Modern",
    primary: "215 28% 27%",
    accent: "217 91% 60%",
    sidebarBg: "215 28% 20%",
    previewPrimary: "#2f4660",
    previewAccent: "#4a90e2",
  },
  {
    id: "luxury",
    name: "Luxury",
    primary: "238 45% 14%",
    accent: "346 84% 60%",
    sidebarBg: "238 45% 10%",
    previewPrimary: "#131333",
    previewAccent: "#f04070",
  },
  {
    id: "nature",
    name: "Alam",
    primary: "158 55% 20%",
    accent: "142 71% 45%",
    sidebarBg: "158 55% 15%",
    previewPrimary: "#0e4d31",
    previewAccent: "#22c55e",
  },
  {
    id: "midnight",
    name: "Midnight",
    primary: "222 47% 15%",
    accent: "262 80% 65%",
    sidebarBg: "222 47% 11%",
    previewPrimary: "#131b3a",
    previewAccent: "#8b5cf6",
  },
  {
    id: "slate",
    name: "Slate",
    primary: "215 25% 20%",
    accent: "197 85% 48%",
    sidebarBg: "215 25% 15%",
    previewPrimary: "#243340",
    previewAccent: "#0ea5e9",
  },
];

const STORAGE_KEY = "admin-theme-v1";

function shiftLightness(hsl: string, delta: number): string {
  const parts = hsl.trim().split(/\s+/);
  const l = Math.max(0, Math.min(100, parseFloat(parts[2]) + delta));
  return `${parts[0]} ${parts[1]} ${Math.round(l)}%`;
}

export function applyAdminThemePreset(preset: AdminThemePreset) {
  const root = document.documentElement;
  root.style.setProperty("--primary", preset.primary);
  root.style.setProperty("--accent", preset.accent);
  root.style.setProperty("--ring", preset.accent);
  root.style.setProperty("--sidebar-background", preset.sidebarBg);
  root.style.setProperty("--sidebar-primary", preset.accent);
  root.style.setProperty("--sidebar-accent", shiftLightness(preset.sidebarBg, 10));
  root.style.setProperty("--gold", preset.accent);
  root.style.setProperty("--gold-light", shiftLightness(preset.accent, 20));
  root.style.setProperty("--gold-dark", shiftLightness(preset.accent, -15));
  root.style.setProperty("--elegant-black", preset.primary);
  root.style.setProperty("--elegant-black-light", shiftLightness(preset.primary, 10));
  root.style.setProperty("--elegant-black-dark", shiftLightness(preset.primary, -12));
}

function hslToHex(hsl: string): string {
  const parts = hsl.trim().split(/\s+/);
  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export interface AdminThemeContextType {
  themeId: AdminThemeId;
  setAdminTheme: (id: AdminThemeId) => Promise<void>;
  saving: boolean;
}

import React from "react";
export const AdminThemeContext = createContext<AdminThemeContextType | null>(null);

export function useAdminTheme(): AdminThemeContextType {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) throw new Error("useAdminTheme must be used within AdminThemeProvider");
  return ctx;
}

export function useAdminThemeProvider() {
  const [themeId, setThemeId] = useState<AdminThemeId>(() => {
    if (typeof window === "undefined") return "classic";
    return (localStorage.getItem(STORAGE_KEY) as AdminThemeId) || "classic";
  });
  const [saving, setSaving] = useState(false);

  // Apply on mount from localStorage immediately (no flash)
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as AdminThemeId) || "classic";
    const preset = ADMIN_THEME_PRESETS.find((t) => t.id === stored) ?? ADMIN_THEME_PRESETS[0];
    applyAdminThemePreset(preset);
  }, []);

  const setAdminTheme = useCallback(async (id: AdminThemeId) => {
    const preset = ADMIN_THEME_PRESETS.find((t) => t.id === id) ?? ADMIN_THEME_PRESETS[0];

    // 1. Apply CSS vars immediately for instant feedback
    applyAdminThemePreset(preset);

    // 2. Persist in localStorage
    localStorage.setItem(STORAGE_KEY, id);
    setThemeId(id);

    // 3. Save to backend so it persists across sessions/devices
    setSaving(true);
    try {
      await apiFetch("/api/admin/settings/template", {
        method: "PUT",
        body: JSON.stringify({
          category: "appearance",
          value: {
            active_template: id,
            font_style: "playfair",
            custom_primary_hex: hslToHex(preset.primary),
            custom_accent_hex: hslToHex(preset.accent),
          },
        }),
      });
    } catch {
      // Silent — CSS vars already applied, will reload from localStorage next visit
    } finally {
      setSaving(false);
    }
  }, []);

  return { themeId, setAdminTheme, saving };
}
