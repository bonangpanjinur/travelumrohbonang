import { useEffect, useState } from "react";
import { supabase } from "@/shared/integrations/supabase/client";

export interface SeoOverride {
  title?: string | null;
  description?: string | null;
  og_image?: string | null;
  canonical_override?: string | null;
  noindex?: boolean | null;
  keywords?: string | null;
}

export const useSeoOverride = (path: string) => {
  const [override, setOverride] = useState<SeoOverride | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("seo_overrides")
        .select("title,description,og_image,canonical_override,noindex,keywords")
        .eq("path", path)
        .maybeSingle();
      if (active) setOverride((data as SeoOverride) ?? null);
    })();
    return () => {
      active = false;
    };
  }, [path]);

  return override;
};
