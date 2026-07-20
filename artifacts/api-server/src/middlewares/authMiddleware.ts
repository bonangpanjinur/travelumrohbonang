import { type Request, type Response, type NextFunction } from "express";
import type { AuthUser } from "@workspace/api-zod";
import { isAdminEmail } from "../lib/adminAllowlist";
import { SUPABASE_URL, SUPABASE_SERVER_KEY as SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY } from "../lib/supabaseEnv";
import { pool } from "@workspace/db";
import { ROLE_RANK } from "../lib/roleConstants";

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- intentional declaration merging with AuthUser
    interface User extends AuthUser {}

    interface Request {
      isAuthenticated(): this is AuthedRequest;
      user?: User | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

const tokenCache = new Map<string, { user: AuthUser; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

function getTokenFromRequest(req: Request): string | undefined {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    const t = authHeader.slice(7).trim();
    if (t && t !== "local-dev-key") return t;
  }
  return undefined;
}

/**
 * Query role from local Postgres when DATABASE_URL is a real connection
 * (i.e. development / Replit). Returns null on any error so the caller
 * can fall back to the Supabase HTTP path.
 *
 * Skips entirely when the URL points to a Replit-internal host ("helium")
 * that is not reachable from Vercel — avoids a 5-second timeout per request.
 */
async function getLocalRole(userId: string): Promise<string | null> {
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!dbUrl || dbUrl.includes("localhost/placeholder")) return null;
  // Replit-internal hosts are not reachable from external runtimes (Vercel).
  // Skip immediately rather than waiting for the connection timeout.
  try {
    const host = new URL(dbUrl).hostname;
    if (
      host === "helium" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".internal") ||
      host.endsWith(".replit.internal")
    ) return null;
  } catch { /* unparseable URL — fall through and let pool.query surface the error */ }
  try {
    const result = await pool.query<{ role: string }>(
      "SELECT role FROM user_roles WHERE user_id = $1 LIMIT 1",
      [userId],
    );
    return result.rows[0]?.role ?? null;
  } catch {
    return null;
  }
}

/**
 * Upsert role in local Postgres.
 */
async function setLocalRole(userId: string, role: string): Promise<void> {
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!dbUrl || dbUrl.includes("localhost/placeholder")) return;
  try {
    await pool.query(
      `INSERT INTO user_roles (id, user_id, role, created_at)
       VALUES (gen_random_uuid(), $1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role`,
      [userId, role],
    );
  } catch (err) {
    console.error("[authMiddleware] setLocalRole failed:", err);
  }
}

/** AbortSignal that times out after `ms` milliseconds. */
function timeoutSignal(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

/**
 * Quickly decode a JWT payload (no signature verification) to check if it
 * looks like a real user token (has a `sub` claim). Supabase anon/service-role
 * keys are JWTs too, but they use `role` instead of `sub`. Calling
 * /auth/v1/user with them always returns 403 bad_jwt, so we skip that round-trip.
 */
function jwtHasSubClaim(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    return typeof payload["sub"] === "string" && payload["sub"].length > 0;
  } catch {
    return false;
  }
}

/**
 * Result type for Supabase role lookup.
 *  { reachable: true,  role: string | null } — Supabase responded (even if no row)
 *  { reachable: false }                      — transport/config error; cannot trust result
 */
type SupabaseRoleResult =
  | { reachable: true; role: string | null }
  | { reachable: false };

/**
 * Query role from Supabase HTTP REST (used when DATABASE_URL is absent,
 * e.g. on Vercel serverless).
 *
 * Returns { reachable: true, role } on any successful HTTP response so callers
 * can distinguish "user has no row in Supabase" from "Supabase was unreachable."
 * Returns { reachable: false } only on network errors, timeouts, or missing config.
 */
async function getSupabaseRole(userId: string): Promise<SupabaseRoleResult> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return { reachable: false };
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${userId}&limit=1`,
      {
        signal: timeoutSignal(8_000),
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Accept: "application/json",
        },
      },
    );
    if (!res.ok) return { reachable: false };
    const rows = (await res.json()) as Array<{ role: string }>;
    return { reachable: true, role: rows[0]?.role ?? null };
  } catch {
    return { reachable: false };
  }
}

/**
 * Unified role getter.
 *
 * Supabase is the single source of truth.
 *
 * • Reachable + has row  → use Supabase role; sync to local in background.
 * • Reachable + no row   → role is null (user has no privilege); do NOT fall
 *                          back to local which might be stale/elevated.
 * • Unreachable (network/timeout/config) → fall back to local Postgres only.
 *
 * This ensures that removing a role in the Supabase dashboard revokes access
 * within the cache TTL (60 s), and that newly promoted roles work immediately
 * without needing a local DB sync first.
 */
async function getUserRole(userId: string): Promise<string | null> {
  const [localRole, supabaseResult] = await Promise.all([
    getLocalRole(userId),
    getSupabaseRole(userId),
  ]);

  if (supabaseResult.reachable) {
    // Supabase responded — its result is authoritative (even if null / no row).
    const supabaseRole = supabaseResult.role;
    if (supabaseRole && supabaseRole !== localRole) {
      // Sync promotion/demotion to local so future fast-path reads stay accurate.
      setLocalRole(userId, supabaseRole).catch(() => {});
    }
    return supabaseRole;
  }

  // Supabase unreachable (network error, timeout, missing config) — use local.
  return localRole;
}

/**
 * Persist role to local Postgres AND Supabase HTTP so both stores stay in sync.
 * Errors are logged but never thrown — a failed write must not block the request.
 */
async function persistRole(userId: string, role: string): Promise<void> {
  // 1. Local Postgres (dev / Replit)
  await setLocalRole(userId, role);

  // 2. Supabase HTTP (production / Vercel fallback)
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    // PostgREST upsert requires BOTH ?on_conflict=<col> in the URL AND
    // Prefer: resolution=merge-duplicates to handle the unique constraint on
    // user_id correctly (not just the PK). Without the query param PostgREST
    // cannot determine which unique constraint to use for the merge.
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_roles?on_conflict=user_id`,
      {
        method: "POST",
        signal: timeoutSignal(8_000),
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        // id is required (TEXT PRIMARY KEY, no DB default) — generate here.
        // On UPDATE path (conflict on user_id) the id is ignored by PostgREST.
        body: JSON.stringify({ id: crypto.randomUUID(), user_id: userId, role }),
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "<unreadable>");
      console.error(
        `[authMiddleware] persistRole (Supabase) failed — status ${res.status}: ${body}`,
      );
    }
  } catch (err) {
    console.error("[authMiddleware] persistRole (Supabase) threw:", err);
  }
}

async function resolveUser(token: string): Promise<AuthUser | null> {
  const cached = tokenCache.get(token);
  if (cached && Date.now() < cached.expiresAt) return cached.user;

  // Fast-path: skip Supabase HTTP call for non-user JWTs (anon key, service-role
  // key, etc.). They have no `sub` claim and Supabase always rejects them with
  // 403 bad_jwt — checking locally avoids a wasted round-trip + noisy log.
  if (!jwtHasSubClaim(token)) return null;

  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      signal: timeoutSignal(8_000),
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_KEY,
      },
    });

    if (!res.ok) {
      if (isDev) {
        const body = await res.text().catch(() => "");
        console.log(`[authMiddleware] Supabase /auth/v1/user returned ${res.status}: ${body.slice(0, 200)}`);
      }
      return null;
    }

    const su = (await res.json()) as {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
    };

    if (!su?.id) return null;

    // Resolve role: local Postgres first (fast), then Supabase HTTP (fallback)
    let role = await getUserRole(su.id);
    // true = role came from DB (reliable); false = fallback default (don't cache long)
    let roleIsConfirmed = !!role;

    if (isAdminEmail(su.email)) {
      // Admin-email override: ADMIN_EMAILS always get at least super_admin,
      // regardless of what the DB has stored. This handles the common case
      // where Supabase's on_auth_user_created trigger pre-assigned "buyer"
      // before ADMIN_EMAILS was configured, or when role is simply missing.
      if (!role || role === "buyer" || role === "user") {
        role = "super_admin";
        await persistRole(su.id, role);
        // Evict any stale cached token entry so the old role isn't served again.
        tokenCache.delete(token);
        roleIsConfirmed = true;
      }
    } else if (!role) {
      // Non-admin first login — assign buyer role.
      role = "buyer";
      await persistRole(su.id, role);
    }

    const user: AuthUser = {
      id: su.id,
      email: su.email ?? null,
      firstName:
        (su.user_metadata?.["first_name"] as string | undefined) ?? null,
      lastName:
        (su.user_metadata?.["last_name"] as string | undefined) ?? null,
      profileImageUrl:
        (su.user_metadata?.["avatar_url"] as string | undefined) ??
        (su.user_metadata?.["picture"] as string | undefined) ??
        null,
      role: role as AuthUser["role"],
    };

    // Only cache when role came from DB. If we fell back to a default
    // (e.g. SUPABASE_SERVICE_ROLE_KEY was temporarily missing), don't cache
    // so the next request retries the DB lookup immediately.
    if (roleIsConfirmed) {
      tokenCache.set(token, { user, expiresAt: Date.now() + CACHE_TTL_MS });
    }
    return user;
  } catch {
    return null;
  }
}

const isDev = process.env.NODE_ENV !== "production";

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (isDev) console.log(`[authMiddleware] → ${req.method} ${req.path}`);

  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  try {
    const token = getTokenFromRequest(req);
    if (token) {
      if (isDev) console.log("[authMiddleware] token found, resolving user...");
      const user = await resolveUser(token);
      if (user) {
        req.user = user;
        if (isDev) console.log(`[authMiddleware] JWT verified — user=${user.id} role=${user.role}`);
      } else {
        if (isDev) console.log("[authMiddleware] token invalid or Supabase unreachable — proceeding unauthenticated");
      }
    } else {
      if (isDev) console.log("[authMiddleware] no token — proceeding unauthenticated");
    }
  } catch (err: any) {
    // Safety net: authMiddleware must NEVER cause a 500 — any error here
    // means the request proceeds as unauthenticated, not as a server error.
    console.error("[authMiddleware] unexpected error (proceeding unauthenticated):", err?.message, err?.stack);
  }

  next();
}
