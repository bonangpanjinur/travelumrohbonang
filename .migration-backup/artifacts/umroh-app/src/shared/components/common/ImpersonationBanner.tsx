import { useEffect, useState } from "react";
import { AlertTriangle, LogOut } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { supabase } from "@/shared/integrations/supabase/client";
import { useAuth } from "@/shared/hooks/useAuth";
import { logAudit } from "@/shared/lib/audit";

/**
 * Persistent banner shown when the current session was started via the
 * admin impersonation flow. We detect this by checking for ?impersonated=1
 * in the URL on first load and persisting it in sessionStorage so it
 * survives navigation within the impersonated tab.
 */
const STORAGE_KEY = "impersonation_active";

const ImpersonationBanner = () => {
  const { user } = useAuth();
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("impersonated") === "1") {
      sessionStorage.setItem(STORAGE_KEY, "1");
      url.searchParams.delete("impersonated");
      window.history.replaceState({}, "", url.toString());
    }
    setActive(sessionStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  if (!active || !user) return null;

  const handleExit = async () => {
    try {
      await logAudit({ action: "impersonate_end", entityType: "user", entityId: user.id });
    } catch {}
    sessionStorage.removeItem(STORAGE_KEY);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="sticky top-0 z-[60] w-full bg-yellow-500 text-yellow-950 shadow-md">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm font-medium">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Mode Impersonate aktif — Anda sedang login sebagai{" "}
            <span className="font-bold">{user.email}</span>. Semua aksi tercatat di audit logs.
          </span>
        </div>
        <Button size="sm" variant="outline" className="border-yellow-900 bg-transparent text-yellow-950 hover:bg-yellow-100" onClick={handleExit}>
          <LogOut className="mr-1 h-3 w-3" />
          Keluar
        </Button>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
