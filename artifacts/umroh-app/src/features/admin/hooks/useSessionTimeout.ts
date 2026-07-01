import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import { useAuth } from "@/shared/hooks/useAuth";

const WARN_BEFORE_SECS = 5 * 60; // show modal 5 minutes before expiry
const TICK_MS = 1_000;

export interface SessionTimeoutState {
  /** Seconds remaining until session expires. null = no active session. */
  secondsLeft: number | null;
  /** True when we're within the warning window. */
  isWarning: boolean;
  /** True after session has expired (0 reached). */
  isExpired: boolean;
  /** Call to refresh the session and dismiss the warning. */
  extend: () => Promise<void>;
}

function getSecondsLeft(expiresAt: number | undefined): number | null {
  if (!expiresAt) return null;
  return Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
}

export function useSessionTimeout(): SessionTimeoutState {
  const { session, signOut } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    () => getSecondsLeft(session?.expires_at)
  );
  const signedOutRef = useRef(false);

  // Recompute whenever the session object changes (e.g. after refresh)
  useEffect(() => {
    setSecondsLeft(getSecondsLeft(session?.expires_at));
    signedOutRef.current = false;
  }, [session?.expires_at]);

  // Tick every second while there's an active session
  useEffect(() => {
    if (!session?.expires_at) return;

    const id = setInterval(() => {
      const secs = getSecondsLeft(session.expires_at);
      setSecondsLeft(secs);

      // Auto-logout exactly once when the clock hits 0
      if (secs === 0 && !signedOutRef.current) {
        signedOutRef.current = true;
        signOut();
      }
    }, TICK_MS);

    return () => clearInterval(id);
  }, [session?.expires_at, signOut]);

  const extend = useCallback(async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) {
      // State will update via the onAuthStateChange listener in useAuth
      setSecondsLeft(getSecondsLeft(data.session.expires_at));
    }
  }, []);

  const isWarning =
    secondsLeft !== null && secondsLeft > 0 && secondsLeft <= WARN_BEFORE_SECS;
  const isExpired = secondsLeft === 0;

  return { secondsLeft, isWarning, isExpired, extend };
}
