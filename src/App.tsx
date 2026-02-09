import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Paket from "./pages/Paket";
import PackageDetail from "./pages/PackageDetail";
import Auth from "./pages/Auth";
import Booking from "./pages/Booking";
import Payment from "./pages/Payment";
import MyBookings from "./pages/MyBookings";
import Gallery from "./pages/Gallery";
import Blog from "./pages/Blog";
import BlogDetail from "./pages/BlogDetail";
import DynamicPage from "./pages/DynamicPage";
import NotFound from "./pages/NotFound";

// Admin
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminPackages from "./pages/admin/Packages";
import AdminDepartures from "./pages/admin/Departures";
import AdminBookings from "./pages/admin/Bookings";
import AdminPayments from "./pages/admin/Payments";
import AdminItineraries from "./pages/admin/Itineraries";
import AdminReports from "./pages/admin/Reports";
import AdminPages from "./pages/admin/Pages";
import AdminHotels from "./pages/admin/Hotels";
import AdminAirlines from "./pages/admin/Airlines";
import AdminAirports from "./pages/admin/Airports";
import AdminBranches from "./pages/admin/Branches";
import AdminGallery from "./pages/admin/Gallery";
import AdminTestimonials from "./pages/admin/Testimonials";
import AdminFAQ from "./pages/admin/FAQ";
import AdminFloatingButtons from "./pages/admin/FloatingButtons";
import AdminBlog from "./pages/admin/Blog";
import AdminSettings from "./pages/admin/Settings";
import AdminNavigation from "./pages/admin/Navigation";
import AdminPilgrims from "./pages/admin/Pilgrims";
import { AdminAgents } from "./pages/admin/Placeholder";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/paket" element={<Paket />} />
              <Route path="/paket/:slug" element={<PackageDetail />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/booking/:slug/:departureId" element={<Booking />} />
              <Route path="/booking/payment/:bookingId" element={<Payment />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/galeri" element={<Gallery />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogDetail />} />

              {/* Admin Routes */}
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
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              {/* CMS Dynamic Page - must be after all other routes */}
              <Route path="/:slug" element={<DynamicPage />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
