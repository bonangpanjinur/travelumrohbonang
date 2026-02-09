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
import { AdminPilgrims, AdminAgents, AdminSettings } from "./pages/admin/Placeholder";

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
                <Route path="pages" element={<AdminPages />} />
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
