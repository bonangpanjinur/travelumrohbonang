import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { Check, Copy, ArrowLeft, CreditCard, Upload, Image, Loader2, Wallet, Clock, AlertTriangle, Printer, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, addDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import InvoiceButton from "@/components/InvoiceButton";
import LoadingSpinner from "@/components/ui/loading-spinner";

interface BookingData {
  id: string;
  booking_code: string;
  total_price: number;
  status: string;
  user_id: string;
  package: { 
    title: string; 
    minimum_dp: number | null;
    dp_deadline_days?: number | null;
    full_deadline_days?: number | null;
  } | null;
  departure: { departure_date: string } | null;
}

interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  payment_type: string;
  created_at: string;
}

const Payment = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [existingPayments, setExistingPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [paymentOption, setPaymentOption] = useState<"dp" | "full">("dp");
  const [bankAccount, setBankAccount] = useState({ bank: "Bank Mandiri", number: "123-456-7890", name: "PT UmrohPlus Travel" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch booking, payments, and bank settings in parallel
        // Note: We use a more robust query that doesn't fail if columns are missing in the DB but present in types
        const [bookingRes, paymentsRes, settingsRes] = await Promise.all([
          supabase
            .from("bookings")
            .select(`
              id, booking_code, total_price, status, user_id,
              package:packages(title, minimum_dp, dp_deadline_days, full_deadline_days),
              departure:package_departures(departure_date)
            `)
            .eq("id", bookingId)
            .single(),
          supabase
            .from("payments")
            .select("id, amount, status, payment_type, created_at")
            .eq("booking_id", bookingId)
            .order("created_at", { ascending: true }),
          supabase
            .from("settings")
            .select("key, value")
            .in("key", ["bank_name", "bank_account", "bank_holder"]),
        ]);

        // If the query fails due to missing columns, try a fallback query without those columns
        let finalBookingData = bookingRes.data;
        if (bookingRes.error) {
          console.warn("Primary query failed, trying fallback:", bookingRes.error);
          const fallbackRes = await supabase
            .from("bookings")
            .select(`
              id, booking_code, total_price, status, user_id,
              package:packages(title, minimum_dp),
              departure:package_departures(departure_date)
            `)
            .eq("id", bookingId)
            .single();
          
          if (fallbackRes.error) throw fallbackRes.error;
          finalBookingData = fallbackRes.data;
        }
        
        if (!finalBookingData) throw new Error("Booking tidak ditemukan");
        
        const bookingData = finalBookingData as unknown as BookingData;
        
        // CRITICAL FIX: Verify ownership
        if (bookingData.user_id !== user.id) {
          setError("Anda tidak memiliki akses ke data booking ini.");
          toast({
            title: "Akses Ditolak",
            description: "Anda tidak memiliki izin untuk melihat pembayaran ini.",
            variant: "destructive",
          });
          return;
        }

        setBooking(bookingData);
        
        if (paymentsRes.data) {
          setExistingPayments(paymentsRes.data as PaymentRecord[]);
        }
        
        if (settingsRes.data && settingsRes.data.length > 0) {
          const settings: Record<string, string> = {};
          settingsRes.data.forEach((s: { key: string; value: string | null }) => {
            if (s.value) settings[s.key] = s.value;
          });
          setBankAccount({
            bank: settings.bank_name || "Bank Mandiri",
            number: settings.bank_account || "123-456-7890",
            name: settings.bank_holder || "PT UmrohPlus Travel",
          });
        }
      } catch (err: any) {
        console.error("Error fetching payment data:", err);
        setError(err.message || "Gagal memuat data pembayaran");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bookingId, user, authLoading, navigate, toast]);

  // Calculate paid amount and remaining
  const paidAmount = existingPayments
    .filter(p => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  
  const pendingAmount = existingPayments
    .filter(p => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  const remainingAmount = booking ? booking.total_price - paidAmount - pendingAmount : 0;
  const minimumDp = booking?.package?.minimum_dp || 0;
  const paymentProgress = booking ? ((paidAmount / booking.total_price) * 100) : 0;

  // Calculate deadlines
  const departureDate = booking?.departure?.departure_date 
    ? new Date(booking.departure.departure_date) 
    : null;
  
  const dpDeadlineDays = booking?.package?.dp_deadline_days ?? 30;
  const fullDeadlineDays = booking?.package?.full_deadline_days ?? 7;
  
  const dpDeadline = departureDate 
    ? addDays(departureDate, -dpDeadlineDays) 
    : null;
  
  const fullDeadline = departureDate 
    ? addDays(departureDate, -fullDeadlineDays) 
    : null;

  const now = new Date();
  const daysUntilDpDeadline = dpDeadline ? differenceInDays(dpDeadline, now) : null;
  const daysUntilFullDeadline = fullDeadline ? differenceInDays(fullDeadline, now) : null;
  
  const isDpOverdue = daysUntilDpDeadline !== null && daysUntilDpDeadline < 0;
  const isFullOverdue = daysUntilFullDeadline !== null && daysUntilFullDeadline < 0;

  // Determine current payment amount based on option
  const getCurrentPaymentAmount = () => {
    if (paymentOption === "full") {
      return remainingAmount;
    }
    // For DP, use minimum_dp or remaining if less
    return Math.min(minimumDp, remainingAmount);
  };

  const handleCopyCode = () => {
    if (booking) {
      navigator.clipboard.writeText(booking.booking_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Kode booking disalin!" });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !booking) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Format tidak didukung", description: "Gunakan JPG, PNG, atau WebP", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File terlalu besar", description: "Maksimal 5MB", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setProofPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    const fileName = `${booking.booking_code}-${Date.now()}.${file.name.split(".").pop()}`;
    
    const { data, error } = await supabase.storage
      .from("payment-proofs")
      .upload(fileName, file, { upsert: true });

    if (error) {
      toast({ title: "Gagal upload", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("payment-proofs").getPublicUrl(data.path);
    setProofUrl(publicUrl);
    setUploading(false);
    toast({ title: "Bukti pembayaran berhasil diupload!" });
  };

  const handleConfirmPayment = async () => {
    if (!booking) return;

    const paymentAmount = getCurrentPaymentAmount();
    const isFullPayment = paymentOption === "full" || paymentAmount >= remainingAmount;

    try {
      // Create payment record
      const { error: paymentError } = await supabase.from("payments").insert({
        booking_id: booking.id,
        payment_method: "transfer",
        amount: paymentAmount,
        status: "pending",
        proof_url: proofUrl,
        payment_type: isFullPayment ? "full" : (paidAmount === 0 ? "dp" : "installment"),
      });

      if (paymentError) throw paymentError;

      // Update booking status
      const { error: bookingError } = await supabase.from("bookings").update({ status: "waiting_payment" }).eq("id", booking.id);
      
      if (bookingError) throw bookingError;

      toast({ title: "Pembayaran dikonfirmasi!", description: "Menunggu verifikasi admin" });
      navigate("/my-bookings");
    } catch (err: any) {
      console.error("Payment confirmation error:", err);
      toast({
        title: "Gagal Konfirmasi",
        description: err.message || "Terjadi kesalahan saat mengonfirmasi pembayaran.",
        variant: "destructive",
      });
    }
  };

  if (loading || authLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">{error || "Booking tidak ditemukan"}</h1>
        <p className="text-muted-foreground mb-6">Silakan periksa kembali data booking Anda atau hubungi admin.</p>
        <Link to="/my-bookings">
          <Button className="gradient-gold text-primary">Kembali ke Booking Saya</Button>
        </Link>
      </div>
    );
  }

  const hasPendingPayment = existingPayments.some(p => p.status === "pending");

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
                <Wallet className="w-8 h-8 text-gold" />
              </div>
              <h1 className="text-2xl font-display font-bold text-primary-foreground">
                {paidAmount > 0 ? "Lanjutkan Pembayaran" : "Pembayaran"}
              </h1>
              <p className="text-primary-foreground/70 mt-2">
                {hasPendingPayment 
                  ? "Ada pembayaran yang menunggu verifikasi"
                  : "Pilih metode pembayaran yang sesuai"}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Booking Info */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                <div>
                  <div className="text-sm text-muted-foreground">Kode Booking</div>
                  <div className="text-xl font-bold font-mono">{booking.booking_code}</div>
                </div>
                <Button variant="outline" size="icon" onClick={handleCopyCode}>
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progres Pembayaran</span>
                  <span className="font-bold">{Math.round(paymentProgress)}%</span>
                </div>
                <Progress value={paymentProgress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Terbayar: Rp {paidAmount.toLocaleString("id-ID")}</span>
                  <span>Total: Rp {booking.total_price.toLocaleString("id-ID")}</span>
                </div>
              </div>

              {/* Payment Options */}
              {remainingAmount > 0 && !hasPendingPayment && (
                <div className="space-y-4">
                  <h3 className="font-bold">Pilih Opsi Pembayaran</h3>
                  <RadioGroup value={paymentOption} onValueChange={(v: "dp" | "full") => setPaymentOption(v)} className="grid grid-cols-1 gap-3">
                    {paidAmount === 0 && minimumDp > 0 && (
                      <div className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-colors ${paymentOption === "dp" ? "border-gold bg-gold/5" : "border-border"}`}>
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="dp" id="dp" />
                          <Label htmlFor="dp" className="cursor-pointer">
                            <div className="font-bold">Uang Muka (DP)</div>
                            <div className="text-xs text-muted-foreground">Minimal pembayaran awal</div>
                          </Label>
                        </div>
                        <div className="font-bold text-gold">Rp {minimumDp.toLocaleString("id-ID")}</div>
                      </div>
                    )}
                    <div className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-colors ${paymentOption === "full" ? "border-gold bg-gold/5" : "border-border"}`}>
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="full" id="full" />
                        <Label htmlFor="full" className="cursor-pointer">
                          <div className="font-bold">{paidAmount > 0 ? "Pelunasan" : "Bayar Lunas"}</div>
                          <div className="text-xs text-muted-foreground">Sisa pembayaran yang harus dibayar</div>
                        </Label>
                      </div>
                      <div className="font-bold text-gold">Rp {remainingAmount.toLocaleString("id-ID")}</div>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Bank Details */}
              <div className="p-6 border border-dashed border-border rounded-2xl bg-muted/30">
                <h3 className="text-center text-sm text-muted-foreground mb-4">Transfer ke Rekening:</h3>
                <div className="text-center space-y-1">
                  <div className="font-bold text-lg">{bankAccount.bank}</div>
                  <div className="text-2xl font-mono font-bold text-primary tracking-wider">{bankAccount.number}</div>
                  <div className="text-sm">a.n {bankAccount.name}</div>
                </div>
              </div>

              {/* Upload Proof */}
              {!hasPendingPayment && remainingAmount > 0 && (
                <div className="space-y-4">
                  <h3 className="font-bold">Upload Bukti Transfer</h3>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-gold/50 hover:bg-muted/50 transition-all"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      accept="image/*"
                    />
                    {proofPreview ? (
                      <div className="relative aspect-video max-w-xs mx-auto rounded-lg overflow-hidden">
                        <img src={proofPreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <Upload className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
                          <Image className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div className="font-medium">Klik untuk upload bukti</div>
                        <div className="text-xs text-muted-foreground">Format JPG, PNG, atau WebP (Maks. 5MB)</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Button */}
              {hasPendingPayment ? (
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl flex items-start gap-3">
                  <Clock className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-warning">Menunggu Verifikasi</div>
                    <p className="text-sm text-muted-foreground">Pembayaran Anda sedang diperiksa oleh tim kami. Mohon tunggu 1x24 jam.</p>
                  </div>
                </div>
              ) : remainingAmount > 0 ? (
                <Button 
                  className="w-full gradient-gold text-primary h-12 text-lg font-bold"
                  disabled={!proofUrl || uploading}
                  onClick={handleConfirmPayment}
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  Konfirmasi Pembayaran
                </Button>
              ) : (
                <div className="p-4 bg-success/10 border border-success/20 rounded-xl flex items-start gap-3">
                  <Check className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-success">Pembayaran Lunas</div>
                    <p className="text-sm text-muted-foreground">Terima kasih! Pembayaran Anda telah kami terima dan diverifikasi.</p>
                  </div>
                </div>
              )}
              
              {/* Invoice Link */}
              {paidAmount > 0 && (
                <div className="pt-4 border-t border-border">
                  <InvoiceButton bookingId={booking.id} className="w-full" />
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Payment;
