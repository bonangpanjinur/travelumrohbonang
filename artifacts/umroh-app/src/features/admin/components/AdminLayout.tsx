import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";
import { supabase } from "@/shared/integrations/supabase/client";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import AdminBreadcrumb from "./AdminBreadcrumb";
import { type BrandingSettings, defaultBranding } from "./adminMenuConfig";
import { AdminQueryErrorBoundary } from "./AdminQueryErrorBoundary";
import { AdminHealthBanner } from "./AdminHealthBanner";
import { AdminSessionTimeoutModal } from "./AdminSessionTimeoutModal";

const AdminLayout = () => {
  const { role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("admin-sidebar-collapsed") === "1";
  });
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("admin-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  };

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "branding")
          .eq("category", "general")
          .maybeSingle();

        if (
          data?.value &&
          typeof data.value === "object" &&
          !Array.isArray(data.value)
        ) {
          setBranding({ ...defaultBranding, ...(data.value as object) });
        }
      } catch (error) {
        console.error("Error fetching branding:", error);
      }
    };
    fetchBranding();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error("[AdminLayout] signOut error:", err);
    } finally {
      navigate("/");
    }
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
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
      />

      {/* Main Content */}
      <main className={`min-h-screen pt-16 lg:pt-0 transition-[margin] duration-200 ${sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"}`}>
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
