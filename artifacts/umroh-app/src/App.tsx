import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import ForgotPassword from "./features/auth/pages/ForgotPassword";
import ResetPassword from "./features/auth/pages/ResetPassword";
import Booking from "./features/booking/pages/Booking";
import Payment from "./features/booking/pages/Payment";
import MyBookings from "./features/booking/pages/MyBookings";
import Profile from "./features/jamaah/pages/Profile";
import Dashboard from "./features/dashboard/pages/Dashboard";
import Gallery from "./features/cms/pages/Gallery";
import Blog from "./features/cms/pages/Blog";
import BlogDetail from "./features/cms/pages/BlogDetail";
import DynamicPage from "./features/cms/pages/DynamicPage";
import TenantSitePage from "./features/tenant/pages/TenantSite";
import MyUpgrades from "./features/jamaah/pages/MyUpgrades";
import MyDocuments from "./features/jamaah/pages/MyDocuments";
import AgentPortal from "./features/agent/pages/AgentPortal";
import BranchDashboard from "./features/dashboard/pages/BranchDashboard";
import NotFound from "./pages/NotFound";

// Admin
import AdminLayout from "@/admin/components/AdminLayout";
import AdminRoute from "@/admin/AdminRoute";
import AuthRoute from "@/shared/components/AuthRoute";
import ImpersonationBanner from "@/shared/components/ImpersonationBanner";
import AdminDashboard from "./admin/pages/Dashboard";
import AdminPackages from "./admin/pages/Packages";
import AdminDepartures from "./admin/pages/Departures";
import AdminBookings from "./admin/pages/Bookings";
import AdminPayments from "./admin/pages/Payments";
import AdminItineraries from "./admin/pages/Itineraries";
import AdminReports from "./admin/pages/Reports";
import AdminPages from "./admin/pages/Pages";
import AdminHotels from "./admin/pages/Hotels";
import AdminAirlines from "./admin/pages/Airlines";
import AdminAirports from "./admin/pages/Airports";
import AdminBranches from "./admin/pages/Branches";
import AdminGallery from "./admin/pages/Gallery";
import AdminTestimonials from "./admin/pages/Testimonials";
import AdminFAQ from "./admin/pages/FAQ";
import AdminFloatingButtons from "./admin/pages/FloatingButtons";
import AdminBlog from "./admin/pages/Blog";
import AdminSettings from "./admin/pages/Settings";
import AdminNavigation from "./admin/pages/Navigation";
import AdminPilgrims from "./admin/pages/Pilgrims";
import AdminAgents from "./admin/pages/Agents";
import AdminMuthawifs from "./admin/pages/Muthawifs";
import AdminUsers from "./admin/pages/Users";
import AdminCoupons from "./admin/pages/Coupons";
import AdminAdvantages from "./admin/pages/Advantages";
import AdminGuideSteps from "./admin/pages/GuideSteps";
import AdminServices from "./admin/pages/Services";
import AdminPlaceholder from "./admin/pages/Placeholder";
import AdminAccounting from "./admin/pages/Accounting";
import AdminCRM from "./admin/pages/CRM";
import AdminDocuments from "./admin/pages/Documents";
import AdminPaymentGateway from "./admin/pages/PaymentGateway";
import AdminAnalyticsAI from "./admin/pages/AnalyticsAI";
import AdminMultiBranch from "./admin/pages/MultiBranch";
import AdminTenantSites from "./admin/pages/TenantSites";
import AdminTemplateUpgrades from "./admin/pages/TemplateUpgrades";
import AdminInstallments from "./admin/pages/Installments";
import AdminManifest from "./admin/pages/Manifest";
import AdminProofAccessLogs from "./admin/pages/PaymentProofAccessLogs";
import AdminAgentWithdrawals from "./admin/pages/AgentWithdrawals";
import AdminRefunds from "./admin/pages/Refunds";
import AdminAuditLogs from "./admin/pages/AuditLogs";
import AdminSlugRedirects from "./admin/pages/SlugRedirects";
import AdminRoleManagement from "./admin/pages/RoleManagement";
import AdminChats from "./admin/pages/Chats";
import AgentCommissions from "./features/agent/pages/AgentCommissions";
import RefundRequest from "./features/booking/pages/RefundRequest";
import ETicket from "./features/booking/pages/ETicket";
import AdminLeaderboard from "./admin/pages/Leaderboard";
import AdminCurrencies from "./admin/pages/Currencies";
import { CurrencyProvider } from "@/shared/hooks/useCurrency";
import Wishlist from "./features/paket/pages/Wishlist";
import Compare from "./features/paket/pages/Compare";
import AdminReviews from "./admin/pages/Reviews";
import AdminLoyalty from "./admin/pages/Loyalty";
import AdminDepartureGallery from "./admin/pages/DepartureGallery";
import AdminCheckIn from "./admin/pages/CheckIn";
import AdminManasik from "./admin/pages/Manasik";
import Manasik from "./features/cms/pages/Manasik";
import AffiliateRedirect from "./features/agent/pages/AffiliateRedirect";
import Account2FA from "./features/auth/pages/Account2FA";
import ContractSign from "./features/jamaah/pages/ContractSign";
import AdminErrorLogs from "./admin/pages/ErrorLogs";
import AdminIntegrations from "./admin/pages/Integrations";
import AdminLoginSettings from "./admin/pages/LoginSettings";
import AdminSEO from "./admin/pages/SEO";
import PackageCosts from "./admin/pages/PackageCosts";
import { useEffect } from "react";
import { installGlobalErrorHandlers } from "@/shared/lib/errorLogger";
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
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
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
          <Route path="audit-logs" element={<AdminAuditLogs />} />
          <Route path="role-management" element={<AdminRoleManagement />} />
          <Route path="chats" element={<AdminChats />} />
          <Route path="leaderboard" element={<AdminLeaderboard />} />
          <Route path="currencies" element={<AdminCurrencies />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="loyalty" element={<AdminLoyalty />} />
          <Route path="slug-redirects" element={<AdminSlugRedirects />} />
          <Route path="departure-gallery" element={<AdminDepartureGallery />} />
          <Route path="check-in" element={<AdminCheckIn />} />
          <Route path="manasik" element={<AdminManasik />} />
          <Route path="error-logs" element={<AdminErrorLogs />} />
          <Route path="integrations" element={<AdminIntegrations />} />
          <Route path="login-settings" element={<AdminLoginSettings />} />
          <Route path="seo" element={<AdminSEO />} />
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
                    <AppContent />
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
