/**
 * Shared helper: detects whether the effective database URL points to a
 * locally-accessible host that is NOT reachable from external runtimes
 * (Vercel serverless, external CI, other cloud environments).
 *
 * Known local-only hosts:
 *   - "helium"  → Replit's internal Postgres, auto-provisioned by the platform
 *   - "localhost" / "127.0.0.1" → local dev without a real DB configured
 *   - "*.internal" / "*.replit.internal" → Replit private network hostnames
 *
 * When this returns true the caller should NOT attempt a direct Postgres
 * connection and should fall back to Supabase HTTP REST instead.
 */
export function isLocalOnlyDbHost(url: string): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return (
      host === "helium" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".internal") ||
      host.endsWith(".replit.internal")
    );
  } catch {
    // Unparseable URL — let the pool try and surface a clear error.
    return false;
  }
}

/**
 * Returns true when the server should proxy reads/writes to Supabase's
 * PostgREST HTTP API instead of hitting the local Postgres pool directly.
 *
 * Conditions that trigger HTTP mode:
 *   1. DATABASE_URL is absent or the placeholder sentinel
 *   2. DATABASE_URL points to a local-only host (helium / localhost) AND
 *      Supabase credentials are actually present — so we have something to
 *      fall back to.  Without creds there is no point switching modes; we
 *      let the Drizzle pool try the direct URL (it works fine on Replit
 *      where "helium" is reachable internally).
 */
export function shouldUseSupabaseHttp(): boolean {
  const effectiveUrl =
    process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "";

  if (!effectiveUrl || effectiveUrl.includes("localhost/placeholder")) {
    return true;
  }

  if (isLocalOnlyDbHost(effectiveUrl)) {
    // Only fall back to Supabase HTTP when creds exist; otherwise use the
    // direct pool (helium is reachable inside Replit).
    const hasSupabaseCreds =
      !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    return hasSupabaseCreds;
  }

  return false;
}
