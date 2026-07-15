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

/**
 * Replit Auth manages session refresh server-side (via httpOnly cookies and
 * automatic token refresh on each request), so there's no client-visible
 * expiry to count down. This hook is kept as a no-op shim so existing
 * consumers (timeout modal, banners) don't need to change.
 */
export function useSessionTimeout(): SessionTimeoutState {
  return {
    secondsLeft: null,
    isWarning: false,
    isExpired: false,
    extend: async () => {},
  };
}
