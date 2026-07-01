import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
    const { data } = await supabase.from("wishlists").select("package_id").eq("user_id", user.id);
    setIds(new Set((data || []).map((r: any) => r.package_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = async (packageId: string) => {
    if (!user) return { needsAuth: true };
    if (ids.has(packageId)) {
      await supabase.from("wishlists").delete().eq("user_id", user.id).eq("package_id", packageId);
      setIds(prev => { const n = new Set(prev); n.delete(packageId); return n; });
      return { added: false };
    } else {
      await supabase.from("wishlists").insert({ user_id: user.id, package_id: packageId });
      setIds(prev => new Set(prev).add(packageId));
      return { added: true };
    }
  };

  return { ids, has: (id: string) => ids.has(id), toggle, loading, refresh };
}
