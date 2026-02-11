import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import UpgradeDialog from "./UpgradeDialog";
import { BrandingSettings, defaultBranding } from "./adminMenuConfig";
import { Loader2, AlertCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminLayout = () => {
  const { user, isAdmin, loading, userRole, signOut, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [upgradeDialog, setUpgradeDialog] = useState({ open: false, feature: "" });
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!loading) {
      console.log("[AdminLayout] Auth check complete:", { hasUser: !!user, isAdmin, role: userRole });
      if (user && isAdmin) {
        setIsChecking(false);
      } else if (!user && !loading) {
        // Only redirect if we're sure there's no user
        navigate("/auth", { state: { from: location.pathname } });
      }
    }
  }, [user, isAdmin, loading, navigate, location.pathname, userRole]);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "branding")
          .eq("category", "general")
          .maybeSingle();

        if (data?.value && typeof data.value === 'object') {
          setBranding({ ...defaultBranding, ...(data.value as object) });
        }
      } catch (error) {
        console.error("Error fetching branding:", error);
      }
    };
    fetchBranding();
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-[#D4AF37]" />
        <p className="text-lg font-medium animate-pulse">Memuat Data Autentikasi...</p>
      </div>
    );
  }

  // 2. Access Denied / Debug State
  // If we have a user but they are NOT an admin, show a helpful error instead of just redirecting
  if (user && !isAdmin && !loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-red-100 p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-red-50 p-4 rounded-full">
              <ShieldAlert className="h-12 w-12 text-red-600" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Akses Ditolak</h1>
            <p className="text-slate-600">
              Akun Anda tidak memiliki izin untuk mengakses Dashboard Admin.
            </p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 text-left text-sm font-mono border border-slate-200">
            <p className="text-slate-500 mb-1 font-sans text-xs uppercase tracking-wider">Debug Info:</p>
            <p><span className="text-slate-400">Email:</span> {user.email}</p>
            <p><span className="text-slate-400">ID:</span> {user.id.substring(0, 8)}...</p>
            <p><span className="text-slate-400">Role di DB:</span> <span className="text-red-600 font-bold">{userRole || 'Tidak ditemukan'}</span></p>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={() => refreshAuth()} variant="outline" className="w-full">
              Coba Segarkan Status
            </Button>
            <Button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white">
              Keluar & Gunakan Akun Lain
            </Button>
            <Button onClick={() => navigate('/')} variant="ghost" className="w-full">
              Kembali ke Beranda
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Final Check
  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted">
      <AdminHeader 
        branding={branding} 
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)} 
      />

      <AdminSidebar
        branding={branding}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
        onPremiumClick={(feature) => setUpgradeDialog({ open: true, feature })}
      />

      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
      
      <UpgradeDialog
        open={upgradeDialog.open}
        onOpenChange={(open) => setUpgradeDialog({ ...upgradeDialog, open })}
        featureName={upgradeDialog.feature}
      />
    </div>
  );
};

export default AdminLayout;
