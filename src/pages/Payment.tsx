import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, Copy, ArrowLeft, CreditCard, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BookingData {
  id: string;
  booking_code: string;
  total_price: number;
  status: string;
  package: { title: string } | null;
  departure: { departure_date: string } | null;
}

const Payment = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchBooking = async () => {
      const { data } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, total_price, status,
          package:packages(title),
          departure:package_departures(departure_date)
        `)
        .eq("id", bookingId)
        .eq("user_id", user.id)
        .single();

      if (data) {
        setBooking(data as unknown as BookingData);
      }
      setLoading(false);
    };

    fetchBooking();
  }, [bookingId, user, navigate]);

  const handleCopyCode = () => {
    if (booking) {
      navigator.clipboard.writeText(booking.booking_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Kode booking disalin!" });
    }
  };

  const handleConfirmPayment = async () => {
    if (!booking) return;

    // Create payment record
    await supabase.from("payments").insert({
      booking_id: booking.id,
      payment_method: "transfer",
      amount: booking.total_price,
      status: "pending",
    });

    // Update booking status
    await supabase.from("bookings").update({ status: "waiting_payment" }).eq("id", booking.id);

    toast({ title: "Pembayaran dikonfirmasi!", description: "Menunggu verifikasi admin" });
    navigate("/my-bookings");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Booking tidak ditemukan</h1>
        <Link to="/">
          <Button>Kembali ke Beranda</Button>
        </Link>
      </div>
    );
  }

  const bankAccount = {
    bank: "Bank Mandiri",
    number: "123-456-7890",
    name: "PT UmrohPlus Travel",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container-custom max-w-2xl">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="gradient-emerald p-6 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-gold/20 flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-gold" />
              </div>
              <h1 className="text-2xl font-display font-bold text-primary-foreground">Booking Berhasil!</h1>
              <p className="text-primary-foreground/70 mt-2">Segera lakukan pembayaran untuk mengamankan kursi Anda</p>
            </div>

            {/* Booking Info */}
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                <div>
                  <div className="text-sm text-muted-foreground">Kode Booking</div>
                  <div className="text-xl font-bold font-mono">{booking.booking_code}</div>
                </div>
                <Button variant="outline" size="icon" onClick={handleCopyCode}>
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paket</span>
                  <span className="font-semibold">{booking.package?.title}</span>
                </div>
                <div className="flex justify-between py-4 border-t border-border">
                  <span className="font-bold text-lg">Total Pembayaran</span>
                  <span className="font-display font-bold text-2xl text-gold">
                    Rp {booking.total_price.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {/* Bank Info */}
              <div className="p-4 border border-gold/30 bg-gold/5 rounded-xl">
                <h3 className="font-bold flex items-center gap-2 mb-3">
                  <CreditCard className="w-5 h-5 text-gold" />
                  Transfer ke Rekening
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank</span>
                    <span className="font-semibold">{bankAccount.bank}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">No. Rekening</span>
                    <span className="font-mono font-semibold">{bankAccount.number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Atas Nama</span>
                    <span className="font-semibold">{bankAccount.name}</span>
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground text-center">
                Setelah transfer, klik tombol di bawah untuk konfirmasi pembayaran.
                Tim kami akan memverifikasi dalam 1x24 jam.
              </div>

              <Button onClick={handleConfirmPayment} className="w-full gradient-gold text-primary font-semibold">
                <Upload className="w-4 h-4 mr-2" />
                Konfirmasi Sudah Transfer
              </Button>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Payment;
