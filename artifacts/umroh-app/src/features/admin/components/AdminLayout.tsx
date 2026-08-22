import { useEffect, useState } from "react";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";
import { apiFetch } from "@/shared/lib/apiClient";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import AdminBreadcrumb from "./AdminBreadcrumb";
import { type BrandingSettings, defaultBranding } from "./adminMenuConfig";
import { AdminQueryErrorBoundary } from "./AdminQueryErrorBoundary";
import { AdminHealthBanner } from "./AdminHealthBanner";
import { AdminSessionTimeoutModal } from "./AdminSessionTimeoutModal";
import { AdminThemeContext, useAdminThemeProvider } from "@/features/admin/hooks/useAdminTheme";
import { FeatureFlagsProvider, useFeatureFlags } from "@/features/admin/hooks/useFeatureFlags";
import { getFeatureForPath } from "@/features/admin/config/featureDefinitions";
import AdminFloatingChat from "./AdminFloatingChat";

const FeatureRouteGuard = () => {
  const location = useLocation();
  const { role } = useAuth();
  const { loading, isEnabled } = useFeatureFlags();
  const feature = getFeatureForPath(location.pathname);

  if (loading) return <div className="flex min-h-[240px] items-center justify-center p-8"><p className="text-sm text-muted-foreground">Memeriksa akses fitur...</p></div>;
  if (role !== "super_admin" && feature && !isEnabled(feature)) {
    return <Navigate to="/admin" replace state={{ featureDisabled: feature }} />;
  }
  return <Outlet />;
};

const AdminLayout = () => {
  const { role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const adminTheme = useAdminThemeProvider();
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
        const result = await apiFetch<{ data: Array<{ key: string; value: unknown }> }>("/api/cms/site-settings");
        const brandingSetting = result?.data?.find((s) => s.key === "branding");
        if (brandingSetting?.value && typeof brandingSetting.value === "object" && !Array.isArray(brandingSetting.value)) {
          setBranding({ ...defaultBranding, ...(brandingSetting.value as object) });
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
    <AdminThemeContext.Provider value={adminTheme}>
    <FeatureFlagsProvider>
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
            <FeatureRouteGuard />
          </AdminQueryErrorBoundary>
        </div>
      </main>

      {/* Session expiry warning modal */}
      <AdminSessionTimeoutModal />

      {/* Floating chat widget — visible on all admin pages */}
      <AdminFloatingChat />
    </div>
    </FeatureFlagsProvider>
    </AdminThemeContext.Provider>
  );
};

export default AdminLayout;
