import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

/**
 * Template presets applied to CSS variables on :root.
 * Values are HSL triplets matching the design tokens in index.css.
 */
const TEMPLATE_PRESETS: Record<string, { primary: string; accent: string }> = {
  classic: { primary: "150 70% 16%", accent: "45 65% 53%" },        // Emerald + Gold
  modern: { primary: "215 28% 27%", accent: "217 91% 60%" },        // Slate + Blue
  luxury: { primary: "238 45% 14%", accent: "346 84% 60%" },        // Indigo + Rose
  nature: { primary: "175 70% 19%", accent: "187 85% 53%" },        // Teal + Cyan
};

const COLOR_SCHEME_PRESETS: Record<string, { primary: string; accent: string }> = {
  "emerald-gold": { primary: "150 70% 16%", accent: "45 65% 53%" },
  "blue-slate":   { primary: "215 60% 30%", accent: "217 91% 60%" },
  "purple-violet": { primary: "262 60% 30%", accent: "270 80% 60%" },
  "orange-amber": { primary: "20 80% 35%", accent: "38 92% 55%" },
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

export function useActiveTemplate() {
  const { isTenantSite } = useTenant();

  useEffect(() => {
    // Tenant sites have their own theming pipeline; don't override.
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

        const root = document.documentElement;
        const template = String(tpl.active_template || "classic");
        const scheme = String(tpl.color_scheme || "");
        const font = String(tpl.font_style || "");

        // Pick colors: explicit scheme wins; otherwise template preset.
        const colors =
          COLOR_SCHEME_PRESETS[scheme] || TEMPLATE_PRESETS[template] || null;
        if (colors) {
          root.style.setProperty("--primary", colors.primary);
          root.style.setProperty("--accent", colors.accent);
        }

        const fontPreset = FONT_PRESETS[font];
        if (fontPreset) {
          ensureFontLink(fontPreset.href);
          root.style.setProperty("--font-display", fontPreset.display);
          root.style.setProperty("--font-body", fontPreset.body);
        }
      } catch (e) {
        // Silent fail — never break the app over theming.
        console.warn("useActiveTemplate: failed to apply template", e);
      }
    };

    apply();
    return () => {
      cancelled = true;
    };
  }, [isTenantSite]);
}
