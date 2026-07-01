import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";
import { supabase } from "@/shared/integrations/supabase/client";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import AdminBreadcrumb from "./AdminBreadcrumb";
import { BrandingSettings, defaultBranding } from "./adminMenuConfig";
import { AdminQueryErrorBoundary } from "./AdminQueryErrorBoundary";
import { AdminHealthBanner } from "./AdminHealthBanner";
import { AdminSessionTimeoutModal } from "./AdminSessionTimeoutModal";

const AdminLayout = () => {
  const { role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);

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
      {/* Global health banner — shown when Supabase is unreachable */}
      <AdminHealthBanner />

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
      />

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          <AdminBreadcrumb />
          {/* key={location.pathname} resets the boundary on every route change
              so a crash on one page doesn't bleed into the next page. */}
          <AdminQueryErrorBoundary key={location.pathname}>
            <Outlet />
          </AdminQueryErrorBoundary>
        </div>
      </main>

      {/* Session expiry warning modal */}
      <AdminSessionTimeoutModal />
    </div>
  );
};

export default AdminLayout;
