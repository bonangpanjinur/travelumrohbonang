import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import UpgradeDialog from "./UpgradeDialog";
import { BrandingSettings, defaultBranding } from "./adminMenuConfig";

const AdminLayout = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [upgradeDialog, setUpgradeDialog] = useState({ open: false, feature: "" });

  useEffect(() => {
    // Only redirect if loading is finished
    if (!loading) {
      if (!user) {
        console.log("AdminLayout: No user found, redirecting to /auth");
        navigate("/auth");
      } else if (!isAdmin) {
        console.log("AdminLayout: User is not an admin, redirecting to /");
        navigate("/");
      }
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    const fetchBranding = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "branding")
        .eq("category", "general")
        .single();

      if (data?.value && typeof data.value === 'object') {
        setBranding({ ...defaultBranding, ...(data.value as object) });
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

  // Return loading spinner while authentication status is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  // Prevent rendering if not authorized (redirect will happen in useEffect)
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
          {/* Ensure Outlet is present to render child routes like Dashboard */}
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
