export interface CurrentAuthUser {
  id: string;
  email: string | null;
}

let cached: { user: CurrentAuthUser | null; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

/**
 * Best-effort lookup of the current Replit-authenticated user, used for
 * client-side audit/error logging. Cached briefly to avoid hammering the
 * auth endpoint on every log call.
 */
export async function getCurrentAuthUser(): Promise<CurrentAuthUser | null> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.user;
  }

  try {
    const res = await fetch("/api/auth/user", { credentials: "include" });
    if (!res.ok) {
      cached = { user: null, fetchedAt: Date.now() };
      return null;
    }
    const data = (await res.json()) as { user: CurrentAuthUser | null };
    cached = { user: data.user ?? null, fetchedAt: Date.now() };
    return cached.user;
  } catch {
    return null;
  }
}

export function invalidateCurrentAuthUserCache() {
  cached = null;
}
