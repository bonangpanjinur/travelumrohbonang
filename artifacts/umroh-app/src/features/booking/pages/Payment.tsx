import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";
import Navbar from "@/shared/components/layout/Navbar";
import Footer from "@/shared/components/layout/Footer";
import { Button } from "@/shared/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Label } from "@/shared/components/ui/label";
import { Progress } from "@/shared/components/ui/progress";
import { motion } from "framer-motion";
import { Check, Copy, ArrowLeft, CreditCard, Upload, Image, Loader2, Wallet, Clock, AlertTriangle, Printer, AlertCircle } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { format, differenceInDays, addDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import InvoiceButton from "@/features/booking/components/InvoiceButton";
import LoadingSpinner from "@/shared/components/ui/loading-spinner";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { uploadPaymentProof } from "@/features/booking/lib/paymentProofs";
import { apiFetch } from "@/shared/lib/apiClient";

interface BookingData {
  id: string;
  bookingCode: string;
  totalPrice: number;
  status: string;
  userId: string;
  packageTitle: string | null;
  minimumDp: number | null;
  dpDeadlineDays: number | null;
  fullDeadlineDays: number | null;
  departureDate: string | null;
}

interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  paymentType?: string;
  createdAt: string;
}

const Payment = () => {
  const { format: fmt } = useCurrency();
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
  const [bankAccounts, setBankAccounts] = useState<{ bank: string; number: string; name: string }[]>([]);
  const [selectedBankIndex, setSelectedBankIndex] = useState(0);
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
        
        const [bookingData, paymentsData, settingsData] = await Promise.all([
          apiFetch<BookingData>(`/api/bookings/${bookingId}`),
          apiFetch<PaymentRecord[]>(`/api/bookings/${bookingId}/payments`),
          apiFetch<{ bankAccounts: { bank: string; number: string; name: string }[] }>(`/api/misc/payment-settings`).catch(() => null),
        ]);

        if (!bookingData) throw new Error("Booking tidak ditemukan");
        
        // Ownership check is done in backend, but we can verify here too
        if (bookingData.userId !== user.id) {
          setError("Anda tidak memiliki akses ke data booking ini.");
          return;
        }

        setBooking(bookingData);
        setExistingPayments(paymentsData || []);
        if (settingsData?.bankAccounts?.length) {
          setBankAccounts(settingsData.bankAccounts);
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

  // Only subtract confirmed (paid) payments from remaining — pending is not yet verified
  const remainingAmount = booking ? booking.totalPrice - paidAmount : 0;
  const minimumDp = booking?.minimumDp || 0;
  const paymentProgress = booking ? ((paidAmount / booking.totalPrice) * 100) : 0;

  // Calculate deadlines
  const departureDate = booking?.departureDate 
    ? new Date(booking.departureDate) 
    : null;
  
  const dpDeadlineDays = booking?.dpDeadlineDays ?? 30;
  const fullDeadlineDays = booking?.fullDeadlineDays ?? 7;
  
  const dpDeadline = departureDate 
    ? addDays(departureDate, -dpDeadlineDays) 
    : null;
  
  const fullDeadline = departureDate 
    ? addDays(departureDate, -fullDeadlineDays) 
    : null;

  // Determine current payment amount based on option
  const getCurrentPaymentAmount = () => {
    if (paymentOption === "full") {
      return remainingAmount;
    }
    return Math.min(minimumDp, remainingAmount);
  };

  const handleCopyCode = () => {
    if (booking) {
      navigator.clipboard.writeText(booking.bookingCode);
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

    if (!user) {
      toast({ title: "Anda harus login", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const path = await uploadPaymentProof(user.id, file, booking.bookingCode);
      setProofUrl(path);
      toast({ title: "Bukti pembayaran berhasil diupload!" });
    } catch (error: any) {
      toast({ title: "Gagal upload", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!booking) return;

    const paymentAmount = getCurrentPaymentAmount();
    const isFullPayment = paymentOption === "full" || paymentAmount >= remainingAmount;
    const paymentType = isFullPayment ? "full" : (paidAmount === 0 ? "dp" : "installment");

    try {
      await apiFetch(`/api/bookings/${booking.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: paymentAmount,
          paymentMethod: "transfer",
          paymentType,
          proofUrl,
        }),
      });

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
          <button
            onClick={() => navigate(-1)}
            aria-label="Kembali ke halaman sebelumnya"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 min-h-[44px] px-1"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="gradient-elegant p-6 text-center">
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
                  <div className="text-xl font-bold font-mono">{booking.bookingCode}</div>
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
                  <span>Terbayar: {fmt(paidAmount)}</span>
                  <span>Total: {fmt(booking.totalPrice)}</span>
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
                        <div className="font-bold text-gold">{fmt(minimumDp)}</div>
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
                      <div className="font-bold text-gold">{fmt(remainingAmount)}</div>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Bank Details */}
              {bankAccounts.length > 0 && (
                <div className="p-6 border border-dashed border-border rounded-2xl bg-muted/30 space-y-4">
                  <h3 className="text-center text-sm text-muted-foreground">Transfer ke Rekening:</h3>
                  {bankAccounts.length > 1 && (
                    <div className="flex gap-2 justify-center flex-wrap">
                      {bankAccounts.map((acc, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedBankIndex(i)}
                          className={`px-4 py-2 min-h-[44px] rounded-full text-xs font-semibold border transition-colors ${selectedBankIndex === i ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground"}`}
                        >
                          {acc.bank}
                        </button>
                      ))}
                    </div>
                  )}
                  {bankAccounts[selectedBankIndex] && (
                    <div className="text-center space-y-1">
                      <div className="font-bold text-lg">{bankAccounts[selectedBankIndex].bank}</div>
                      <div className="text-2xl font-mono font-bold text-primary tracking-wider">
                        {bankAccounts[selectedBankIndex].number}
                      </div>
                      <div className="text-sm">a.n {bankAccounts[selectedBankIndex].name}</div>
                    </div>
                  )}
                </div>
              )}

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
