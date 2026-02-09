import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Calendar, Package, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface BookingItem {
  id: string;
  booking_code: string;
  total_price: number;
  status: string;
  created_at: string;
  package: { title: string; slug: string } | null;
  departure: { departure_date: string } | null;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  waiting_payment: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  waiting_payment: "Menunggu Pembayaran",
  paid: "Lunas",
  cancelled: "Dibatalkan",
};

const MyBookings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchBookings = async () => {
      const { data } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, total_price, status, created_at,
          package:packages(title, slug),
          departure:package_departures(departure_date)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setBookings((data as unknown as BookingItem[]) || []);
      setLoading(false);
    };

    fetchBookings();
  }, [user, authLoading, navigate]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container-custom max-w-4xl">
          <h1 className="text-2xl md:text-3xl font-display font-bold mb-8">Booking Saya</h1>

          {bookings.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Belum ada booking</h2>
              <p className="text-muted-foreground mb-6">Anda belum memiliki booking apapun</p>
              <Link to="/paket">
                <Button className="gradient-gold text-primary">Lihat Paket Umroh</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((b, index) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card border border-border rounded-xl p-6 hover:border-gold/30 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm text-muted-foreground">{b.booking_code}</span>
                        <Badge className={statusColors[b.status]}>{statusLabels[b.status]}</Badge>
                      </div>
                      <h3 className="text-lg font-bold">{b.package?.title || "Paket Umroh"}</h3>
                      {b.departure && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Calendar className="w-4 h-4" />
                          <span>Keberangkatan: {format(new Date(b.departure.departure_date), "d MMMM yyyy", { locale: localeId })}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Total</div>
                        <div className="text-xl font-bold text-gold">
                          Rp {b.total_price.toLocaleString("id-ID")}
                        </div>
                      </div>
                      {b.status === "draft" && (
                        <Link to={`/booking/payment/${b.id}`}>
                          <Button size="sm" className="gradient-gold text-primary">
                            Bayar <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyBookings;
