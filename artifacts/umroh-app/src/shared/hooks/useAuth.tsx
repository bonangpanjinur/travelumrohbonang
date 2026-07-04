import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { supabaseAuth } from "@/shared/integrations/supabase/auth-client";

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: "admin" | "user";
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  role: string | null;
  refreshRole: () => Promise<void>;
  login: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchAuthUser(token: string): Promise<AuthUser | null> {
  try {
    const res = await fetch("/api/auth/user", {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json() as { user: AuthUser | null };
    return data.user ?? null;
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
  const isAdmin = role === "admin";

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
