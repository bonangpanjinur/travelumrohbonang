import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "@/shared/lib/apiClient";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Calendar,
  Package,
  User,
  CreditCard,
  ArrowLeft,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";

interface TrackingData {
  bookingCode: string;
  status: string;
  paymentScheme: string;
  packageTitle: string;
  departureDate: string | null;
  returnDate: string | null;
  customerName: string;
  totalPrice: number;
  totalPaid: number;
  remaining: number;
  createdAt: string;
  payments: { type: string; amount: number; paidAt: string; method: string | null }[];
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; Icon: typeof CheckCircle2 }
> = {
  draft: { label: "Draft", color: "text-gray-600", bg: "bg-gray-100", Icon: Clock },
  waiting_payment: { label: "Menunggu Pembayaran", color: "text-amber-700", bg: "bg-amber-50", Icon: Clock },
  pending: { label: "Pending", color: "text-blue-700", bg: "bg-blue-50", Icon: Clock },
  confirmed: { label: "Terkonfirmasi", color: "text-green-700", bg: "bg-green-50", Icon: CheckCircle2 },
  completed: { label: "Selesai / Lunas", color: "text-emerald-700", bg: "bg-emerald-50", Icon: CheckCircle2 },
  cancelled: { label: "Dibatalkan", color: "text-red-700", bg: "bg-red-50", Icon: XCircle },
};

const TYPE_LABEL: Record<string, string> = {
  dp: "DP (Uang Muka)",
  installment: "Cicilan",
  full: "Pembayaran Penuh",
  balance: "Pelunasan",
};

const TrackBooking = () => {
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
  const formatDate = (d: string | null | undefined) => {
    if (!d) return "-";
    try {
      return format(new Date(d), "d MMMM yyyy", { locale: localeId });
    } catch {
      return d;
    }
  };

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    apiFetch<TrackingData>(`/api/track/${code}`)
      .then(setData)
      .catch((e) => setError(e?.message || "Booking tidak ditemukan"))
      .finally(() => setLoading(false));
  }, [code]);

  const statusCfg = data
    ? STATUS_CONFIG[data.status] ?? {
        label: data.status,
        color: "text-gray-600",
        bg: "bg-gray-100",
        Icon: AlertCircle,
      }
    : null;

  const paidPercent = data
    ? Math.min(100, Math.round((data.totalPaid / Math.max(1, data.totalPrice)) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <div className="bg-primary text-primary-foreground py-5 px-4 shadow">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link to="/" className="opacity-70 hover:opacity-100 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">Status Booking</h1>
            {code && (
              <p className="font-mono text-sm text-primary-foreground/70">{code}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3 text-muted-foreground">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            <p className="text-sm">Memuat data…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-20 gap-4 text-center">
            <AlertCircle className="w-14 h-14 text-muted-foreground/50" />
            <div>
              <p className="font-semibold text-lg">Tidak Ditemukan</p>
              <p className="text-muted-foreground text-sm mt-1">{error}</p>
            </div>
            <Link to="/" className="text-primary underline text-sm">
              Kembali ke beranda
            </Link>
          </div>
        ) : data && statusCfg ? (
          <>
            {/* Status banner */}
            <div className={`rounded-xl p-4 ${statusCfg.bg} flex items-center gap-3`}>
              <statusCfg.Icon className={`w-7 h-7 ${statusCfg.color} shrink-0`} />
              <div>
                <p className={`font-bold text-base ${statusCfg.color}`}>{statusCfg.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Dibuat {formatDate(data.createdAt)}
                </p>
              </div>
            </div>

            {/* Booking info */}
            <div className="bg-card border rounded-xl p-4 space-y-3">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Info Perjalanan
              </h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" /> Pemesan
                  </p>
                  <p className="font-semibold">{data.customerName}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Package className="w-3 h-3" /> Paket
                  </p>
                  <p className="font-semibold text-sm">{data.packageTitle}</p>
                </div>
                {data.departureDate && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Keberangkatan
                    </p>
                    <p className="font-semibold">{formatDate(data.departureDate)}</p>
                  </div>
                )}
                {data.returnDate && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Kembali</p>
                    <p className="font-semibold">{formatDate(data.returnDate)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment summary */}
            <div className="bg-card border rounded-xl p-4 space-y-3">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Ringkasan Pembayaran
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Tagihan</span>
                  <span className="font-semibold">{formatRp(data.totalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sudah Dibayar</span>
                  <span className="font-semibold text-green-600">{formatRp(data.totalPaid)}</span>
                </div>
                {data.remaining > 0 && (
                  <div className="flex justify-between font-semibold text-destructive">
                    <span>Sisa Tagihan</span>
                    <span>{formatRp(data.remaining)}</span>
                  </div>
                )}
              </div>

              {/* Progress */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress Pelunasan</span>
                  <span className="font-semibold">{paidPercent}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all"
                    style={{ width: `${paidPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Payment history */}
            {data.payments.length > 0 && (
              <div className="bg-card border rounded-xl p-4 space-y-3">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Riwayat Pembayaran
                </h2>
                <div className="space-y-0">
                  {data.payments.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {TYPE_LABEL[p.type] || p.type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(p.paidAt)}
                          {p.method ? ` · ${p.method}` : ""}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="font-semibold text-green-700 bg-green-50"
                      >
                        {formatRp(p.amount)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default TrackBooking;
