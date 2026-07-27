import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";

export interface SeoOverride {
  path: string;
  title?: string | null;
  description?: string | null;
  ogImage?: string | null;
  canonicalOverride?: string | null;
  noindex?: boolean | null;
  keywords?: string | null;
}

export const useSeoOverride = (path: string) => {
  const [override, setOverride] = useState<SeoOverride | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await apiFetch<{ data: SeoOverride[] }>("/api/cms/seo-overrides");
        const data = result?.data?.find((item) => item.path === path) ?? null;
        if (active) setOverride(data);
      } catch (error) {
        console.error("Error fetching SEO override:", error);
        if (active) setOverride(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [path]);

  return override;
};
