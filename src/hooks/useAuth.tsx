import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  role: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isAdmin?: boolean }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const checkRole = useCallback(async (userId: string): Promise<string> => {
    try {
      // Single source of truth: user_roles table via is_admin RPC
      const { data: adminResult, error } = await supabase.rpc('is_admin', { _user_id: userId });
      
      if (!error && adminResult === true) {
        return 'admin';
      }

      // Fallback: check user_roles table directly
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      return roleData?.role || 'buyer';
    } catch (err) {
      console.error("Role check failed:", err);
      return 'buyer';
    }
  }, []);

  const updateRole = useCallback((newRole: string) => {
    const adminStatus = ['admin', 'superadmin', 'super_admin'].includes(newRole);
    setRole(newRole);
    setIsAdmin(adminStatus);
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setRole(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    // 1. Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;
        console.log("Auth event:", event);

        if (event === 'SIGNED_OUT') {
          clearAuth();
          setLoading(false);
          return;
        }

        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Use setTimeout to avoid Supabase deadlock on auth state change
          setTimeout(async () => {
            if (!mounted) return;
            const userRole = await checkRole(currentSession.user.id);
            if (mounted) {
              updateRole(userRole);
              setLoading(false);
            }
          }, 0);
        } else {
          clearAuth();
          setLoading(false);
        }
      }
    );

    // 2. Then get initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return;
      
      if (initialSession?.user) {
        setSession(initialSession);
        setUser(initialSession.user);
        const userRole = await checkRole(initialSession.user.id);
        if (mounted) {
          updateRole(userRole);
        }
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [checkRole, updateRole, clearAuth]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data?.user) {
        const userRole = await checkRole(data.user.id);
        updateRole(userRole);
        return { error: null, isAdmin: ['admin', 'superadmin', 'super_admin'].includes(userRole) };
      }
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
      });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    clearAuth();
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, role, signIn, signUp, signOut }}>
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
