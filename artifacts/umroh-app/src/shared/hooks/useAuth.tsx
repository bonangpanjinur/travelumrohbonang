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
  isFullAdmin: boolean;
  role: AppRole | null;
  refreshRole: () => Promise<void>;
  login: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const VALID_ROLES = new Set<AppRole>([
  "super_admin", "admin", "branch_manager", "staff", "agent", "buyer", "user",
]);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string ?? "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string ?? "";

/**
 * Fetch user profile + role directly from Supabase.
 * No Express API involved — reads user from Supabase Auth and role
 * from the user_roles table via PostgREST (RLS: user can read own role).
 */
async function fetchUserFromSupabase(token: string): Promise<AuthUser | null> {
  try {
    // 1. Verify token and get user info from Supabase Auth
    const { data: { user: supaUser }, error } = await supabaseAuth.auth.getUser(token);
    if (error || !supaUser) return null;

    // 2. Read role directly from Supabase user_roles table
    //    RLS policy "users read own role" allows this with the user's JWT.
    let role: AppRole = "buyer";
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${supaUser.id}&limit=1&select=role`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: SUPABASE_ANON_KEY,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(8_000),
        },
      );
      if (res.ok) {
        const rows = (await res.json()) as Array<{ role: string }>;
        const rawRole = rows[0]?.role ?? "buyer";
        role = VALID_ROLES.has(rawRole as AppRole) ? (rawRole as AppRole) : "buyer";
      }
    } catch {
      // Role lookup failed — fallback to buyer. Backend still enforces per-request.
    }

    const meta = supaUser.user_metadata as Record<string, unknown> | undefined;

    return {
      id: supaUser.id,
      email: supaUser.email ?? null,
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabaseAuth.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.access_token) {
        const profile = await fetchUserFromSupabase(session.access_token);
        setUser(profile);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabaseAuth.auth.onAuthStateChange(async (_event, session) => {
      if (session?.access_token) {
        const profile = await fetchUserFromSupabase(session.access_token);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const role = user?.role ?? null;
  const isAdmin = !!(role && role !== "user" && role !== "buyer");
  const isFullAdmin = role === "super_admin" || role === "admin";

  const refreshRole = useCallback(async () => {
    const { data: { session } } = await supabaseAuth.auth.getSession();
    if (session?.access_token) {
      const profile = await fetchUserFromSupabase(session.access_token);
      setUser(profile);
    }
  }, []);

  const login = useCallback(() => {
    window.location.href = "/auth";
  }, []);

  const signOut = useCallback(async () => {
    if (user?.id) {
      sessionStorage.removeItem(`admin_2fa_verified_${user.id}`);
    }
    await supabaseAuth.auth.signOut();
    setUser(null);
    window.location.href = "/";
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, loading, isAdmin, isFullAdmin, role, refreshRole, login, signOut }}
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
