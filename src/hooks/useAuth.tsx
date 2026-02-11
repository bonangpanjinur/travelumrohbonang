import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
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

  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    try {
      console.log("Checking admin status for user:", userId);
      
      // 1. Try RPC first
      const { data: rpcData, error: rpcError } = await supabase.rpc('is_admin', { _user_id: userId });
      
      if (!rpcError && rpcData === true) {
        console.log("Admin status confirmed via RPC");
        setIsAdmin(true);
        return true;
      }

      // 2. Fallback: Check profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile for admin check:", profileError);
      }

      if (profileData?.role) {
        const roleLower = profileData.role.toLowerCase();
        const isUserAdmin = roleLower === 'admin' || roleLower === 'superadmin';
        console.log(`Admin status via profile table: ${isUserAdmin} (Role: ${profileData.role})`);
        setIsAdmin(isUserAdmin);
        return isUserAdmin;
      }

      console.warn("No admin role found for user");
      setIsAdmin(false);
      return false;
    } catch (err) {
      console.error("Failed to check admin status:", err);
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
      }
    } catch (error) {
      console.error("Auth refresh error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial check
    refreshAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state change event:", event);
        
        // For these events, we definitely want to show loading while we verify the role
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          setLoading(true);
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          
          if (currentSession?.user) {
            await checkAdminStatus(currentSession.user.id);
          } else {
            setIsAdmin(false);
          }
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
        } else {
          // For other events, just update the state without forcing loading if not necessary
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          if (currentSession?.user) {
            await checkAdminStatus(currentSession.user.id);
          } else {
            setIsAdmin(false);
          }
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
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name }
      }
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setIsAdmin(false);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signIn, signUp, signOut, refreshAuth }}>
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
