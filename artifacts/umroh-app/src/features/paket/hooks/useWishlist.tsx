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

    // Optimistic update so the heart icon responds instantly; rolled back if
    // the request fails.
    const wasIn = ids.has(packageId);
    setIds(prev => {
      const n = new Set(prev);
      if (wasIn) n.delete(packageId); else n.add(packageId);
      return n;
    });

    try {
      const result = await apiFetch<{ added: boolean }>("/api/wishlists/toggle", {
        method: "POST",
        body: JSON.stringify({ packageId }),
      });

      // Reconcile with server truth in case of a race.
      setIds(prev => {
        const n = new Set(prev);
        if (result.added) n.add(packageId); else n.delete(packageId);
        return n;
      });
      return result;
    } catch (err) {
      console.error(err);
      // Roll back the optimistic change.
      setIds(prev => {
        const n = new Set(prev);
        if (wasIn) n.add(packageId); else n.delete(packageId);
        return n;
      });
      return { error: true };
    }
  };

  return { ids, has: (id: string) => ids.has(id), toggle, loading, refresh };
}
