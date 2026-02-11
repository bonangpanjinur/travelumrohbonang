import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export const AdminRoute = () => {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  // 1. Prevent Premature Redirect: Show loading while checking status
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-[#D4AF37]" />
        <p className="text-muted-foreground animate-pulse font-medium">Memverifikasi Akses Admin...</p>
      </div>
    );
  }

  // 2. Only redirect if loading is finished AND user is not admin
  if (!user || !isAdmin) {
    console.warn("Akses Admin Ditolak: User tidak terautentikasi atau bukan admin. Redirecting...");
    // Store the attempted path to redirect back after login if needed
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // 3. Access granted
  return <Outlet />;
};
