import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export const AdminRoute = () => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-[#D4AF37]" />
        <p className="text-muted-foreground animate-pulse">Memverifikasi Akses...</p>
      </div>
    );
  }

  // Cek apakah user login DAN memiliki role admin
  if (!user || !isAdmin) {
    console.log("Akses Admin Ditolak: Redirect ke halaman utama");
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
