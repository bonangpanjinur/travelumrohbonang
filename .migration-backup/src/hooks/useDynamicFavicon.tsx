import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useDynamicFavicon = () => {
  useEffect(() => {
    const fetchAndSetFavicon = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "branding")
        .eq("category", "general")
        .single();

      if (data?.value && typeof data.value === "object") {
        const branding = data.value as { favicon_url?: string };
        if (branding.favicon_url) {
          // Remove existing favicon links
          const existingLinks = document.querySelectorAll("link[rel*='icon']");
          existingLinks.forEach((link) => link.remove());

          // Add new favicon
          const link = document.createElement("link");
          link.rel = "icon";
          link.href = branding.favicon_url;
          document.head.appendChild(link);
        }
      }
    };

    fetchAndSetFavicon();
  }, []);
};
