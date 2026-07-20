import { useState, useEffect, useCallback, useRef } from "react";

export type HealthStatus = "checking" | "online" | "offline" | "recovering";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const CHECK_INTERVAL_MS = 30_000;  // re-check every 30 s while visible
const TIMEOUT_MS = 6_000;          // fail-fast timeout per check
const RECOVER_HIDE_DELAY_MS = 4_000; // how long to show the "restored" banner

/** True when we have both a real Supabase URL and anon key to ping with. */
function isConfigured(): boolean {
  return (
    !!SUPABASE_URL &&
    !SUPABASE_URL.includes("placeholder") &&
    !!SUPABASE_ANON_KEY &&
    !SUPABASE_ANON_KEY.includes("placeholder")
  );
}

/** Ping the Supabase REST root — lightweight, no auth required. */
async function pingSupabase(): Promise<boolean> {
  if (!isConfigured()) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {};
    if (SUPABASE_ANON_KEY) headers["apikey"] = SUPABASE_ANON_KEY;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: "HEAD",
      headers,
      signal: controller.signal,
    });
    // 200 or 401 both mean the server is reachable
    return res.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function useSupabaseHealth() {
  const [status, setStatus] = useState<HealthStatus>(
    isConfigured() ? "checking" : "online" // skip if not configured
  );
  const previousRef = useRef<HealthStatus>("checking");
  const recoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runCheck = useCallback(async () => {
    if (!isConfigured()) return;

    const reachable = await pingSupabase();

    setStatus((prev) => {
      previousRef.current = prev;

      if (reachable) {
        // Was offline → recovering state briefly before hiding
        if (prev === "offline") {
          if (recoverTimerRef.current) clearTimeout(recoverTimerRef.current);
          recoverTimerRef.current = setTimeout(() => {
            setStatus("online");
          }, RECOVER_HIDE_DELAY_MS);
          return "recovering";
        }
        return "online";
      } else {
        return "offline";
      }
    });
  }, []);

  useEffect(() => {
    // Initial check
    runCheck();

    // Periodic checks only when tab is visible
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") runCheck();
    }, CHECK_INTERVAL_MS);

    // Re-check immediately when tab regains focus
    const onVisible = () => {
      if (document.visibilityState === "visible") runCheck();
    };
    document.addEventListener("visibilitychange", onVisible);

    // Browser online/offline events for instant feedback
    const onOnline = () => runCheck();
    const onOffline = () => setStatus("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (recoverTimerRef.current) clearTimeout(recoverTimerRef.current);
    };
  }, [runCheck]);

  return { status, retry: runCheck };
}
