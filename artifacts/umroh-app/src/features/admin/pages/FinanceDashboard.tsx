import { useState, useEffect } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import {
  TrendingUp, TrendingDown, Wallet, AlertCircle,
  CheckCircle2, Clock, ChevronRight, RefreshCw,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Summary {
  monthIncome:   number;
  totalPiutang:  number;
  piutangCount:  number;
  lunasCount:    number;
}
interface CashflowItem { month: string; dp: number; cicilan: number; pelunasan: number; total: number; }
interface DepartureItem {
  id: string; departureDate: string; packageTitle: string;
  bookingCount: number; targetRevenue: number; collected: number;
  outstanding: number; belumLunasCount: number; pctCollected: number;
}
interface AgingItem   { bucket: string; count: number; outstanding: number; }
interface DashboardData {
  summary:            Summary;
  cashflow:           CashflowItem[];
  upcomingDepartures: DepartureItem[];
  aging:              AgingItem[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const rp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const shortRp = (n: number) => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(1)} jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
};
const fmtMonth = (ym: string) => {
  try { return format(parseISO(ym + "-01"), "MMM yy", { locale: localeId }); } catch { return ym; }
};
const fmtDate = (d: string | null) => {
  if (!d) return "-";
  try { return format(parseISO(d), "d MMM yyyy", { locale: localeId }); } catch { return d; }
};

const AGING_META: Record<string, { label: string; color: string; bg: string }> = {
  overdue:   { label: "Lewat Jatuh Tempo", color: "text-red-600",    bg: "bg-red-50 border-red-200" },
  kritis:    { label: "Kritis (< 14 hari)",  color: "text-red-500",  bg: "bg-red-50 border-red-200" },
  mendesak:  { label: "Mendesak (14–30 hr)", color: "text-orange-500", bg: "bg-orange-50 border-orange-200" },
  perhatian: { label: "Perlu Perhatian (31–60 hr)", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
  normal:    { label: "Normal (> 60 hari)", color: "text-green-600",  bg: "bg-green-50 border-green-200" },
};

// ── StatCard ─────────────────────────────────────────────────────────────────
const StatCard = ({
  label, value, sub, icon: Icon, trend, color,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; trend?: "up" | "down" | "neutral"; color: string;
}) => (
  <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
    <div className={`rounded-lg p-2.5 ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-muted-foreground mb-0.5 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold leading-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
    {trend && (
      <div className={trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"}>
        {trend === "up" ? <TrendingUp className="w-4 h-4" /> : trend === "down" ? <TrendingDown className="w-4 h-4" /> : null}
      </div>
    )}
  </div>
);

// ── Custom Tooltip for chart ──────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm min-w-[160px]">
      <p className="font-semibold mb-2">{fmtMonth(label)}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.fill }}>{p.name}</span>
          <span className="font-medium">{shortRp(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const FinanceDashboard = () => {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const d = await apiFetch<DashboardData>("/api/admin/finance/dashboard");
      setData(d);
    } catch {
      toast.error("Gagal memuat dashboard keuangan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Keuangan</h1>
            <p className="text-muted-foreground text-sm">Ringkasan arus kas dan piutang</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 h-24 animate-pulse bg-muted/40" />
          ))}
        </div>
        <div className="bg-card border border-border rounded-xl h-72 animate-pulse bg-muted/40" />
      </div>
    );
  }

  if (!data) return null;

  const { summary, cashflow, upcomingDepartures, aging } = data;

  // Sort aging for display
  const agingOrder = ["overdue", "kritis", "mendesak", "perhatian", "normal"];
  const sortedAging = [...aging].sort((a, b) => agingOrder.indexOf(a.bucket) - agingOrder.indexOf(b.bucket));

  // Kritis alert
  const kritisAlerts = upcomingDepartures.filter(
    d => d.belumLunasCount > 0 && new Date(d.departureDate) <= new Date(Date.now() + 30 * 864e5)
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Keuangan</h1>
          <p className="text-muted-foreground text-sm">Ringkasan arus kas, piutang, dan keberangkatan mendatang</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Alert: departures dalam 30 hari masih ada yg belum lunas */}
      {kritisAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700">⚠️ {kritisAlerts.length} keberangkatan dalam 30 hari memiliki jemaah belum lunas</p>
            <ul className="mt-1 space-y-0.5">
              {kritisAlerts.slice(0, 3).map(d => (
                <li key={d.id} className="text-sm text-red-600">
                  • <strong>{d.packageTitle}</strong> — {fmtDate(d.departureDate)} —{" "}
                  {d.belumLunasCount} jemaah, sisa {shortRp(d.outstanding)}
                </li>
              ))}
              {kritisAlerts.length > 3 && (
                <li className="text-sm text-red-600">• ... dan {kritisAlerts.length - 3} keberangkatan lainnya</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Pemasukan Bulan Ini"
          value={shortRp(summary.monthIncome)}
          sub="dari semua pembayaran"
          icon={TrendingUp}
          color="bg-green-100 text-green-600"
          trend="up"
        />
        <StatCard
          label="Total Piutang Aktif"
          value={shortRp(summary.totalPiutang)}
          sub={`${summary.piutangCount} booking belum lunas`}
          icon={AlertCircle}
          color="bg-red-100 text-red-600"
          trend="down"
        />
        <StatCard
          label="Booking Lunas"
          value={summary.lunasCount.toString()}
          sub="pembayaran penuh"
          icon={CheckCircle2}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          label="Kritis (< 30 hr)"
          value={kritisAlerts.length.toString()}
          sub="keberangkatan berisiko"
          icon={Clock}
          color={kritisAlerts.length > 0 ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"}
          trend={kritisAlerts.length > 0 ? "down" : "neutral"}
        />
      </div>

      {/* Arus Kas Chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-base font-semibold mb-1">Arus Kas 12 Bulan Terakhir</h2>
        <p className="text-xs text-muted-foreground mb-4">Breakdown DP, cicilan, dan pelunasan</p>
        {cashflow.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
            Belum ada data pembayaran
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cashflow} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => shortRp(v).replace("Rp ", "")} tick={{ fontSize: 11 }} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="dp"        name="DP"        stackId="a" fill="#4ade80" radius={[0, 0, 0, 0]} />
              <Bar dataKey="cicilan"   name="Cicilan"   stackId="a" fill="#60a5fa" />
              <Bar dataKey="pelunasan" name="Pelunasan" stackId="a" fill="#0d6b4e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Aging Piutang */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-base font-semibold mb-1">Aging Piutang</h2>
          <p className="text-xs text-muted-foreground mb-4">Distribusi berdasarkan urgensi</p>
          {sortedAging.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada piutang aktif 🎉</p>
          ) : (
            <div className="space-y-3">
              {sortedAging.map(item => {
                const meta = AGING_META[item.bucket] ?? AGING_META.normal;
                const totalOutstanding = sortedAging.reduce((s, a) => s + a.outstanding, 0);
                const pct = totalOutstanding > 0 ? Math.round((item.outstanding / totalOutstanding) * 100) : 0;
                return (
                  <div key={item.bucket} className={`border rounded-lg p-3 ${meta.bg}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
                      <span className="text-xs text-muted-foreground">{item.count} booking</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <Progress value={pct} className="h-1.5 flex-1" />
                      <span className={`text-sm font-semibold ${meta.color} shrink-0`}>{shortRp(item.outstanding)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Departures */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-base font-semibold mb-1">Keberangkatan 90 Hari ke Depan</h2>
          <p className="text-xs text-muted-foreground mb-4">Target revenue vs terkumpul</p>
          {upcomingDepartures.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada keberangkatan dalam 90 hari</p>
          ) : (
            <div className="space-y-4 overflow-y-auto max-h-72 pr-1">
              {upcomingDepartures.map(dep => (
                <div key={dep.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight truncate">{dep.packageTitle}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(dep.departureDate)} · {dep.bookingCount} booking</p>
                    </div>
                    {dep.belumLunasCount > 0 ? (
                      <Badge variant="destructive" className="text-[10px] shrink-0">
                        {dep.belumLunasCount} blm lunas
                      </Badge>
                    ) : (
                      <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200 shrink-0">
                        Semua lunas ✓
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Terkumpul {shortRp(dep.collected)}</span>
                      <span>{dep.pctCollected}% dari {shortRp(dep.targetRevenue)}</span>
                    </div>
                    <Progress value={dep.pctCollected} className="h-2" />
                    {dep.outstanding > 0 && (
                      <p className="text-xs text-red-500 font-medium">Sisa piutang: {shortRp(dep.outstanding)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;
