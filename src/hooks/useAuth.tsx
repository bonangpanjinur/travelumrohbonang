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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchRole = async (userId: string) => {
    try {
      // Step 1.1: Fetch role immediately after session is obtained
      // Use maybeSingle to avoid errors if profile doesn't exist yet
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching role:", error.message);
        return false;
      }

      if (data?.role) {
        // Step 1.1: Case-insensitive check
        const roleLower = data.role.toLowerCase();
        const isUserAdmin = roleLower === 'admin' || roleLower === 'superadmin';
        console.log(`User role: ${data.role}, isAdmin: ${isUserAdmin}`);
        return isUserAdmin;
      }

      // Fallback to RPC if profile fetch returns nothing
      const { data: rpcData } = await supabase.rpc('is_admin', { _user_id: userId });
      return rpcData === true;
    } catch (err) {
      console.error("Failed to check admin status:", err);
      return false;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true); // Ensure loading is true at start
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        if (initialSession?.user) {
          const adminStatus = await fetchRole(initialSession.user.id);
          setIsAdmin(adminStatus);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        // Step 1.1: Only set loading to false after fetchRole is complete
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        // We set loading for specific events to ensure role is fetched before UI updates
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          setLoading(true);
        }
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          const adminStatus = await fetchRole(currentSession.user.id);
          setIsAdmin(adminStatus);
        } else {
          setIsAdmin(false);
        }
        
        setLoading(false);
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
        adminStatus = await fetchRole(data.user.id);
        setIsAdmin(adminStatus);
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
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signIn, signUp, signOut }}>
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
