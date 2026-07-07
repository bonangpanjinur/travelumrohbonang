import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { supabaseAuth } from "@/shared/integrations/supabase/auth-client";

export type AppRole =
  | "super_admin"
  | "admin"
  | "branch_manager"
  | "staff"
  | "agent"
  | "buyer"
  | "user";

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: AppRole;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  role: AppRole | null;
  refreshRole: () => Promise<void>;
  login: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const VALID_ROLES = new Set<AppRole>([
  "super_admin", "admin", "branch_manager", "staff", "agent", "buyer", "user",
]);

/**
 * Decode a Supabase JWT and build a minimal AuthUser from its claims.
 * Used as fallback when /api/auth/user is unreachable (network error, 5xx),
 * so the user is not stuck in an infinite redirect loop on the login page.
 *
 * Security notes:
 * - Called only on transient server errors (network/5xx), never on 401/403.
 * - Signature is NOT verified here (browser can't access the secret).
 *   Backend APIs still enforce role on every request; this only gates UX.
 * - Expiry (`exp`) is checked so we don't keep an expired token as "active".
 */
function buildUserFromToken(token: string): AuthUser | null {
  try {
    // base64url → base64 → JSON
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(b64)) as Record<string, unknown>;

    const id = payload["sub"] as string | undefined;
    if (!id) return null;

    // Reject expired tokens — don't treat a stale session as authenticated.
    const exp = payload["exp"] as number | undefined;
    if (exp && Date.now() / 1000 > exp) return null;

    const email = (payload["email"] as string | undefined) ?? null;

    // Supabase stores custom role in app_metadata.role (via custom claims hook)
    // or falls back to "buyer" if no custom claim has been applied yet.
    const appMeta = payload["app_metadata"] as Record<string, unknown> | undefined;
    const rawRole =
      (appMeta?.["role"] as string | undefined) ??
      (payload["role"] as string | undefined) ??
      "buyer";
    const role: AppRole = VALID_ROLES.has(rawRole as AppRole)
      ? (rawRole as AppRole)
      : "buyer";

    const meta = payload["user_metadata"] as Record<string, unknown> | undefined;

    return {
      id,
      email,
      firstName: (meta?.["first_name"] as string | undefined) ?? null,
      lastName: (meta?.["last_name"] as string | undefined) ?? null,
      profileImageUrl:
        (meta?.["avatar_url"] as string | undefined) ??
        (meta?.["picture"] as string | undefined) ??
        null,
      role,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch the enriched user profile (including DB role) from the API server.
 *
 * Fallback strategy:
 * - 2xx + user object → return it (accurate, has DB role).
 * - 2xx + null user  → return null (server says not authenticated).
 * - 401 / 403        → return null (token rejected; force re-auth).
 * - 503              → Supabase not configured on server; use JWT claim fallback
 *   so the user isn't logged out in local/dev environments without Supabase.
 * - other 5xx / network err → decode JWT claims as a temporary fallback user so
 *   the user can enter the app without an infinite redirect loop. Backend still
 *   enforces role on every admin API call, so this is safe.
 */
async function fetchAuthUser(token: string): Promise<AuthUser | null> {
  try {
    const res = await fetch("/api/auth/user", {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });

    if (res.ok) {
      const data = (await res.json()) as { user: AuthUser | null };
      return data.user ?? null;
    }

    // 401/403 = token rejected by server → do not fallback, force re-auth.
    if (res.status === 401 || res.status === 403) {
      console.warn(`[useAuth] /api/auth/user returned ${res.status} — clearing session`);
      return null;
    }

    // 5xx or unexpected status → transient server error, use JWT fallback.
    console.warn(
      `[useAuth] /api/auth/user returned ${res.status} — using JWT claim fallback`,
    );
    return buildUserFromToken(token);
  } catch (err) {
    // Network error (offline, DNS, timeout) → use JWT fallback.
    console.warn("[useAuth] /api/auth/user unreachable — using JWT claim fallback:", err);
    return buildUserFromToken(token);
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabaseAuth.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.access_token) {
        const profile = await fetchAuthUser(session.access_token);
        setUser(profile);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabaseAuth.auth.onAuthStateChange(async (_event, session) => {
      if (session?.access_token) {
        const profile = await fetchAuthUser(session.access_token);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const role = user?.role ?? null;
  // Any role other than buyer/user gets admin panel access.
  const isAdmin = !!(role && role !== "user" && role !== "buyer");

  const refreshRole = useCallback(async () => {
    const {
      data: { session },
    } = await supabaseAuth.auth.getSession();
    if (session?.access_token) {
      const profile = await fetchAuthUser(session.access_token);
      setUser(profile);
    }
  }, []);

  const login = useCallback(() => {
    window.location.href = "/auth";
  }, []);

  const signOut = useCallback(async () => {
    await supabaseAuth.auth.signOut();
    setUser(null);
    window.location.href = "/";
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, isAdmin, role, refreshRole, login, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
