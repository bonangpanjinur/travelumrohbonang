import { Toaster } from "@/shared/components/ui/toaster";
import { lazy, Suspense, useEffect } from "react";
import { installGlobalErrorHandlers } from "@/shared/lib/errorLogger";
import ErrorBoundary from "@/shared/components/common/ErrorBoundary";
import MobileBottomNav from "@/shared/components/layout/MobileBottomNav";
import GlobalFloatingWidgets from "@/shared/components/common/GlobalFloatingWidgets";
import PWAInstallPrompt from "@/shared/components/pwa/PWAInstallPrompt";
import { Toaster as Sonner } from "@/shared/components/ui/sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import PortalJamaah from "./features/jamaah/pages/PortalJamaah";
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
import TrackBooking from "./pages/TrackBooking";

// Admin
import AdminLayout from "@/features/admin/components/AdminLayout";
import AdminRoute from "@/features/admin/AdminRoute";
import AuthRoute from "@/shared/components/common/AuthRoute";
import ImpersonationBanner from "@/shared/components/common/ImpersonationBanner";
const AdminDashboard = lazy(() => import("./features/admin/pages/Dashboard"));
const AdminPackages = lazy(() => import("./features/admin/pages/Packages"));
const AdminDepartures = lazy(() => import("./features/admin/pages/Departures"));
const AdminBookings = lazy(() => import("./features/admin/pages/Bookings"));
const AdminBookingDetail = lazy(() => import("./features/admin/pages/BookingDetailPage"));
const AdminPayments = lazy(() => import("./features/admin/pages/Payments"));
const AdminItineraries = lazy(() => import("./features/admin/pages/Itineraries"));
const AdminReports = lazy(() => import("./features/admin/pages/Reports"));
const AdminAnalyticsDashboard = lazy(() => import("./features/admin/pages/AnalyticsDashboard"));
const AdminNotificationsPage = lazy(() => import("./features/admin/pages/AdminNotifications"));
const AdminPages = lazy(() => import("./features/admin/pages/Pages"));
const AdminHotels = lazy(() => import("./features/admin/pages/Hotels"));
const AdminAirlines = lazy(() => import("./features/admin/pages/Airlines"));
const AdminEquipment = lazy(() => import("./features/admin/pages/Equipment"));
const AdminAirports = lazy(() => import("./features/admin/pages/Airports"));
const AdminBranches = lazy(() => import("./features/admin/pages/Branches"));
const AdminGallery = lazy(() => import("./features/admin/pages/Gallery"));
const AdminTestimonials = lazy(() => import("./features/admin/pages/Testimonials"));
const AdminFAQ = lazy(() => import("./features/admin/pages/FAQ"));
const AdminFloatingButtons = lazy(() => import("./features/admin/pages/FloatingButtons"));
const AdminBlog = lazy(() => import("./features/admin/pages/Blog"));
const AdminSettings = lazy(() => import("./features/admin/pages/Settings"));
const AdminNavigation = lazy(() => import("./features/admin/pages/Navigation"));
const AdminPilgrims = lazy(() => import("./features/admin/pages/Pilgrims"));
const AdminPilgrimsDatabase = lazy(() => import("./features/admin/pages/PilgrimsDatabase"));
const AdminAgents = lazy(() => import("./features/admin/pages/Agents"));
const AdminMuthawifs = lazy(() => import("./features/admin/pages/Muthawifs"));
const AdminUsers = lazy(() => import("./features/admin/pages/Users"));
const AdminCoupons = lazy(() => import("./features/admin/pages/Coupons"));
const AdminAdvantages = lazy(() => import("./features/admin/pages/Advantages"));
const AdminGuideSteps = lazy(() => import("./features/admin/pages/GuideSteps"));
const AdminServices = lazy(() => import("./features/admin/pages/Services"));
const AdminPlaceholder = lazy(() => import("./features/admin/pages/Placeholder"));
const AdminAccounting = lazy(() => import("./features/admin/pages/Accounting"));
const AdminCRM = lazy(() => import("./features/admin/pages/CRM"));
const AdminDocuments = lazy(() => import("./features/admin/pages/Documents"));
// AdminDocumentTypes route now redirects to /admin/documents?tab=pengaturan
const AdminPaymentGateway = lazy(() => import("./features/admin/pages/PaymentGateway"));
const AdminAnalyticsAI = lazy(() => import("./features/admin/pages/AnalyticsAI"));
const AdminMultiBranch = lazy(() => import("./features/admin/pages/MultiBranch"));
const AdminTenantSites = lazy(() => import("./features/admin/pages/TenantSites"));
const AdminTemplateUpgrades = lazy(() => import("./features/admin/pages/TemplateUpgrades"));
const AdminInstallments = lazy(() => import("./features/admin/pages/Installments"));
const AdminSavings = lazy(() => import("./features/admin/pages/Savings"));
import MySavings from "./features/jamaah/pages/MySavings";
const AdminManifest = lazy(() => import("./features/admin/pages/Manifest"));
const AdminEquipmentReport = lazy(() => import("./features/admin/pages/EquipmentReport"));
const AdminProofAccessLogs = lazy(() => import("./features/admin/pages/PaymentProofAccessLogs"));
const AdminAgentWithdrawals = lazy(() => import("./features/admin/pages/AgentWithdrawals"));
const AdminRefunds = lazy(() => import("./features/admin/pages/Refunds"));
const AdminContracts = lazy(() => import("./features/admin/pages/AdminContracts"));
const AdminAuditLogs = lazy(() => import("./features/admin/pages/AuditLogs"));
const AdminSystemHealth = lazy(() => import("./features/admin/pages/SystemHealth"));
const AdminSlugRedirects = lazy(() => import("./features/admin/pages/SlugRedirects"));
const AdminChats = lazy(() => import("./features/admin/pages/Chats"));
const ChatInbox = lazy(() => import("./features/admin/pages/ChatInbox"));
import ChatPage from "./features/user/pages/ChatPage";
import AgentCommissions from "./features/agent/pages/AgentCommissions";
import MuthawifDashboard from "./features/muthawif/pages/MuthawifDashboard";
import MuthawifJamaahList from "./features/muthawif/pages/MuthawifJamaahList";
import MuthawifLaporanHarian from "./features/muthawif/pages/MuthawifLaporanHarian";
import RefundRequest from "./features/booking/pages/RefundRequest";
import ETicket from "./features/booking/pages/ETicket";
const AdminLeaderboard = lazy(() => import("./features/admin/pages/Leaderboard"));
const AdminCurrencies = lazy(() => import("./features/admin/pages/Currencies"));
import { CurrencyProvider } from "@/shared/hooks/useCurrency";
import Wishlist from "./features/wishlist/pages/Wishlist";
import Loyalty from "./features/loyalty/pages/Loyalty";
import Compare from "./features/paket/pages/Compare";
const AdminReviews = lazy(() => import("./features/admin/pages/Reviews"));
const AdminLoyalty = lazy(() => import("./features/admin/pages/Loyalty"));
const AdminDepartureGallery = lazy(() => import("./features/admin/pages/DepartureGallery"));
const AdminCheckIn = lazy(() => import("./features/admin/pages/CheckIn"));
const AdminRoomAssignment = lazy(() => import("./features/admin/pages/RoomAssignment"));
const AdminSocialKit = lazy(() => import("./features/admin/pages/SocialKit"));
const AdminManasik = lazy(() => import("./features/admin/pages/Manasik"));
import Manasik from "./features/cms/pages/Manasik";
import Jadwal from "./features/cms/pages/Jadwal";
import AffiliateRedirect from "./features/agent/pages/AffiliateRedirect";
import Account2FA from "./features/auth/pages/Account2FA";
import ContractSign from "./features/jamaah/pages/ContractSign";
const AdminErrorLogs = lazy(() => import("./features/admin/pages/ErrorLogs"));
const AdminRestDiagLogs = lazy(() => import("./features/admin/pages/RestDiagLogs"));
const AdminIncidentReportView = lazy(() => import("./features/admin/pages/IncidentReportView"));
const AdminIncidentManagement = lazy(() => import("./features/admin/pages/IncidentManagement"));
// AdminDocumentTracking route now redirects to /admin/documents?tab=tracking
const AdminIntegrations = lazy(() => import("./features/admin/pages/Integrations"));
const AdminLoginSettings = lazy(() => import("./features/admin/pages/LoginSettings"));
const AdminSEO = lazy(() => import("./features/admin/pages/SEO"));
const PackageCosts = lazy(() => import("./features/admin/pages/PackageCosts"));
const AdminPackageCategories = lazy(() => import("./features/admin/pages/PackageCategories"));
const AdminMenuPermissions = lazy(() => import("./features/admin/pages/MenuPermissions"));
const AdminFeatureManagement = lazy(() => import("./features/admin/pages/FeatureManagement"));
const FinanceDashboard = lazy(() => import("./features/admin/pages/FinanceDashboard"));
const Piutang = lazy(() => import("./features/admin/pages/Piutang"));
const DepartureFinance = lazy(() => import("./features/admin/pages/DepartureFinance"));
const ChartOfAccounts = lazy(() => import("./features/admin/pages/ChartOfAccounts"));
const GeneralLedger = lazy(() => import("./features/admin/pages/GeneralLedger"));
const TrialBalance = lazy(() => import("./features/admin/pages/TrialBalance"));
const FinancialReports = lazy(() => import("./features/admin/pages/FinancialReports"));
const VisaTracking = lazy(() => import("./features/admin/pages/VisaTracking"));
const SeatAssignment = lazy(() => import("./features/admin/pages/SeatAssignment"));
const DepartureChecklist = lazy(() => import("./features/admin/pages/DepartureChecklist"));
const DepartureReadiness = lazy(() => import("./features/admin/pages/DepartureReadiness"));
const EquipmentDistribution = lazy(() => import("./features/admin/pages/EquipmentDistribution"));
const BankReconciliation = lazy(() => import("./features/admin/pages/BankReconciliation"));
const AccountingExport = lazy(() => import("./features/admin/pages/AccountingExport"));
const BudgetCashFlow = lazy(() => import("./features/admin/pages/BudgetCashFlow"));
const PaymentPolicies = lazy(() => import("./features/admin/pages/PaymentPolicies"));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * React Router keeps the existing document mounted during navigation, so the
 * browser can otherwise carry the previous page's scroll position into the
 * next page (especially from the long package detail page into booking).
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

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
      <MobileBottomNav />
      <GlobalFloatingWidgets />
      <PWAInstallPrompt />
      <Suspense fallback={<div className="flex min-h-[240px] items-center justify-center p-8">
              <p className="text-sm text-muted-foreground">Memuat halaman admin...</p>
            </div>}>
      <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Index />} />
      <Route path="/track/:code" element={<TrackBooking />} />
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
        <Route path="/loyalty" element={<Loyalty />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/portal-jamaah" element={<PortalJamaah />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/my-upgrades" element={<MyUpgrades />} />
        <Route path="/my-documents" element={<MyDocuments />} />
        <Route path="/agent-portal" element={<AgentPortal />} />
        <Route path="/agent-commissions" element={<AgentCommissions />} />
        {/* Sprint 4A: Muthawif portal */}
        <Route path="/muthawif" element={<MuthawifDashboard />} />
        <Route path="/muthawif/jamaah" element={<MuthawifJamaahList />} />
        <Route path="/muthawif/laporan-harian" element={<MuthawifLaporanHarian />} />
        <Route path="/refund-request" element={<RefundRequest />} />
        <Route path="/e-ticket/:bookingId" element={<ETicket />} />
        <Route path="/branch-dashboard" element={<BranchDashboard />} />
        <Route path="/account/2fa" element={<Account2FA />} />
        <Route path="/contract/:bookingId" element={<ContractSign />} />
        <Route path="/tabungan" element={<MySavings />} />
        <Route path="/chat" element={<ChatPage />} />
      </Route>
      <Route path="/galeri" element={<Gallery />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogDetail />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route path="/manasik" element={<Manasik />} />
      <Route path="/jadwal" element={<Jadwal />} />
      <Route path="/r/:code" element={<AffiliateRedirect />} />

      {/* Admin Routes */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="packages" element={<AdminPackages />} />
          <Route path="departures" element={<AdminDepartures />} />
          <Route path="itineraries" element={<AdminItineraries />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="bookings/:bookingId" element={<AdminBookingDetail />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="analytics" element={<AdminAnalyticsDashboard />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
          <Route path="pilgrims" element={<AdminPilgrims />} />
          <Route path="pilgrims-db" element={<AdminPilgrimsDatabase />} />
          <Route path="branches" element={<AdminBranches />} />
          <Route path="agents" element={<AdminAgents />} />
          <Route path="muthawifs" element={<AdminMuthawifs />} />
          <Route path="hotels" element={<AdminHotels />} />
          <Route path="airlines" element={<AdminAirlines />} />
          <Route path="equipment" element={<AdminEquipment />} />
          <Route path="equipment-report" element={<AdminEquipmentReport />} />
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
          <Route path="document-types" element={<Navigate to="/admin/documents?tab=pengaturan" replace />} />
          <Route path="analytics-ai" element={<AdminAnalyticsAI />} />
          <Route path="multi-language" element={<AdminPlaceholder title="Multi-Bahasa" />} />
          <Route path="multi-branch" element={<AdminMultiBranch />} />
          <Route path="tenant-sites" element={<AdminTenantSites />} />
          <Route path="template-upgrades" element={<AdminTemplateUpgrades />} />
          <Route path="installments" element={<AdminInstallments />} />
          <Route path="savings" element={<AdminSavings />} />
          <Route path="manifest" element={<AdminManifest />} />
          <Route path="proof-access-logs" element={<AdminProofAccessLogs />} />
          <Route path="agent-withdrawals" element={<AdminAgentWithdrawals />} />
          <Route path="refunds" element={<AdminRefunds />} />
          <Route path="contracts" element={<AdminContracts />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
          <Route path="system-health" element={<AdminSystemHealth />} />
          <Route path="role-management" element={<Navigate to="/admin/settings" replace />} />
          <Route path="chats" element={<Navigate to="/admin/chat" replace />} />
          <Route path="chat" element={<ChatInbox />} />
          <Route path="leaderboard" element={<AdminLeaderboard />} />
          <Route path="currencies" element={<AdminCurrencies />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="loyalty" element={<AdminLoyalty />} />
          <Route path="slug-redirects" element={<AdminSlugRedirects />} />
          <Route path="package-categories" element={<AdminPackageCategories />} />
          <Route path="departure-gallery" element={<AdminDepartureGallery />} />
          <Route path="room-assignment" element={<AdminRoomAssignment />} />
          <Route path="check-in" element={<AdminCheckIn />} />
          <Route path="manasik" element={<AdminManasik />} />
          <Route path="error-logs" element={<AdminErrorLogs />} />
          <Route path="rest-diag" element={<AdminRestDiagLogs />} />
          <Route path="incident-reports/:id" element={<AdminIncidentReportView />} />
          <Route path="incident-management" element={<AdminIncidentManagement />} />
          <Route path="document-tracking" element={<Navigate to="/admin/documents?tab=tracking" replace />} />
          <Route path="integrations" element={<AdminIntegrations />} />
          <Route path="login-settings" element={<AdminLoginSettings />} />
          <Route path="seo" element={<AdminSEO />} />
          <Route path="social-kit" element={<AdminSocialKit />} />
          <Route path="menu-permissions" element={<AdminMenuPermissions />} />
          <Route path="feature-management" element={<AdminFeatureManagement />} />
          <Route path="finance-dashboard" element={<FinanceDashboard />} />
          <Route path="piutang" element={<Piutang />} />
          <Route path="departure-finance" element={<DepartureFinance />} />
          {/* F-7: Chart of Accounts + Buku Besar */}
          <Route path="chart-of-accounts" element={<ChartOfAccounts />} />
          <Route path="general-ledger" element={<GeneralLedger />} />
          <Route path="trial-balance" element={<TrialBalance />} />
          {/* F-8: Laporan Keuangan */}
          <Route path="financial-reports" element={<FinancialReports />} />
          {/* F-10: Rekonsiliasi Bank */}
          <Route path="bank-reconciliation" element={<BankReconciliation />} />
          {/* F-15: Export ke Software Akuntansi */}
          <Route path="accounting-export" element={<AccountingExport />} />
          {/* F-12: Budget & Proyeksi Cash Flow */}
          <Route path="budget-cashflow" element={<BudgetCashFlow />} />
          <Route path="payment-policies" element={<PaymentPolicies />} />
          {/* O-8: Equipment Distribution */}
          <Route path="equipment-distribution" element={<EquipmentDistribution />} />
          {/* O-9: Visa Tracking */}
          <Route path="visa-tracking" element={<VisaTracking />} />
          {/* O-10: Seat Assignment */}
          <Route path="seat-assignment" element={<SeatAssignment />} />
          {/* O-11: Pre-departure Checklist */}
          <Route path="departure-checklist" element={<DepartureChecklist />} />
          {/* Dashboard Kesiapan Keberangkatan */}
          <Route path="departure-readiness" element={<DepartureReadiness />} />
        </Route>
      </Route>

      {/* CMS Dynamic Page */}
      <Route path="/:slug" element={<DynamicPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
      </Suspense>
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
                    <ScrollToTop />
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
