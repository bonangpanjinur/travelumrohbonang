import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, profile, loading: authLoading } = useAuth();
  const location = useLocation();

  // 1. Tampilkan Loading Screen yang Proper saat Auth sedang memproses
  // Kita cek authLoading (dari hook) dan juga memastikan jika session ada, profile juga harus sudah ada sebelum render
  if (authLoading || (session && !profile)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Memverifikasi akses admin...</p>
      </div>
    );
  }

  // 2. Jika tidak ada session (belum login), lempar ke halaman Auth
  if (!session) {
    // State 'from' berguna agar setelah login user dikembalikan ke halaman admin yang tadi dia akses
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // 3. Jika sudah login tapi role bukan admin/super_admin, lempar ke Dashboard User biasa
  // Menggunakan optional chaining (?.) untuk keamanan ekstra
  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    console.warn("Unauthorized access attempt to admin area by user:", profile?.id);
    return <Navigate to="/dashboard" replace />;
  }

  // 4. Jika lolos semua cek, render halaman Admin
  return <>{children}</>;
};
