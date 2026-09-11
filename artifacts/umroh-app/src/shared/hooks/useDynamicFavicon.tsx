import { useEffect } from "react";
import { supabase } from "@/shared/integrations/supabase/client";

export const useDynamicFavicon = () => {
  useEffect(() => {
    const fetchAndSetFavicon = async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("key, value")
          .eq("category", "branding")
          .eq("key", "branding")
          .maybeSingle();
        if (error) throw error;
        const brandingSetting = data;
        const value = brandingSetting?.value;
        const faviconUrl =
          value && typeof value === "object" && !Array.isArray(value)
            ? (value as { favicon_url?: unknown }).favicon_url
            : null;

        if (typeof faviconUrl !== "string" || !faviconUrl.trim()) return;

        document.querySelectorAll("link[rel*='icon']").forEach((link) => link.remove());
        const link = document.createElement("link");
        link.rel = "icon";
        link.href = faviconUrl.trim();
        document.head.appendChild(link);
      } catch (error) {
        console.error("Error fetching favicon settings:", error);
      }
    };

    fetchAndSetFavicon();
  }, []);
};
