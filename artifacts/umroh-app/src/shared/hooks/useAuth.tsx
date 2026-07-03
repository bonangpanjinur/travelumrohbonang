import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useAuth as useReplitAuth, type AuthUser } from "@workspace/replit-auth-web";

export type { AuthUser };

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoading, login, logout } = useReplitAuth();

  const role = user?.role ?? null;
  const isAdmin = role === "admin";

  const refreshRole = useCallback(async () => {
    window.location.reload();
  }, []);

  const signOut = useCallback(async () => {
    logout();
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{ user, loading: isLoading, isAdmin, role, refreshRole, login, signOut }}
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
