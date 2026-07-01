import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";
import { supabase } from "@/shared/integrations/supabase/client";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import AdminBreadcrumb from "./AdminBreadcrumb";
import UpgradeDialog from "./UpgradeDialog";
import { BrandingSettings, defaultBranding, menuItems } from "./adminMenuConfig";
import { Crown, Lock } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

// Build a Set of premium route paths from the menu config
const PREMIUM_PATHS = new Set(
  menuItems.filter((item) => item.premium).map((item) => item.href)
);

const PremiumBlock = ({ feature, onContact }: { feature: string; onContact: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center p-8">
    <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
      <Lock className="w-10 h-10 text-amber-600" />
    </div>
    <div className="space-y-2">
      <h2 className="text-2xl font-display font-bold flex items-center justify-center gap-2">
        <Crown className="w-6 h-6 text-amber-500" />
        Fitur Premium
      </h2>
      <p className="text-muted-foreground max-w-md">
        <strong>{feature}</strong> hanya tersedia di paket Premium.
        Hubungi kami untuk mengaktifkan fitur ini di sistem Anda.
      </p>
    </div>
    <Button onClick={onContact} className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
      <Crown className="w-4 h-4" />
      Upgrade ke Premium
    </Button>
  </div>
);

const AdminLayout = () => {
  const { role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [upgradeDialog, setUpgradeDialog] = useState({ open: false, feature: "" });

  const isSuperAdmin = role && ['superadmin', 'super_admin'].includes(role.toLowerCase());

  // Determine if current route is a premium-locked page for this user
  const currentPath = "/" + location.pathname.split("/").slice(1, 3).join("/");
  const currentMenuItem = menuItems.find((item) => item.href === location.pathname || item.href === currentPath);
  const isCurrentRoutePremium = currentMenuItem?.premium && !isSuperAdmin;
  const premiumFeatureName = currentMenuItem?.premiumFeature || currentMenuItem?.label || "Fitur Premium";

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
          <AdminBreadcrumb />
          {isCurrentRoutePremium ? (
            <PremiumBlock
              feature={premiumFeatureName}
              onContact={() => setUpgradeDialog({ open: true, feature: premiumFeatureName })}
            />
          ) : (
            <Outlet />
          )}
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
