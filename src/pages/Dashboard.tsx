import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { 
  Package, 
  User as UserIcon, 
  Ticket, 
  Bell, 
  ArrowRight, 
  Calendar,
  Clock,
  ShieldCheck,
  ShoppingBag,
  CreditCard,
  MapPin
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import LoadingSpinner from "@/components/ui/loading-spinner";

interface BookingSummary {
  id: string;
  booking_code: string;
  status: string;
  total_price: number;
  created_at: string;
  package: { title: string; image_url: string } | null;
  departure: { departure_date: string } | null;
}

const UserDashboard = () => {
  const { user, isAdmin, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [recentBookings, setRecentBookings] = useState<BookingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, paid: 0, pending: 0 });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch Profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        
        setProfile(profileData);

        // Fetch Recent Bookings with more details
        const { data: bookingsData } = await supabase
          .from("bookings")
          .select(`
            id, booking_code, status, total_price, created_at,
            package:packages(title, image_url),
            departure:package_departures(departure_date)
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        const bookings = (bookingsData as any) || [];
        setRecentBookings(bookings.slice(0, 3));
        
        // Calculate Stats
        setStats({
          total: bookings.length,
          paid: bookings.filter((b: any) => b.status === 'paid').length,
          pending: bookings.filter((b: any) => b.status === 'waiting_payment' || b.status === 'draft').length
        });

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return <LoadingSpinner fullScreen />;
  }

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    waiting_payment: "bg-warning/10 text-warning border-warning/20",
    paid: "bg-success/10 text-success border-success/20",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const statusLabels: Record<string, string> = {
    draft: "Draft",
    waiting_payment: "Menunggu Pembayaran",
    paid: "Lunas",
    cancelled: "Dibatalkan",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container-custom max-w-6xl">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold">Dashboard Saya</h1>
              <p className="text-muted-foreground">Selamat datang kembali, <span className="text-foreground font-medium">{profile?.name || user?.email}</span></p>
            </div>
            <div className="flex gap-3">
              <Link to="/profile">
                <Button variant="outline" size="sm" className="gap-2">
                  <UserIcon className="w-4 h-4" /> Edit Profil
                </Button>
              </Link>
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="outline" size="sm" className="gap-2 border-gold text-gold hover:bg-gold/10">
                    <ShieldCheck className="w-4 h-4" /> Panel Admin
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Total Pesanan</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-success/5 border-success/10">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.paid}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Sudah Lunas</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-warning/5 border-warning/10">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center text-warning">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.pending}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Menunggu</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content: Recent Bookings */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-gold" /> Booking Terbaru
                </h2>
                <Link to="/my-bookings">
                  <Button variant="ghost" size="sm" className="text-gold hover:text-gold/80">
                    Lihat Semua <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>

              {recentBookings.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Package className="w-16 h-16 text-muted/20 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Belum ada pesanan</h3>
                    <p className="text-muted-foreground mb-6">Mulai perjalanan ibadah Anda dengan memilih paket terbaik kami.</p>
                    <Link to="/paket">
                      <Button className="gradient-gold text-primary font-bold">Lihat Paket Umroh</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {recentBookings.map((booking, index) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="overflow-hidden hover:border-gold/30 transition-colors">
                        <CardContent className="p-0">
                          <div className="flex flex-col sm:flex-row">
                            <div className="w-full sm:w-32 h-32 bg-muted relative">
                              {booking.package?.image_url ? (
                                <img 
                                  src={booking.package.image_url} 
                                  alt={booking.package.title} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <Package className="w-8 h-8" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 p-4 flex flex-col justify-between">
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <div className="text-xs font-mono text-muted-foreground mb-1">{booking.booking_code}</div>
                                  <h3 className="font-bold text-lg leading-tight">{booking.package?.title}</h3>
                                </div>
                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${statusColors[booking.status]}`}>
                                  {statusLabels[booking.status] || booking.status}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {booking.departure?.departure_date ? format(new Date(booking.departure.departure_date), "d MMM yyyy", { locale: localeId }) : "TBA"}
                                </div>
                                <div className="flex items-center gap-1">
                                  <CreditCard className="w-4 h-4" />
                                  Rp {booking.total_price.toLocaleString("id-ID")}
                                </div>
                                <Link to={`/booking/payment/${booking.id}`} className="ml-auto">
                                  <Button size="sm" variant="outline" className="h-8 text-xs">Detail</Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar: Profile & Quick Links */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informasi Akun</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold text-xl">
                      {profile?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-bold truncate">{profile?.name || "User"}</div>
                      <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                    </div>
                  </div>
                  <div className="pt-4 border-t space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> Role
                      </span>
                      <span className="font-medium capitalize px-2 py-0.5 bg-accent/10 text-accent rounded text-xs">
                        {role || "Buyer"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Bergabung
                      </span>
                      <span className="font-medium">
                        {profile?.created_at ? format(new Date(profile.created_at), "MMM yyyy", { locale: localeId }) : "-"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Bantuan Cepat</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    <a href="https://wa.me/628123456789" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center text-success">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="text-sm font-medium">Hubungi Customer Service</div>
                    </a>
                    <Link to="/galeri" className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="text-sm font-medium">Lihat Dokumentasi Perjalanan</div>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UserDashboard;
