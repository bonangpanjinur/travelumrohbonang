import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [upgradeDialog, setUpgradeDialog] = useState({ open: false, feature: "" });
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      // Wait until useAuth finished its initial loading
      if (loading) return;

      console.log("AdminLayout: Checking access...", { hasUser: !!user, isAdmin });

      if (!user) {
        console.log("AdminLayout: No user, redirecting to /auth");
        navigate("/auth", { state: { from: location.pathname } });
      } else if (!isAdmin) {
        console.log("AdminLayout: Not an admin, redirecting to home");
        navigate("/");
      } else {
        console.log("AdminLayout: Access granted");
        setIsChecking(false);
      }
    };

    checkAccess();
  }, [user, isAdmin, loading, navigate, location.pathname]);

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

  const handlePremiumClick = (feature: string) => {
    setUpgradeDialog({ open: true, feature });
  };

  // Show loading screen if useAuth is loading OR if we are still verifying access
  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-[#D4AF37]" />
        <div className="text-center space-y-2">
          <p className="text-lg font-medium animate-pulse">Memverifikasi Akses Admin...</p>
          <p className="text-sm text-muted-foreground">Mohon tunggu sebentar.</p>
        </div>
      </div>
    );
  }

  // Double check to prevent flash of content if state hasn't updated yet
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
        onPremiumClick={handlePremiumClick}
      />

      {/* Main Content */}
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
