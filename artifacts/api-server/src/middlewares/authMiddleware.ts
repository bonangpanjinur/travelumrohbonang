import { type Request, type Response, type NextFunction } from "express";
import type { AuthUser } from "@workspace/api-zod";
import { isAdminEmail } from "../lib/adminAllowlist";
import { SUPABASE_URL, SUPABASE_SERVER_KEY as SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY } from "../lib/supabaseEnv";

declare global {
  namespace Express {
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

async function getSupabaseRole(userId: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${userId}&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Accept: "application/json",
        },
      },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ role: string }>;
    return rows[0]?.role ?? null;
  } catch {
    return null;
  }
}

async function createSupabaseRole(userId: string, role: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates",
      },
      body: JSON.stringify({ user_id: userId, role }),
    });
  } catch {
    // best-effort
  }
}

async function resolveUser(token: string): Promise<AuthUser | null> {
  const cached = tokenCache.get(token);
  if (cached && Date.now() < cached.expiresAt) return cached.user;

  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_KEY,
      },
    });

    if (!res.ok) return null;

    const su = (await res.json()) as {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
    };

    if (!su?.id) return null;

    // Look up role from user_roles via Supabase HTTP (no DATABASE_URL needed)
    let role = await getSupabaseRole(su.id);

    if (!role) {
      // First login — assign and persist default role
      role = isAdminEmail(su.email) ? "admin" : "buyer";
      await createSupabaseRole(su.id, role);
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

    tokenCache.set(token, { user, expiresAt: Date.now() + CACHE_TTL_MS });
    return user;
  } catch {
    return null;
  }
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const token = getTokenFromRequest(req);
  if (token) {
    const user = await resolveUser(token);
    if (user) req.user = user;
  }

  next();
}
