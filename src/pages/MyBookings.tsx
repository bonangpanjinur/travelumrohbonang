import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Calendar, Package, ArrowRight, Printer, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import InvoiceButton from "@/components/InvoiceButton";
import LoadingSpinner from "@/components/ui/loading-spinner";
import EmptyState from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";

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

const MyBookings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
          .from("bookings")
          .select(`
            id, booking_code, total_price, status, created_at,
            package:packages(title, slug),
            departure:package_departures(departure_date)
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;
        setBookings((data as unknown as BookingItem[]) || []);
      } catch (err: any) {
        console.error("Error fetching bookings:", err);
        setError(err.message || "Gagal memuat data booking");
        toast({
          title: "Error",
          description: "Gagal memuat data booking Anda.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user, authLoading, navigate, toast]);

  if (loading || authLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container-custom max-w-4xl">
          <h1 className="text-2xl md:text-3xl font-display font-bold mb-8">Booking Saya</h1>

          {error ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-8 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-bold text-destructive mb-2">Terjadi Kesalahan</h3>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Coba Lagi
              </Button>
            </div>
          ) : bookings.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Belum ada booking"
              description="Anda belum memiliki booking apapun. Mulai perjalanan umroh Anda sekarang!"
              action={
                <Link to="/paket">
                  <Button className="gradient-gold text-primary">Lihat Paket Umroh</Button>
                </Link>
              }
            />
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
                      <div className="flex gap-2">
                        {/* Invoice Button - show for all statuses except draft */}
                        {b.status !== "draft" && (
                          <InvoiceButton bookingId={b.id} />
                        )}
                        {/* Payment Button - show for draft and waiting_payment */}
                        {(b.status === "draft" || b.status === "waiting_payment") && (
                          <Link to={`/booking/payment/${b.id}`}>
                            <Button size="sm" className="gradient-gold text-primary">
                              Bayar <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          </Link>
                        )}
                      </div>
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
