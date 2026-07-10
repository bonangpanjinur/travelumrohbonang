import { Toaster } from "@/shared/components/ui/toaster";
import { Toaster as Sonner } from "@/shared/components/ui/sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/shared/hooks/useAuth";
import { LanguageProvider } from "@/shared/i18n/LanguageContext";
import { ThemeProvider } from "@/shared/hooks/useTheme";
import { TenantProvider, useTenant } from "@/shared/hooks/useTenant";
import { useDynamicFavicon } from "@/shared/hooks/useDynamicFavicon";
import { useActiveTemplate } from "@/features/tenant/hooks/useActiveTemplate";
import Index from "./features/cms/pages/Index";
import Paket from "./features/paket/pages/Paket";
import PackageDetail from "./features/paket/pages/PackageDetail";
import Auth from "./features/auth/pages/Auth";
import Booking from "./features/booking/pages/Booking";
import Payment from "./features/booking/pages/Payment";
import MyBookings from "./features/booking/pages/MyBookings";
import Profile from "./features/jamaah/pages/Profile";
import Dashboard from "./features/dashboard/pages/Dashboard";
import Gallery from "./features/cms/pages/Gallery";
import Blog from "./features/cms/pages/Blog";
import BlogDetail from "./features/cms/pages/BlogDetail";
import FAQPage from "./features/cms/pages/FAQ";
import DynamicPage from "./features/cms/pages/DynamicPage";
import TenantSitePage from "./features/tenant/pages/TenantSite";
import MyUpgrades from "./features/jamaah/pages/MyUpgrades";
import MyDocuments from "./features/jamaah/pages/MyDocuments";
import AgentPortal from "./features/agent/pages/AgentPortal";
import BranchDashboard from "./features/dashboard/pages/BranchDashboard";
import NotFound from "./pages/NotFound";

// Admin
import AdminLayout from "@/features/admin/components/AdminLayout";
import AdminRoute from "@/features/admin/AdminRoute";
import AuthRoute from "@/shared/components/common/AuthRoute";
import ImpersonationBanner from "@/shared/components/common/ImpersonationBanner";
import AdminDashboard from "./features/admin/pages/Dashboard";
import AdminPackages from "./features/admin/pages/Packages";
import AdminDepartures from "./features/admin/pages/Departures";
import AdminBookings from "./features/admin/pages/Bookings";
import AdminPayments from "./features/admin/pages/Payments";
import AdminItineraries from "./features/admin/pages/Itineraries";
import AdminReports from "./features/admin/pages/Reports";
import AdminAnalyticsDashboard from "./features/admin/pages/AnalyticsDashboard";
import AdminNotificationsPage from "./features/admin/pages/AdminNotifications";
import AdminPages from "./features/admin/pages/Pages";
import AdminHotels from "./features/admin/pages/Hotels";
import AdminAirlines from "./features/admin/pages/Airlines";
import AdminAirports from "./features/admin/pages/Airports";
import AdminBranches from "./features/admin/pages/Branches";
import AdminGallery from "./features/admin/pages/Gallery";
import AdminTestimonials from "./features/admin/pages/Testimonials";
import AdminFAQ from "./features/admin/pages/FAQ";
import AdminFloatingButtons from "./features/admin/pages/FloatingButtons";
import AdminBlog from "./features/admin/pages/Blog";
import AdminSettings from "./features/admin/pages/Settings";
import AdminNavigation from "./features/admin/pages/Navigation";
import AdminPilgrims from "./features/admin/pages/Pilgrims";
import AdminAgents from "./features/admin/pages/Agents";
import AdminMuthawifs from "./features/admin/pages/Muthawifs";
import AdminUsers from "./features/admin/pages/Users";
import AdminCoupons from "./features/admin/pages/Coupons";
import AdminAdvantages from "./features/admin/pages/Advantages";
import AdminGuideSteps from "./features/admin/pages/GuideSteps";
import AdminServices from "./features/admin/pages/Services";
import AdminPlaceholder from "./features/admin/pages/Placeholder";
import AdminAccounting from "./features/admin/pages/Accounting";
import AdminCRM from "./features/admin/pages/CRM";
import AdminDocuments from "./features/admin/pages/Documents";
import AdminPaymentGateway from "./features/admin/pages/PaymentGateway";
import AdminAnalyticsAI from "./features/admin/pages/AnalyticsAI";
import AdminMultiBranch from "./features/admin/pages/MultiBranch";
import AdminTenantSites from "./features/admin/pages/TenantSites";
import AdminTemplateUpgrades from "./features/admin/pages/TemplateUpgrades";
import AdminInstallments from "./features/admin/pages/Installments";
import AdminManifest from "./features/admin/pages/Manifest";
import AdminProofAccessLogs from "./features/admin/pages/PaymentProofAccessLogs";
import AdminAgentWithdrawals from "./features/admin/pages/AgentWithdrawals";
import AdminRefunds from "./features/admin/pages/Refunds";
import AdminContracts from "./features/admin/pages/AdminContracts";
import AdminAuditLogs from "./features/admin/pages/AuditLogs";
import AdminSystemHealth from "./features/admin/pages/SystemHealth";
import AdminSlugRedirects from "./features/admin/pages/SlugRedirects";
import AdminRoleManagement from "./features/admin/pages/RoleManagement";
import AdminChats from "./features/admin/pages/Chats";
import AgentCommissions from "./features/agent/pages/AgentCommissions";
import RefundRequest from "./features/booking/pages/RefundRequest";
import ETicket from "./features/booking/pages/ETicket";
import AdminLeaderboard from "./features/admin/pages/Leaderboard";
import AdminCurrencies from "./features/admin/pages/Currencies";
import { CurrencyProvider } from "@/shared/hooks/useCurrency";
import Wishlist from "./features/wishlist/pages/Wishlist";
import Compare from "./features/paket/pages/Compare";
import AdminReviews from "./features/admin/pages/Reviews";
import AdminLoyalty from "./features/admin/pages/Loyalty";
import AdminDepartureGallery from "./features/admin/pages/DepartureGallery";
import AdminCheckIn from "./features/admin/pages/CheckIn";
import AdminManasik from "./features/admin/pages/Manasik";
import Manasik from "./features/cms/pages/Manasik";
import AffiliateRedirect from "./features/agent/pages/AffiliateRedirect";
import Account2FA from "./features/auth/pages/Account2FA";
import ContractSign from "./features/jamaah/pages/ContractSign";
import AdminErrorLogs from "./features/admin/pages/ErrorLogs";
import AdminRestDiagLogs from "./features/admin/pages/RestDiagLogs";
import AdminIncidentReportView from "./features/admin/pages/IncidentReportView";
import AdminIntegrations from "./features/admin/pages/Integrations";
import AdminLoginSettings from "./features/admin/pages/LoginSettings";
import AdminSEO from "./features/admin/pages/SEO";
import PackageCosts from "./features/admin/pages/PackageCosts";
import AdminPackageCategories from "./features/admin/pages/PackageCategories";
import AdminMenuPermissions from "./features/admin/pages/MenuPermissions";
import { useEffect } from "react";
import { installGlobalErrorHandlers } from "@/shared/lib/errorLogger";
import ErrorBoundary from "@/shared/components/common/ErrorBoundary";
const queryClient = new QueryClient();

const AppContent = () => {
  useDynamicFavicon();
  useActiveTemplate();
  useEffect(() => { installGlobalErrorHandlers(); }, []);
  const { isTenantSite, loading: tenantLoading } = useTenant();

  if (tenantLoading) {
    return <div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>;
  }

  // If this is a tenant subdomain, render the tenant site
  if (isTenantSite) {
    return <TenantSitePage />;
  }

  return (
    <>
      <ImpersonationBanner />
      <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Index />} />
      <Route path="/paket" element={<Paket />} />
      <Route path="/paket/:slug" element={<PackageDetail />} />
      <Route path="/bandingkan" element={<Compare />} />
      <Route path="/auth" element={<Auth />} />
      {/* Protected User Routes */}
      <Route element={<AuthRoute />}>
        <Route path="/booking/:slug/:departureId" element={<Booking />} />
        <Route path="/booking/payment/:bookingId" element={<Payment />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/my-upgrades" element={<MyUpgrades />} />
        <Route path="/my-documents" element={<MyDocuments />} />
        <Route path="/agent-portal" element={<AgentPortal />} />
        <Route path="/agent-commissions" element={<AgentCommissions />} />
        <Route path="/refund-request" element={<RefundRequest />} />
        <Route path="/e-ticket/:bookingId" element={<ETicket />} />
        <Route path="/branch-dashboard" element={<BranchDashboard />} />
        <Route path="/account/2fa" element={<Account2FA />} />
        <Route path="/contract/:bookingId" element={<ContractSign />} />
      </Route>
      <Route path="/galeri" element={<Gallery />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogDetail />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route path="/manasik" element={<Manasik />} />
      <Route path="/r/:code" element={<AffiliateRedirect />} />

      {/* Admin Routes */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="packages" element={<AdminPackages />} />
          <Route path="departures" element={<AdminDepartures />} />
          <Route path="itineraries" element={<AdminItineraries />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="analytics" element={<AdminAnalyticsDashboard />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
          <Route path="pilgrims" element={<AdminPilgrims />} />
          <Route path="branches" element={<AdminBranches />} />
          <Route path="agents" element={<AdminAgents />} />
          <Route path="muthawifs" element={<AdminMuthawifs />} />
          <Route path="hotels" element={<AdminHotels />} />
          <Route path="airlines" element={<AdminAirlines />} />
          <Route path="airports" element={<AdminAirports />} />
          <Route path="gallery" element={<AdminGallery />} />
          <Route path="testimonials" element={<AdminTestimonials />} />
          <Route path="faq" element={<AdminFAQ />} />
          <Route path="floating-buttons" element={<AdminFloatingButtons />} />
          <Route path="blog" element={<AdminBlog />} />
          <Route path="pages" element={<AdminPages />} />
          <Route path="navigation" element={<AdminNavigation />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="advantages" element={<AdminAdvantages />} />
          <Route path="guide-steps" element={<AdminGuideSteps />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="settings" element={<AdminSettings />} />
          {/* Premium routes */}
          <Route path="accounting" element={<AdminAccounting />} />
          <Route path="package-costs" element={<PackageCosts />} />
          <Route path="crm" element={<AdminCRM />} />
          <Route path="payment-gateway" element={<AdminPaymentGateway />} />
          <Route path="documents" element={<AdminDocuments />} />
          <Route path="analytics-ai" element={<AdminAnalyticsAI />} />
          <Route path="multi-language" element={<AdminPlaceholder title="Multi-Bahasa" />} />
          <Route path="multi-branch" element={<AdminMultiBranch />} />
          <Route path="tenant-sites" element={<AdminTenantSites />} />
          <Route path="template-upgrades" element={<AdminTemplateUpgrades />} />
          <Route path="installments" element={<AdminInstallments />} />
          <Route path="manifest" element={<AdminManifest />} />
          <Route path="proof-access-logs" element={<AdminProofAccessLogs />} />
          <Route path="agent-withdrawals" element={<AdminAgentWithdrawals />} />
          <Route path="refunds" element={<AdminRefunds />} />
          <Route path="contracts" element={<AdminContracts />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
          <Route path="system-health" element={<AdminSystemHealth />} />
          <Route path="role-management" element={<AdminRoleManagement />} />
          <Route path="chats" element={<AdminChats />} />
          <Route path="leaderboard" element={<AdminLeaderboard />} />
          <Route path="currencies" element={<AdminCurrencies />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="loyalty" element={<AdminLoyalty />} />
          <Route path="slug-redirects" element={<AdminSlugRedirects />} />
          <Route path="package-categories" element={<AdminPackageCategories />} />
          <Route path="departure-gallery" element={<AdminDepartureGallery />} />
          <Route path="check-in" element={<AdminCheckIn />} />
          <Route path="manasik" element={<AdminManasik />} />
          <Route path="error-logs" element={<AdminErrorLogs />} />
          <Route path="rest-diag" element={<AdminRestDiagLogs />} />
          <Route path="incident-reports/:id" element={<AdminIncidentReportView />} />
          <Route path="integrations" element={<AdminIntegrations />} />
          <Route path="login-settings" element={<AdminLoginSettings />} />
          <Route path="seo" element={<AdminSEO />} />
          <Route path="menu-permissions" element={<AdminMenuPermissions />} />
        </Route>
      </Route>

      {/* CMS Dynamic Page */}
      <Route path="/:slug" element={<DynamicPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <ThemeProvider>
            <TenantProvider>
              <CurrencyProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <ErrorBoundary>
                      <AppContent />
                    </ErrorBoundary>
                  </BrowserRouter>
                </TooltipProvider>
              </CurrencyProvider>
            </TenantProvider>
          </ThemeProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
