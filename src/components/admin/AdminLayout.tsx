import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import UpgradeDialog from "./UpgradeDialog";
import { BrandingSettings, defaultBranding } from "./adminMenuConfig";
import { Loader2 } from "lucide-react";

const AdminLayout = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [upgradeDialog, setUpgradeDialog] = useState({ open: false, feature: "" });

  // Step 2.1: Move redirect logic into useEffect
  useEffect(() => {
    if (!loading) {
      if (!user) {
        console.log("Akses ditolak: Tidak ada user, redirect ke /auth");
        navigate("/auth");
      } else if (!isAdmin) {
        console.log("Akses ditolak: User bukan admin, redirect ke /");
        navigate("/");
      }
    }
  }, [user, isAdmin, loading, navigate]);

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

  // Step 2.1: Show Loading Spinner if loading is true
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-[#D4AF37]" />
        <p className="text-muted-foreground animate-pulse">Memuat Dashboard...</p>
      </div>
    );
  }

  // Prevent rendering content if not authorized
  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Mobile Header */}
      <AdminHeader 
        branding={branding} 
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)} 
      />

      {/* Sidebar */}
      <AdminSidebar
        branding={branding}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
        onPremiumClick={(feature) => setUpgradeDialog({ open: true, feature })}
      />

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          {/* Step 2.1: Ensure Outlet is present */}
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
