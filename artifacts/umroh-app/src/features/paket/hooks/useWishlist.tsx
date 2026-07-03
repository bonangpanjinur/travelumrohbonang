import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/shared/hooks/useAuth";
import { apiFetch } from "@/shared/lib/apiClient";
import { supabase } from "@/shared/integrations/supabase/client";

export function useWishlist() {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<any[]>("/api/wishlists");
      setIds(new Set((data || []).map((r: any) => r.packageId)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = async (packageId: string) => {
    if (!user) return { needsAuth: true };
    try {
      const result = await apiFetch<{ added: boolean }>("/api/wishlists/toggle", {
        method: "POST",
        body: JSON.stringify({ packageId }),
      });
      
      if (result.added) {
        setIds(prev => new Set(prev).add(packageId));
      } else {
        setIds(prev => { const n = new Set(prev); n.delete(packageId); return n; });
      }
      return result;
    } catch (err) {
      console.error(err);
      return { error: true };
    }
  };

  return { ids, has: (id: string) => ids.has(id), toggle, loading, refresh };
}
