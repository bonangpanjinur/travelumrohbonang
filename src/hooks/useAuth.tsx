import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isBuyer: boolean;
  role: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isAdmin?: boolean; role?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBuyer, setIsBuyer] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const fetchRole = async (userId: string) => {
    try {
      // 1. Priority Check: User Metadata (Fastest)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const metadataRole = currentUser?.user_metadata?.role?.toLowerCase();
      
      if (metadataRole === 'admin' || metadataRole === 'superadmin' || metadataRole === 'super_admin') {
        setRole(metadataRole);
        setIsAdmin(true);
        setIsBuyer(false);
        return metadataRole;
      }

      // 2. Database Check: Profiles Table (Accurate)
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching role from profiles:", error.message);
      }

      let currentRole = data?.role?.toLowerCase() || null;

      // 3. Fallback: user_roles table
      if (!currentRole) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (roleData) {
          currentRole = roleData.role.toLowerCase();
        }
      }

      // 4. Final Fallback: RPC (Bypasses RLS)
      if (!currentRole) {
        try {
          const { data: rpcIsAdmin } = await supabase.rpc('is_admin');
          if (rpcIsAdmin) currentRole = 'admin';
        } catch (rpcErr) {
          console.error("RPC is_admin failed:", rpcErr);
        }
      }

      if (currentRole) {
        const adminStatus = currentRole === 'admin' || currentRole === 'superadmin' || currentRole === 'super_admin';
        setRole(currentRole);
        setIsAdmin(adminStatus);
        setIsBuyer(!adminStatus);
        return currentRole;
      }

      // Default to user
      setRole('user');
      setIsAdmin(false);
      setIsBuyer(true);
      return 'user';
    } catch (err) {
      console.error("Failed to check admin status:", err);
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        if (initialSession?.user) {
          await fetchRole(initialSession.user.id);
        } else {
          setIsAdmin(false);
          setIsBuyer(false);
          setRole(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth event:", event);
        
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
          setLoading(true);
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          
          if (currentSession?.user) {
            await fetchRole(currentSession.user.id);
          }
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setIsBuyer(false);
          setRole(null);
          setLoading(false);
          // Optional: Clear local storage if needed
          // localStorage.clear();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      let userRole = null;
      if (data?.user) {
        userRole = await fetchRole(data.user.id);
      }
      
      return { 
        error: null, 
        isAdmin: userRole === 'admin' || userRole === 'superadmin' || userRole === 'super_admin',
        role: userRole 
      };
    } catch (error) {
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      // 1. Clear local state first for immediate UI response
      setIsAdmin(false);
      setIsBuyer(false);
      setRole(null);
      setUser(null);
      setSession(null);
      
      // 2. Call Supabase signOut
      const { error } = await supabase.auth.signOut();
      if (error) {
        // If session is already gone, Supabase might return an error, but we should still proceed
        console.warn("Supabase signOut returned an error (possibly already signed out):", error.message);
      }
      
      // 3. Clear storage to be sure
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
      
    } catch (error) {
      console.error("Error during sign out process:", error);
    } finally {
      setLoading(false);
      // 4. Force a hard reload to the auth page to clear all memory states
      window.location.href = '/auth';
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isBuyer, role, signIn, signUp, signOut }}>
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
