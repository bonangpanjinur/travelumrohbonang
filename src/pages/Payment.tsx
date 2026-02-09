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
import { Check, Copy, ArrowLeft, CreditCard, Upload, Image, Loader2, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BookingData {
  id: string;
  booking_code: string;
  total_price: number;
  status: string;
  package: { title: string; minimum_dp: number | null } | null;
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
  const { user } = useAuth();
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

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchData = async () => {
      // Fetch booking data
      const { data: bookingData } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, total_price, status,
          package:packages(title, minimum_dp),
          departure:package_departures(departure_date)
        `)
        .eq("id", bookingId)
        .eq("user_id", user.id)
        .single();

      if (bookingData) {
        setBooking(bookingData as unknown as BookingData);
      }

      // Fetch existing payments for this booking
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("id, amount, status, payment_type, created_at")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });

      if (paymentsData) {
        setExistingPayments(paymentsData as PaymentRecord[]);
      }

      setLoading(false);
    };

    fetchData();
  }, [bookingId, user, navigate]);

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

    // Create payment record
    await supabase.from("payments").insert({
      booking_id: booking.id,
      payment_method: "transfer",
      amount: paymentAmount,
      status: "pending",
      proof_url: proofUrl,
      payment_type: isFullPayment ? "full" : (paidAmount === 0 ? "dp" : "installment"),
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
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              {/* Package Info */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paket</span>
                  <span className="font-semibold">{booking.package?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Harga</span>
                  <span className="font-semibold">Rp {booking.total_price.toLocaleString("id-ID")}</span>
                </div>
                {minimumDp > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Minimal DP</span>
                    <span className="font-semibold text-gold">Rp {minimumDp.toLocaleString("id-ID")}</span>
                  </div>
                )}
              </div>

              {/* Payment Progress */}
              {(paidAmount > 0 || pendingAmount > 0) && (
                <div className="p-4 bg-muted rounded-xl space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress Pembayaran</span>
                    <span className="font-semibold">{paymentProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={paymentProgress} className="h-2" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Sudah Dibayar</div>
                      <div className="font-semibold text-green-600">Rp {paidAmount.toLocaleString("id-ID")}</div>
                    </div>
                    {pendingAmount > 0 && (
                      <div>
                        <div className="text-muted-foreground">Menunggu Verifikasi</div>
                        <div className="font-semibold text-yellow-600">Rp {pendingAmount.toLocaleString("id-ID")}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-muted-foreground">Sisa Pembayaran</div>
                      <div className="font-semibold text-gold">Rp {remainingAmount.toLocaleString("id-ID")}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment History */}
              {existingPayments.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Riwayat Pembayaran</h3>
                  <div className="space-y-2">
                    {existingPayments.map((payment, index) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            payment.status === "paid" ? "bg-green-100 text-green-700" :
                            payment.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium capitalize">
                              {payment.payment_type === "dp" ? "Down Payment" : 
                               payment.payment_type === "installment" ? "Cicilan" : "Pelunasan"}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {new Date(payment.created_at).toLocaleDateString("id-ID")}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">Rp {payment.amount.toLocaleString("id-ID")}</div>
                          <div className={`text-xs ${
                            payment.status === "paid" ? "text-green-600" :
                            payment.status === "pending" ? "text-yellow-600" :
                            "text-red-600"
                          }`}>
                            {payment.status === "paid" ? "Terverifikasi" :
                             payment.status === "pending" ? "Menunggu" : "Ditolak"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show payment form only if no pending payment and remaining > 0 */}
              {!hasPendingPayment && remainingAmount > 0 && (
                <>
                  {/* Payment Option Selection */}
                  {minimumDp > 0 && paidAmount === 0 && (
                    <div className="p-4 border border-border rounded-xl space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-gold" />
                        Pilih Jenis Pembayaran
                      </h3>
                      <RadioGroup value={paymentOption} onValueChange={(v) => setPaymentOption(v as "dp" | "full")}>
                        <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-gold/50 transition-colors">
                          <RadioGroupItem value="dp" id="dp" />
                          <Label htmlFor="dp" className="flex-1 cursor-pointer">
                            <div className="font-medium">Bayar DP Dulu</div>
                            <div className="text-sm text-muted-foreground">
                              Rp {minimumDp.toLocaleString("id-ID")} (minimal)
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-gold/50 transition-colors">
                          <RadioGroupItem value="full" id="full" />
                          <Label htmlFor="full" className="flex-1 cursor-pointer">
                            <div className="font-medium">Bayar Lunas</div>
                            <div className="text-sm text-muted-foreground">
                              Rp {remainingAmount.toLocaleString("id-ID")}
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  {/* Amount to Pay */}
                  <div className="p-4 border-2 border-gold/30 bg-gold/5 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">Jumlah yang Dibayar</span>
                      <span className="font-display font-bold text-2xl text-gold">
                        Rp {getCurrentPaymentAmount().toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  {/* Bank Info */}
                  <div className="p-4 border border-border rounded-xl">
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

                  {/* Upload Proof */}
                  <div className="border-2 border-dashed border-border rounded-xl p-6">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />
                    
                    {proofPreview ? (
                      <div className="space-y-4">
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                          <img src={proofPreview} alt="Bukti pembayaran" className="w-full h-full object-contain" />
                        </div>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                        >
                          {uploading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mengupload...</>
                          ) : (
                            <><Image className="w-4 h-4 mr-2" /> Ganti Bukti Pembayaran</>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full text-center"
                      >
                        <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                          {uploading ? (
                            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                          ) : (
                            <Upload className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        <div className="font-semibold">Upload Bukti Pembayaran</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          JPG, PNG, atau WebP (maks. 5MB)
                        </div>
                      </button>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground text-center">
                    Setelah transfer, upload bukti pembayaran dan klik konfirmasi.
                    Tim kami akan memverifikasi dalam 1x24 jam.
                  </div>

                  <Button 
                    onClick={handleConfirmPayment} 
                    className="w-full gradient-gold text-primary font-semibold"
                    disabled={!proofUrl || uploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Konfirmasi Pembayaran {paymentOption === "dp" && paidAmount === 0 ? "DP" : ""}
                  </Button>
                </>
              )}

              {/* Message when all paid */}
              {remainingAmount <= 0 && (
                <div className="p-6 text-center bg-green-50 rounded-xl">
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="font-bold text-lg text-green-800">Pembayaran Lunas!</h3>
                  <p className="text-green-600 mt-2">Terima kasih, pembayaran Anda telah selesai.</p>
                </div>
              )}

              {/* Message when pending */}
              {hasPendingPayment && remainingAmount > 0 && (
                <div className="p-6 text-center bg-yellow-50 rounded-xl">
                  <div className="w-16 h-16 mx-auto rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                    <Loader2 className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h3 className="font-bold text-lg text-yellow-800">Menunggu Verifikasi</h3>
                  <p className="text-yellow-600 mt-2">
                    Pembayaran Anda sedang diverifikasi. Silakan cek kembali nanti.
                  </p>
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
