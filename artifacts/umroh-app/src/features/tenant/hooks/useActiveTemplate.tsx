import { useEffect } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import { useTenant } from "@/shared/hooks/useTenant";

/**
 * Template presets applied to CSS variables on :root.
 * Values are HSL triplets matching the design tokens in index.css.
 * Each preset can override extended tokens for richer theming.
 */
type Tokens = {
  primary: string;
  accent: string;
  primaryFg?: string;
  accentFg?: string;
  ring?: string;
  sidebarBg?: string;
  sidebarPrimary?: string;
};

/** Convert a 3- or 6-digit hex color to an HSL string like "220 80% 45%" */
export function hexToHsl(hex: string): string | null {
  let clean = hex.replace("#", "").trim();
  // Expand 3-char shorthand (#abc → #aabbcc)
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Convert HSL string "h s% l%" to hex */
export function hslToHex(hsl: string): string {
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

const TEMPLATE_PRESETS: Record<string, Tokens> = {
  classic: { primary: "0 55% 25%", accent: "38 75% 55%", ring: "38 75% 55%", sidebarBg: "0 55% 25%", sidebarPrimary: "38 75% 55%" },
  modern:  { primary: "215 28% 27%", accent: "217 91% 60%", ring: "217 91% 60%", sidebarBg: "215 28% 20%", sidebarPrimary: "217 91% 60%" },
  luxury:  { primary: "238 45% 14%", accent: "346 84% 60%", ring: "346 84% 60%", sidebarBg: "238 45% 14%", sidebarPrimary: "346 84% 60%" },
  nature:  { primary: "175 70% 19%", accent: "187 85% 53%", ring: "187 85% 53%", sidebarBg: "175 70% 15%", sidebarPrimary: "187 85% 53%" },
};

const FONT_PRESETS: Record<string, { display: string; body: string; href?: string }> = {
  playfair: {
    display: "'Playfair Display', serif",
    body: "'Plus Jakarta Sans', sans-serif",
  },
  inter: {
    display: "'Inter', sans-serif",
    body: "'Inter', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
  },
  cormorant: {
    display: "'Cormorant Garamond', serif",
    body: "'Plus Jakarta Sans', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap",
  },
};

const FONT_STYLE_LEGACY_MAP: Record<string, string> = {
  classic: "playfair",
  modern: "inter",
  elegant: "cormorant",
};

function ensureFontLink(href?: string) {
  if (!href || typeof document === "undefined") return;
  const id = `font-${btoa(href).replace(/[^a-z0-9]/gi, "").slice(0, 16)}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

/** Shift the lightness of an "h s% l%" triplet by a delta (clamped 0-100). */
function shiftLightness(hsl: string, delta: number): string {
  const parts = hsl.trim().split(/\s+/);
  const h = parts[0];
  const s = parts[1];
  const l = Math.max(0, Math.min(100, parseFloat(parts[2]) + delta));
  return `${h} ${s} ${Math.round(l)}%`;
}

function applyTokens(tokens: Tokens) {
  const root = document.documentElement;
  root.style.setProperty("--primary", tokens.primary);
  root.style.setProperty("--accent", tokens.accent);
  if (tokens.ring) root.style.setProperty("--ring", tokens.ring);
  if (tokens.sidebarBg) root.style.setProperty("--sidebar-background", tokens.sidebarBg);
  if (tokens.sidebarPrimary) root.style.setProperty("--sidebar-primary", tokens.sidebarPrimary);
  // Re-derive companion tokens used across the design system
  root.style.setProperty("--gold", tokens.accent);
  root.style.setProperty("--gold-light", shiftLightness(tokens.accent, 20));
  root.style.setProperty("--gold-dark", shiftLightness(tokens.accent, -15));
  root.style.setProperty("--elegant-black", tokens.primary);
  root.style.setProperty("--elegant-black-light", shiftLightness(tokens.primary, 10));
  root.style.setProperty("--elegant-black-dark", shiftLightness(tokens.primary, -12));
}

export function useActiveTemplate() {
  const { isTenantSite } = useTenant();

  useEffect(() => {
    if (isTenantSite) return;
    let cancelled = false;

    const apply = async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("key,value")
          .eq("category", "appearance")
          .in("key", ["template"]);

        if (error || cancelled || !data?.length) return;

        const tpl = data.find((d) => d.key === "template")?.value as
          | Record<string, string>
          | null
          | undefined;
        if (!tpl || typeof tpl !== "object") return;

        const template = String(tpl.active_template || "classic");
        const rawFont = String(tpl.font_style || "");
        const font = FONT_STYLE_LEGACY_MAP[rawFont] || rawFont;
        const customPrimaryHex = tpl.custom_primary_hex as string | undefined;
        const customAccentHex = tpl.custom_accent_hex as string | undefined;

        // Start from template preset
        const baseTokens = TEMPLATE_PRESETS[template] ?? TEMPLATE_PRESETS.classic;
        const tokens: Tokens = { ...baseTokens };

        // Apply custom colors if admin specified them
        if (customPrimaryHex) {
          const hsl = hexToHsl(customPrimaryHex);
          if (hsl) {
            tokens.primary = hsl;
            tokens.sidebarBg = hsl;
          }
        }
        if (customAccentHex) {
          const hsl = hexToHsl(customAccentHex);
          if (hsl) {
            tokens.accent = hsl;
            tokens.ring = hsl;
            tokens.sidebarPrimary = hsl;
          }
        }
        applyTokens(tokens);

        const fontPreset = FONT_PRESETS[font];
        if (fontPreset) {
          ensureFontLink(fontPreset.href);
          document.documentElement.style.setProperty("--font-display", fontPreset.display);
          document.documentElement.style.setProperty("--font-body", fontPreset.body);
        }
      } catch (e) {
        console.warn("useActiveTemplate: failed to apply template", e);
      }
    };

    apply();

    // Realtime: react to admin changes immediately
    const channel = supabase
      .channel("site_settings_appearance")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings", filter: "category=eq.appearance" },
        () => apply(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [isTenantSite]);
}
