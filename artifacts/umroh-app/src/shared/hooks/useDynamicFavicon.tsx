import { useEffect } from "react";
import { apiFetch } from "@/shared/lib/apiClient";

export const useDynamicFavicon = () => {
  useEffect(() => {
    const fetchAndSetFavicon = async () => {
      try {
        const result = await apiFetch<{ data: Array<{ key: string; value: unknown }> }>(
          "/api/cms/site-settings",
        );
        const brandingSetting = result?.data?.find((setting) => setting.key === "branding");
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
