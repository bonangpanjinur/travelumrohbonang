import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import { useAuth } from "@/shared/hooks/useAuth";

// ── Tuneable constants ───────────────────────────────────────────────────────

/** Show the modal this many seconds before expiry (5 min). */
const WARN_BEFORE_SECS = 5 * 60;

/**
 * Proactively refresh if session has less than this many seconds left
 * AND the user has been active recently (20 min).
 */
const PROACTIVE_REFRESH_SECS = 20 * 60;

/** How often to run the proactive-refresh check (60 s). */
const PROACTIVE_CHECK_MS = 60_000;

/** Consider the user "idle" if no activity for this long (90 s). */
const IDLE_THRESHOLD_MS = 90_000;

/** Countdown tick interval. */
const TICK_MS = 1_000;

/** User activity events we listen to. */
const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "click",
];

// ── Types ────────────────────────────────────────────────────────────────────

export interface SessionTimeoutState {
  /** Seconds remaining until session expires. null = no active session. */
  secondsLeft: number | null;
  /** True when we're within the warning window AND no silent refresh saved us. */
  isWarning: boolean;
  /** True after session has expired (0 reached). */
  isExpired: boolean;
  /** Call to refresh the session and dismiss the warning. */
  extend: () => Promise<void>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSecondsLeft(expiresAt: number | undefined): number | null {
  if (!expiresAt) return null;
  return Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSessionTimeout(): SessionTimeoutState {
  const { session, signOut } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    () => getSecondsLeft(session?.expires_at)
  );

  // Guards
  const signedOutRef = useRef(false);
  const refreshingRef = useRef(false);

  // Track last user activity time (no re-render needed — just a timestamp).
  const lastActivityRef = useRef<number>(Date.now());

  // ── Activity listener ──────────────────────────────────────────────────────
  useEffect(() => {
    const markActive = () => {
      lastActivityRef.current = Date.now();
    };

    ACTIVITY_EVENTS.forEach((ev) =>
      document.addEventListener(ev, markActive, { passive: true })
    );

    return () => {
      ACTIVITY_EVENTS.forEach((ev) =>
        document.removeEventListener(ev, markActive)
      );
    };
  }, []);

  // ── Reset countdown when session changes (e.g. after a refresh) ────────────
  useEffect(() => {
    setSecondsLeft(getSecondsLeft(session?.expires_at));
    signedOutRef.current = false;
  }, [session?.expires_at]);

  // ── Per-second countdown + auto-logout at 0 ───────────────────────────────
  useEffect(() => {
    if (!session?.expires_at) return;

    const id = setInterval(() => {
      const secs = getSecondsLeft(session.expires_at);
      setSecondsLeft(secs);

      if (secs === 0 && !signedOutRef.current) {
        signedOutRef.current = true;
        signOut();
      }
    }, TICK_MS);

    return () => clearInterval(id);
  }, [session?.expires_at, signOut]);

  // ── Proactive silent refresh while the user is active ─────────────────────
  useEffect(() => {
    if (!session?.expires_at) return;

    const id = setInterval(async () => {
      const secs = getSecondsLeft(session.expires_at);
      if (secs === null) return;

      const userIsActive =
        Date.now() - lastActivityRef.current < IDLE_THRESHOLD_MS;

      const sessionNeedsRefresh =
        secs > 0 && secs <= PROACTIVE_REFRESH_SECS;

      if (userIsActive && sessionNeedsRefresh && !refreshingRef.current) {
        refreshingRef.current = true;
        try {
          await supabase.auth.refreshSession();
          // onAuthStateChange in useAuth picks up the new expires_at automatically.
        } finally {
          refreshingRef.current = false;
        }
      }
    }, PROACTIVE_CHECK_MS);

    return () => clearInterval(id);
  }, [session?.expires_at]);

  // ── Manual extend (called by the modal's button) ───────────────────────────
  const extend = useCallback(async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) {
      setSecondsLeft(getSecondsLeft(data.session.expires_at));
    }
  }, []);

  const isWarning =
    secondsLeft !== null && secondsLeft > 0 && secondsLeft <= WARN_BEFORE_SECS;
  const isExpired = secondsLeft === 0;

  return { secondsLeft, isWarning, isExpired, extend };
}
