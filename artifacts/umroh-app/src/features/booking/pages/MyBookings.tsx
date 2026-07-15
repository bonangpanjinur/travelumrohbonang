import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/shared/integrations/supabase/client";
import { useAuth } from "@/shared/hooks/useAuth";
import { useMyBookings } from "@/features/booking/hooks/useMyBookings";
import Navbar from "@/shared/components/layout/Navbar";
import Footer from "@/shared/components/layout/Footer";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { motion } from "framer-motion";
import { Calendar, Package, ArrowRight, AlertCircle, MapPin, ChevronDown, Ticket, MessageCircle, Receipt, PenLine, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import InvoiceButton from "@/features/booking/components/InvoiceButton";
import ConfirmationPdfButton from "@/features/booking/components/ConfirmationPdfButton";
import LoadingSpinner from "@/shared/components/ui/loading-spinner";
import EmptyState from "@/shared/components/ui/empty-state";
import { useToast } from "@/shared/hooks/use-toast";
import BookingItinerary from "@/features/booking/components/BookingItinerary";
import InstallmentSchedule from "@/features/booking/components/InstallmentSchedule";
import ChatBox from "@/features/cms/components/ChatBox";
import { useCurrency } from "@/shared/hooks/useCurrency";

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
  const { format: fmt } = useCurrency();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [signedMap, setSignedMap] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState<string | null>(null);

  const { bookings, loading, error } = useMyBookings(user?.id);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || bookings.length === 0) return;

    const ids = bookings.map((b) => b.id);
    supabase
      .from("contracts")
      .select("booking_id, signed_at")
      .in("booking_id", ids)
      .eq("user_id", user.id)
      .then(({ data: contracts }) => {
        const map: Record<string, boolean> = {};
        (contracts ?? []).forEach((c: any) => {
          if (c.signed_at) map[c.booking_id] = true;
        });
        setSignedMap(map);
      });
  }, [user, bookings]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Gagal memuat data booking Anda.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

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
                        <span className="font-mono text-sm text-muted-foreground">{b.bookingCode}</span>
                        <Badge className={statusColors[b.status ?? ""]}>{statusLabels[b.status ?? ""] ?? b.status}</Badge>
                      </div>
                      <h3 className="text-lg font-bold">{b.packageTitle ?? "Paket Umroh"}</h3>
                      {b.departureDate && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Calendar className="w-4 h-4" />
                          <span>Keberangkatan: {format(new Date(b.departureDate), "d MMMM yyyy", { locale: localeId })}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Total</div>
                        <div className="text-xl font-bold text-gold">
                          {fmt(b.totalPrice)}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {b.status !== "draft" && (
                          <InvoiceButton bookingId={b.id} />
                        )}
                        {b.status !== "draft" && (
                          <ConfirmationPdfButton bookingId={b.id} />
                        )}
                        {b.status === "paid" && (
                          <Link to={`/e-ticket/${b.id}`}>
                            <Button size="sm" variant="outline"><Ticket className="w-4 h-4 mr-1" />E-Ticket</Button>
                          </Link>
                        )}
                        {(b.status === "draft" || b.status === "waiting_payment") && (
                          <Link to={`/booking/payment/${b.id}`}>
                            <Button size="sm" className="gradient-gold text-primary">
                              Bayar <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          </Link>
                        )}
                        {b.status !== "draft" && b.status !== "cancelled" && (
                          <Link to={`/contract/${b.id}`}>
                            <Button size="sm" variant={signedMap[b.id] ? "outline" : "secondary"}>
                              {signedMap[b.id] ? (
                                <><CheckCircle2 className="w-4 h-4 mr-1 text-success" />Kontrak Ditandatangani</>
                              ) : (
                                <><PenLine className="w-4 h-4 mr-1" />Tanda Tangan Kontrak</>
                              )}
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                  {b.departureId && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded(expanded === b.id ? null : b.id)
                        }
                        className="text-sm font-medium text-primary hover:text-gold transition-colors flex items-center gap-1"
                      >
                        <MapPin className="w-4 h-4" />
                        {expanded === b.id ? "Sembunyikan" : "Lihat"} Itinerary
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            expanded === b.id ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {expanded === b.id && (
                        <div className="mt-4">
                          <BookingItinerary departureId={b.departureId} />
                        </div>
                      )}
                    </div>
                  )}
                  {/* F-05: Installment schedule (only shown for dp/cicilan bookings) */}
                  <InstallmentSchedule bookingId={b.id} />

                  <div className="mt-3 pt-3 border-t border-border flex gap-2 flex-wrap text-xs">
                    <Link to="/refund-request" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
                      <Receipt className="w-3.5 h-3.5" />Ajukan Refund
                    </Link>
                    <button type="button" onClick={() => setChatOpen(chatOpen === b.id ? null : b.id)} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
                      <MessageCircle className="w-3.5 h-3.5" />{chatOpen === b.id ? "Tutup" : "Buka"} Chat CS
                    </button>
                  </div>
                  {chatOpen === b.id && (
                    <div className="mt-3"><ChatBox bookingId={b.id} /></div>
                  )}
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
