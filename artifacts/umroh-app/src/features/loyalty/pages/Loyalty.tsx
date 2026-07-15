import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";
import Navbar from "@/shared/components/layout/Navbar";
import Footer from "@/shared/components/layout/Footer";
import SEO from "@/shared/components/seo/SEO";
import LoadingSpinner from "@/shared/components/ui/loading-spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Gift, ArrowLeft, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { apiFetch } from "@/shared/lib/apiClient";

interface LoyaltyPointEntry {
  id: string;
  points: number;
  source: string | null;
  description: string | null;
  createdAt: string;
}

interface LoyaltyMyResponse {
  totalPoints: number;
  history: LoyaltyPointEntry[];
}

const SOURCE_LABELS: Record<string, string> = {
  booking_completed: "Poin dari perjalanan selesai",
  booking_redeem: "Ditukar untuk diskon booking",
  manual_adjustment: "Penyesuaian oleh admin",
};

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default function Loyalty() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<LoyaltyMyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await apiFetch<LoyaltyMyResponse>("/api/loyalty/my");
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (authLoading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-muted/30">
      <SEO title="Poin Loyalitas Saya" noIndex />
      <Navbar />
      <main className="pt-24 pb-16 container-custom section-padding max-w-3xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className="mb-4 -ml-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Kembali ke Dashboard
        </Button>

        <h1 className="text-3xl font-display font-bold mb-2 flex items-center gap-2">
          <Gift className="text-gold" /> Poin Loyalitas Saya
        </h1>
        <p className="text-muted-foreground mb-8">
          Kumpulkan poin dari setiap perjalanan yang selesai, lalu tukarkan untuk diskon booking berikutnya.
        </p>

        <Card className="mb-6 border-none shadow-xl bg-primary text-primary-foreground overflow-hidden relative">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <CardContent className="p-8 relative z-10">
            {loading ? (
              <div className="h-16 animate-pulse bg-white/10 rounded-lg" />
            ) : (
              <>
                <p className="text-primary-foreground/80 text-sm mb-1">Total Poin Anda</p>
                <p className="text-4xl font-bold tracking-tight">
                  {(data?.totalPoints ?? 0).toLocaleString("id-ID")} poin
                </p>
                <p className="text-primary-foreground/70 text-sm mt-2">
                  Setara dengan {formatIDR((data?.totalPoints ?? 0) * 100)} diskon
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="p-5 flex items-start gap-3 text-sm text-muted-foreground">
            <Sparkles className="h-5 w-5 text-gold shrink-0 mt-0.5" />
            <p>
              Anda mendapat <strong>1 poin</strong> untuk setiap <strong>Rp 100.000</strong> nilai
              perjalanan yang berstatus selesai. Minimal <strong>100 poin</strong> (setara Rp 10.000)
              dapat ditukar sebagai diskon saat membuat booking baru.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-lg">Riwayat Poin</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground text-center">Memuat…</p>
            ) : !data?.history?.length ? (
              <p className="p-6 text-sm text-muted-foreground text-center">
                Belum ada riwayat poin. Selesaikan perjalanan pertama Anda untuk mulai mengumpulkan poin.
              </p>
            ) : (
              <ul className="divide-y">
                {data.history.map((entry) => {
                  const isPositive = entry.points > 0;
                  return (
                    <li key={entry.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-full shrink-0 ${
                            isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {SOURCE_LABELS[entry.source ?? ""] ?? entry.source ?? "Poin"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.createdAt
                              ? formatDistanceToNow(new Date(entry.createdAt), { locale: localeId, addSuffix: true })
                              : ""}
                          </p>
                        </div>
                      </div>
                      <span className={`font-semibold shrink-0 ${isPositive ? "text-success" : "text-destructive"}`}>
                        {isPositive ? "+" : ""}
                        {entry.points.toLocaleString("id-ID")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
