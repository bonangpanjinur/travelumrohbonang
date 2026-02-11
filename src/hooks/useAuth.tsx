import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  userRole: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isAdmin?: boolean }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    try {
      console.log("[AuthDebug] Checking admin status for user:", userId);
      
      // 1. Try fetching profile directly first (often more reliable than RPC if RLS is set up)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error("[AuthDebug] Error fetching profile:", profileError);
      }

      if (profileData?.role) {
        const roleStr = String(profileData.role).toLowerCase();
        setUserRole(profileData.role);
        const isUserAdmin = roleStr === 'admin' || roleStr === 'superadmin';
        console.log(`[AuthDebug] Profile found. Role: "${profileData.role}", isAdmin: ${isUserAdmin}`);
        setIsAdmin(isUserAdmin);
        return isUserAdmin;
      }

      // 2. Fallback to RPC if profile fetch didn't return a role
      console.log("[AuthDebug] No role in profile, trying RPC fallback...");
      const { data: rpcData, error: rpcError } = await supabase.rpc('is_admin', { _user_id: userId });
      
      if (!rpcError && rpcData === true) {
        console.log("[AuthDebug] Admin status confirmed via RPC");
        setIsAdmin(true);
        setUserRole('admin (via rpc)');
        return true;
      }

      console.warn("[AuthDebug] Access Denied: User has no admin role in database.");
      setIsAdmin(false);
      setUserRole('none');
      return false;
    } catch (err) {
      console.error("[AuthDebug] Critical error in checkAdminStatus:", err);
      setIsAdmin(false);
      return false;
    }
  };

  const refreshAuth = async () => {
    setLoading(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        await checkAdminStatus(currentSession.user.id);
      } else {
        setIsAdmin(false);
        setUserRole(null);
      }
    } catch (error) {
      console.error("[AuthDebug] Auth refresh error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("[AuthDebug] Auth event:", event);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setLoading(true);
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          if (currentSession?.user) {
            await checkAdminStatus(currentSession.user.id);
          }
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      let adminStatus = false;
      if (data?.user) {
        adminStatus = await checkAdminStatus(data.user.id);
      }
      return { error: error as Error | null, isAdmin: adminStatus };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setUser(null);
    setSession(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, userRole, signIn, signUp, signOut, refreshAuth }}>
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
