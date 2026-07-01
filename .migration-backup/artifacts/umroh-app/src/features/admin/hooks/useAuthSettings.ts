import { useEffect, useState } from "react";
import { supabase } from "@/shared/integrations/supabase/client";

export interface AuthSettings {
  enable_2fa: boolean;
  require_2fa: boolean;
}

const DEFAULTS: AuthSettings = { enable_2fa: false, require_2fa: false };

export function useAuthSettings() {
  const [settings, setSettings] = useState<AuthSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("site_settings")
      .select("value")
      .eq("category", "auth")
      .eq("key", "settings")
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        setSettings({ ...DEFAULTS, ...((data?.value as any) || {}) });
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { settings, loading };
}
