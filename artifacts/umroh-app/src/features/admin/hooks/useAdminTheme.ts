import { useState, useEffect, useCallback, createContext, useContext } from "react";
import React from "react";
import { apiFetch } from "@/shared/lib/apiClient";

export type AdminThemeId =
  | "classic"
  | "ocean"
  | "midnight"
  | "forest"
  | "sunset"
  | "corporate";

export interface AdminThemePreset {
  id: AdminThemeId;
  name: string;
  description: string;

  // Color (HSL triplets for CSS vars)
  primary: string;
  accent: string;
  sidebarBg: string;
  background: string;
  card: string;
  muted: string;
  border: string;

  // Shape language
  radius: string; // e.g. "0.75rem"

  // Typography
  fontDisplay: string;
  fontBody: string;
  fontHref?: string; // extra Google Font to load

  // Preview colours for the mini mockup (hex)
  previewSidebar: string;
  previewAccent: string;
  previewBg: string;
  previewCard: string;
}

export const ADMIN_THEME_PRESETS: AdminThemePreset[] = [
  {
    id: "classic",
    name: "Klasik",
    description: "Elegan & tradisional",
    primary: "0 55% 25%",
    accent: "38 75% 55%",
    sidebarBg: "0 55% 25%",
    background: "0 15% 97%",
    card: "0 12% 94%",
    muted: "0 10% 92%",
    border: "0 12% 86%",
    radius: "0.75rem",
    fontDisplay: "'Playfair Display', serif",
    fontBody: "'Plus Jakarta Sans', sans-serif",
    previewSidebar: "#5c1a1a",
    previewAccent: "#d4a52a",
    previewBg: "#f7f4f4",
    previewCard: "#ede8e8",
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Profesional & modern",
    primary: "213 60% 18%",
    accent: "199 89% 48%",
    sidebarBg: "213 60% 18%",
    background: "210 20% 98%",
    card: "210 15% 95%",
    muted: "210 12% 92%",
    border: "210 15% 88%",
    radius: "0.5rem",
    fontDisplay: "'Inter', sans-serif",
    fontBody: "'Inter', sans-serif",
    previewSidebar: "#0b2d4e",
    previewAccent: "#0ea5e9",
    previewBg: "#f5f8fc",
    previewCard: "#eaf2f8",
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Gelap & minimalis",
    primary: "240 30% 12%",
    accent: "262 80% 65%",
    sidebarBg: "240 30% 10%",
    background: "240 15% 97%",
    card: "240 10% 94%",
    muted: "240 8% 91%",
    border: "240 10% 85%",
    radius: "0.25rem",
    fontDisplay: "'Inter', sans-serif",
    fontBody: "'Inter', sans-serif",
    previewSidebar: "#111124",
    previewAccent: "#8b5cf6",
    previewBg: "#f4f4f8",
    previewCard: "#e8e8f0",
  },
  {
    id: "forest",
    name: "Alam",
    description: "Segar & ramah",
    primary: "150 55% 18%",
    accent: "142 70% 42%",
    sidebarBg: "150 55% 15%",
    background: "150 20% 97%",
    card: "150 12% 94%",
    muted: "150 8% 91%",
    border: "150 12% 86%",
    radius: "1rem",
    fontDisplay: "'Plus Jakarta Sans', sans-serif",
    fontBody: "'Plus Jakarta Sans', sans-serif",
    previewSidebar: "#0d3d26",
    previewAccent: "#22c55e",
    previewBg: "#f4faf6",
    previewCard: "#e6f5ec",
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Hangat & premium",
    primary: "22 60% 20%",
    accent: "25 95% 53%",
    sidebarBg: "22 60% 18%",
    background: "25 25% 98%",
    card: "25 15% 95%",
    muted: "25 10% 92%",
    border: "25 15% 87%",
    radius: "0.75rem",
    fontDisplay: "'Cormorant Garamond', serif",
    fontBody: "'Plus Jakarta Sans', sans-serif",
    fontHref:
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap",
    previewSidebar: "#3d1f08",
    previewAccent: "#f97316",
    previewBg: "#fdf8f4",
    previewCard: "#f5ece3",
  },
  {
    id: "corporate",
    name: "Korporat",
    description: "Formal & institusional",
    primary: "215 30% 20%",
    accent: "197 85% 42%",
    sidebarBg: "215 30% 18%",
    background: "215 15% 98%",
    card: "215 10% 95%",
    muted: "215 8% 92%",
    border: "215 12% 87%",
    radius: "0.375rem",
    fontDisplay: "'Inter', sans-serif",
    fontBody: "'Inter', sans-serif",
    previewSidebar: "#1e3045",
    previewAccent: "#0891b2",
    previewBg: "#f5f7fa",
    previewCard: "#e8ecf2",
  },
];

// ── helpers ──────────────────────────────────────────────────────────────────

function shiftL(hsl: string, delta: number): string {
  const [h, s, l] = hsl.trim().split(/\s+/);
  return `${h} ${s} ${Math.max(0, Math.min(100, parseFloat(l) + delta))}%`;
}

function hslToHex(hsl: string): string {
  const parts = hsl.trim().split(/\s+/);
  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)))
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function ensureFont(href?: string) {
  if (!href || typeof document === "undefined") return;
  const id = `gfont-${btoa(href).replace(/[^a-z0-9]/gi, "").slice(0, 20)}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

export function applyAdminThemePreset(preset: AdminThemePreset) {
  const r = document.documentElement;

  // — Colors —
  r.style.setProperty("--primary", preset.primary);
  r.style.setProperty("--accent", preset.accent);
  r.style.setProperty("--ring", preset.accent);
  r.style.setProperty("--sidebar-background", preset.sidebarBg);
  r.style.setProperty("--sidebar-primary", preset.accent);
  r.style.setProperty("--sidebar-accent", shiftL(preset.sidebarBg, 8));
  r.style.setProperty("--background", preset.background);
  r.style.setProperty("--card", preset.card);
  r.style.setProperty("--muted", preset.muted);
  r.style.setProperty("--border", preset.border);
  r.style.setProperty("--input", preset.border);
  r.style.setProperty("--gold", preset.accent);
  r.style.setProperty("--gold-light", shiftL(preset.accent, 20));
  r.style.setProperty("--gold-dark", shiftL(preset.accent, -15));
  r.style.setProperty("--elegant-black", preset.primary);
  r.style.setProperty("--elegant-black-light", shiftL(preset.primary, 10));
  r.style.setProperty("--elegant-black-dark", shiftL(preset.primary, -12));

  // — Shape —
  r.style.setProperty("--radius", preset.radius);

  // — Typography —
  ensureFont(preset.fontHref);
  r.style.setProperty("--font-display", preset.fontDisplay);
  r.style.setProperty("--font-body", preset.fontBody);
}

// ── context ───────────────────────────────────────────────────────────────────

export interface AdminThemeContextType {
  themeId: AdminThemeId;
  setAdminTheme: (id: AdminThemeId) => Promise<void>;
  saving: boolean;
}

export const AdminThemeContext = createContext<AdminThemeContextType | null>(null);

export function useAdminTheme(): AdminThemeContextType {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) throw new Error("useAdminTheme must be used within AdminThemeProvider");
  return ctx;
}

// ── provider hook (used in AdminLayout) ──────────────────────────────────────

const STORAGE_KEY = "admin-theme-v2";

export function useAdminThemeProvider() {
  const [themeId, setThemeId] = useState<AdminThemeId>(() => {
    if (typeof window === "undefined") return "classic";
    return (localStorage.getItem(STORAGE_KEY) as AdminThemeId) || "classic";
  });
  const [saving, setSaving] = useState(false);

  // Apply immediately on mount to avoid flash
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as AdminThemeId) || "classic";
    const preset =
      ADMIN_THEME_PRESETS.find((t) => t.id === stored) ?? ADMIN_THEME_PRESETS[0];
    applyAdminThemePreset(preset);
  }, []);

  const setAdminTheme = useCallback(async (id: AdminThemeId) => {
    const preset =
      ADMIN_THEME_PRESETS.find((t) => t.id === id) ?? ADMIN_THEME_PRESETS[0];

    // 1. Apply instantly
    applyAdminThemePreset(preset);
    localStorage.setItem(STORAGE_KEY, id);
    setThemeId(id);

    // 2. Persist to backend
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
      // silent — localStorage is the source of truth
    } finally {
      setSaving(false);
    }
  }, []);

  return { themeId, setAdminTheme, saving };
}
