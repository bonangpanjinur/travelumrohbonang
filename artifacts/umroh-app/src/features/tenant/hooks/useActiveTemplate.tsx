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

const TEMPLATE_PRESETS: Record<string, Tokens> = {
  classic: { primary: "0 55% 25%", accent: "38 75% 55%", ring: "38 75% 55%", sidebarBg: "0 55% 25%", sidebarPrimary: "38 75% 55%" },
  modern:  { primary: "215 28% 27%", accent: "217 91% 60%", ring: "217 91% 60%", sidebarBg: "215 28% 20%", sidebarPrimary: "217 91% 60%" },
  luxury:  { primary: "238 45% 14%", accent: "346 84% 60%", ring: "346 84% 60%", sidebarBg: "238 45% 14%", sidebarPrimary: "346 84% 60%" },
  nature:  { primary: "175 70% 19%", accent: "187 85% 53%", ring: "187 85% 53%", sidebarBg: "175 70% 15%", sidebarPrimary: "187 85% 53%" },
};

const COLOR_SCHEME_PRESETS: Record<string, Tokens> = {
  "emerald-gold":  { primary: "150 70% 16%", accent: "45 65% 53%", ring: "45 65% 53%", sidebarBg: "150 70% 13%", sidebarPrimary: "45 65% 53%" },
  "blue-slate":    { primary: "215 60% 30%", accent: "217 91% 60%", ring: "217 91% 60%", sidebarBg: "215 60% 22%", sidebarPrimary: "217 91% 60%" },
  "purple-violet": { primary: "262 60% 30%", accent: "270 80% 60%", ring: "270 80% 60%", sidebarBg: "262 60% 22%", sidebarPrimary: "270 80% 60%" },
  "orange-amber":  { primary: "20 80% 35%",  accent: "38 92% 55%",  ring: "38 92% 55%",  sidebarBg: "20 80% 28%",  sidebarPrimary: "38 92% 55%" },
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

function applyTokens(tokens: Tokens) {
  const root = document.documentElement;
  root.style.setProperty("--primary", tokens.primary);
  root.style.setProperty("--accent", tokens.accent);
  if (tokens.ring) root.style.setProperty("--ring", tokens.ring);
  if (tokens.sidebarBg) root.style.setProperty("--sidebar-background", tokens.sidebarBg);
  if (tokens.sidebarPrimary) root.style.setProperty("--sidebar-primary", tokens.sidebarPrimary);
  // Re-derive companion tokens used across the design system
  root.style.setProperty("--gold", tokens.accent);
  root.style.setProperty("--elegant-black", tokens.primary);
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
        const scheme = String(tpl.color_scheme || "");
        const font = String(tpl.font_style || "");

        const tokens =
          COLOR_SCHEME_PRESETS[scheme] || TEMPLATE_PRESETS[template] || TEMPLATE_PRESETS.classic;
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
