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
  ShoppingBag
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
  package: { title: string } | null;
}

const UserDashboard = () => {
  const { user, isAdmin, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [recentBookings, setRecentBookings] = useState<BookingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

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

        // Fetch Recent Bookings
        const { data: bookingsData } = await supabase
          .from("bookings")
          .select(`
            id, booking_code, status, total_price, created_at,
            package:packages(title)
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3);

        setRecentBookings((bookingsData as any) || []);
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
    draft: "text-muted-foreground",
    waiting_payment: "text-warning",
    paid: "text-success",
    cancelled: "text-destructive",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container-custom max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold">Dashboard Saya</h1>
              <p className="text-muted-foreground">Selamat datang kembali, {profile?.name || user?.email}</p>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Summary Card */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-gold" /> Profil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                    {profile?.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <div className="font-bold">{profile?.name || "User"}</div>
                    <div className="text-sm text-muted-foreground">{user?.email}</div>
                  </div>
                </div>
                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Role:</span>
                    <span className="font-medium capitalize">{role || "Buyer"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Member Sejak:</span>
                    <span className="font-medium">
                      {profile?.created_at ? format(new Date(profile.created_at), "MMM yyyy", { locale: localeId }) : "-"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Bookings Card */}
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-gold" /> Booking Terbaru
                  </CardTitle>
                  <CardDescription>3 pesanan terakhir Anda</CardDescription>
                </div>
                <Link to="/my-bookings">
                  <Button variant="ghost" size="sm" className="text-gold hover:text-gold/80">
                    Lihat Semua <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {recentBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-muted/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Belum ada pesanan</p>
                    <Link to="/paket" className="mt-4 inline-block">
                      <Button size="sm" className="gradient-gold text-primary">Cari Paket Umroh</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-gold/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                            <Ticket className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{booking.package?.title}</div>
                            <div className="text-xs text-muted-foreground">{booking.booking_code} • {format(new Date(booking.created_at), "d MMM yyyy", { locale: localeId })}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm">Rp {booking.total_price.toLocaleString("id-ID")}</div>
                          <div className={`text-[10px] font-bold uppercase ${statusColors[booking.status] || ""}`}>
                            {booking.status.replace("_", " ")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions / Info */}
            <Card className="md:col-span-3">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-accent/5 border border-accent/10">
                    <Calendar className="w-8 h-8 text-accent" />
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Jadwal</div>
                      <div className="text-sm font-medium">Cek Keberangkatan</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <Bell className="w-8 h-8 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Notifikasi</div>
                      <div className="text-sm font-medium">Pesan Terbaru</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-gold/5 border border-gold/10">
                    <Clock className="w-8 h-8 text-gold" />
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Riwayat</div>
                      <div className="text-sm font-medium">Aktivitas Akun</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-success/5 border border-success/10">
                    <ShieldCheck className="w-8 h-8 text-success" />
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Bantuan</div>
                      <div className="text-sm font-medium">Pusat Dukungan</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UserDashboard;
