import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Users, ShoppingBag, CreditCard, TrendingUp, CalendarCheck,
  UserPlus, Building2, UserCheck, Download, Target, ShieldCheck,
  RefreshCw, AlertCircle, CheckCircle2, Clock, Wallet, ArrowUpRight,
  ExternalLink, AlertTriangle, Flame, Siren, Info, ChevronDown, ChevronUp, X,
} from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "wouter";
import { useAuth } from "@/shared/hooks/useAuth";
import { apiFetch } from "@/shared/lib/apiClient";
import { format, formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  ReferenceLine,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { exportToCsv } from "@/shared/lib/exportCsv";
import { cn } from "@/shared/lib/utils";

interface RecentBooking {
  id: string;
  bookingCode: string;
  status: string;
  createdAt: string;
  totalPrice: number;
  userName: string | null;
  userEmail: string | null;
  packageTitle: string | null;
}

interface MonthlyTrend {
  month: string;
  count: number;
}

interface DashboardStats {
  totalBookings: number;
  pendingPayments: number;
  totalAgents: number;
  activePackages: number;
  totalPilgrims: number;
  totalBranches: number;
  totalMuthawifs: number;
  totalRevenue: number;
  totalOutstanding: number;
  monthlyTrend: MonthlyTrend[];
}

interface AgingBucket {
  bucket: "overdue" | "kritis" | "mendesak" | "perhatian" | "normal";
  count: number;
  outstanding: number;
}

interface FinanceDashboard {
  summary: {
    monthIncome: number;
    totalPiutang: number;
    piutangCount: number;
    lunasCount: number;
  };
  aging: AgingBucket[];
  upcomingDepartures: {
    id: string;
    departureDate: string;
    packageTitle: string;
    bookingCount: number;
    targetRevenue: number;
    collected: number;
    outstanding: number;
    belumLunasCount: number;
    pctCollected: number;
  }[];
}

type Period = "7days" | "30days" | "3months" | "6months" | "1year";

interface Targets {
  bookings: string;
  revenue: string;
  pilgrims: string;
}

const DEFAULT_TARGETS: Targets = { bookings: "", revenue: "", pilgrims: "" };
const STORAGE_KEY = "dashboard_targets";
const AUTO_REFRESH_MS = 30_000;

const PERIODS: { value: Period; label: string }[] = [
  { value: "7days",   label: "7 Hari" },
  { value: "30days",  label: "30 Hari" },
  { value: "3months", label: "3 Bulan" },
  { value: "6months", label: "6 Bulan" },
  { value: "1year",   label: "1 Tahun" },
];

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  paid:            { label: "Lunas",    className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  confirmed:       { label: "Konfirmasi", className: "bg-blue-100 text-blue-700 border-blue-200" },
  waiting_payment: { label: "Menunggu", className: "bg-amber-100 text-amber-700 border-amber-200" },
  pending:         { label: "Pending",  className: "bg-amber-100 text-amber-700 border-amber-200" },
  cancelled:       { label: "Batal",    className: "bg-red-100 text-red-700 border-red-200" },
  draft:           { label: "Draft",    className: "bg-gray-100 text-gray-500 border-gray-200" },
};

const AGING_CONFIG: Record<string, { label: string; shortLabel: string; icon: React.ElementType; bg: string; text: string; border: string; badgeBg: string }> = {
  overdue:   { label: "Sudah Lewat", shortLabel: "Lewat",    icon: Siren,         bg: "bg-red-50 dark:bg-red-950/30",     text: "text-red-700",    border: "border-red-200",    badgeBg: "bg-red-600" },
  kritis:    { label: "≤ 14 Hari",   shortLabel: "Kritis",   icon: Flame,         bg: "bg-rose-50 dark:bg-rose-950/30",   text: "text-rose-700",   border: "border-rose-200",   badgeBg: "bg-rose-600" },
  mendesak:  { label: "≤ 30 Hari",   shortLabel: "Mendesak", icon: AlertTriangle, bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700", border: "border-orange-200", badgeBg: "bg-orange-500" },
  perhatian: { label: "≤ 60 Hari",   shortLabel: "Perhatian",icon: AlertCircle,   bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700",  border: "border-amber-200",  badgeBg: "bg-amber-500" },
  normal:    { label: "> 60 Hari",   shortLabel: "Normal",   icon: Info,          bg: "bg-slate-50 dark:bg-slate-900/30", text: "text-slate-600",  border: "border-slate-200",  badgeBg: "bg-slate-500" },
};

function formatRp(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
  if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(1)} jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  iconBg: string;
  loading?: boolean;
  alert?: boolean;
  alertLevel?: "warning" | "danger";
  isCurrency?: boolean;
  sub?: string;
  href?: string;
}

const KpiCard = ({ title, value, icon: Icon, iconBg, loading, alert, alertLevel = "danger", isCurrency, sub, href }: KpiCardProps) => {
  const ringColor = alertLevel === "danger" ? "ring-red-500 ring-offset-1" : "ring-amber-400 ring-offset-1";
  const barColor  = alertLevel === "danger" ? "bg-red-500" : "bg-amber-400";

  const card = (
    <Card className={cn(
      "relative overflow-hidden transition-all",
      href ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0" : "",
      alert ? `ring-2 ${ringColor}` : "",
    )}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
              {href && !loading && <ExternalLink className="w-3 h-3 text-muted-foreground/50" />}
            </div>
            {loading ? (
              <div className="mt-2 h-7 w-24 bg-muted animate-pulse rounded-md" />
            ) : (
              <p className={cn("mt-1.5 font-bold leading-none", isCurrency ? "text-xl" : "text-3xl",
                alert && alertLevel === "danger" ? "text-red-600 dark:text-red-400" : ""
              )}>
                {isCurrency ? formatRp(Number(value)) : value}
              </p>
            )}
            {sub && !loading && (
              <p className={cn("mt-1.5 text-xs", alert ? "text-red-500 font-medium" : "text-muted-foreground")}>{sub}</p>
            )}
          </div>
          <div className={cn("rounded-xl p-2.5 text-white shadow shrink-0", iconBg)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {alert && !loading && (
          <div className={cn("absolute bottom-0 left-0 right-0 h-1", barColor)} />
        )}
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href} className="block">{card}</Link>;
  return card;
};

// ── Main Component ────────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const { role, user } = useAuth();
  const [stats, setStats] = useState<Omit<DashboardStats, "monthlyTrend">>({
    totalBookings: 0, totalAgents: 0, pendingPayments: 0,
    activePackages: 0, totalPilgrims: 0, totalBranches: 0,
    totalMuthawifs: 0, totalRevenue: 0, totalOutstanding: 0,
  });
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [financeDash, setFinanceDash]     = useState<FinanceDashboard | null>(null);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [lastUpdated, setLastUpdated]     = useState<Date | null>(null);
  const [period, setPeriod]               = useState<Period>("6months");
  const [periodStats, setPeriodStats]     = useState<any>(null);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [targets, setTargets] = useState<Targets>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || DEFAULT_TARGETS; }
    catch { return DEFAULT_TARGETS; }
  });
  const [targetDialog, setTargetDialog]       = useState(false);
  const [targetForm, setTargetForm]           = useState<Targets>(targets);
  const [agingExpanded, setAgingExpanded]     = useState(true);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [, forceRender] = useState(0);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => forceRender(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchAll = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [statsResult, recentResult, financeResult] = await Promise.all([
        apiFetch<DashboardStats>("/api/admin/analytics/dashboard-stats").catch(() => null),
        apiFetch<{ data: RecentBooking[] }>("/api/admin/bookings?limit=5").catch(() => ({ data: [] as RecentBooking[] })),
        apiFetch<FinanceDashboard>("/api/admin/finance/dashboard").catch(() => null),
      ]);
      if (statsResult) {
        const { monthlyTrend: trend, ...counts } = statsResult;
        setStats(counts);
        setMonthlyTrend(trend ?? []);
      }
      setRecentBookings(recentResult?.data || []);
      if (financeResult) setFinanceDash(financeResult);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      if (isManual) toast.error("Gagal memperbarui data");
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(false);
    tickRef.current = setInterval(() => fetchAll(false), AUTO_REFRESH_MS);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [fetchAll]);

  const fetchPeriodStats = useCallback(async (p: Period) => {
    setPeriodLoading(true);
    try {
      const data = await apiFetch<any>(`/api/admin/analytics/summary?period=${p}`);
      setPeriodStats(data);
    } catch {
      // silent
    } finally {
      setPeriodLoading(false);
    }
  }, []);

  useEffect(() => { fetchPeriodStats(period); }, [period, fetchPeriodStats]);

  const handleManualRefresh = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => fetchAll(false), AUTO_REFRESH_MS);
    fetchAll(true);
    fetchPeriodStats(period);
  };

  const saveTargets = () => {
    setTargets(targetForm);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(targetForm));
    setTargetDialog(false);
    toast.success("Target disimpan");
  };

  const handleExport = () => {
    const rows: [string, string][] = [
      ["Total Booking",    String(stats.totalBookings)],
      ["Belum Lunas",      String(stats.pendingPayments)],
      ["Total Pendapatan", String(stats.totalRevenue)],
      ["Total Piutang",    String(stats.totalOutstanding)],
      ["Total Agen",       String(stats.totalAgents)],
      ["Paket Aktif",      String(stats.activePackages)],
      ["Total Jamaah",     String(stats.totalPilgrims)],
      ["Cabang",           String(stats.totalBranches)],
      ["Muthawif",         String(stats.totalMuthawifs)],
    ];
    if (periodStats?.kpis) {
      rows.push(
        [`Booking (${period})`, String(periodStats.kpis.bookings)],
        [`Revenue (${period})`, String(periodStats.kpis.revenue)],
      );
    }
    exportToCsv(`dashboard_${period}_${new Date().toISOString().slice(0, 10)}`, ["Metrik", "Nilai"], rows);
    toast.success("Data dashboard diekspor");
  };

  const trendData = periodStats?.trend?.map((t: any) => ({
    month:   t.key,
    count:   t.bookings,
    revenue: t.revenue,
    target:  targets.bookings ? Number(targets.bookings) : undefined,
  })) || monthlyTrend.map(t => ({
    month:  t.month,
    count:  t.count,
    target: targets.bookings ? Number(targets.bookings) / 6 : undefined,
  }));

  const periodBookings   = periodStats?.kpis?.bookings ?? null;
  const periodRevenue    = periodStats?.kpis?.revenue ?? null;
  const targetBookings   = targets.bookings ? Number(targets.bookings) : null;
  const targetRevenue    = targets.revenue  ? Number(targets.revenue)  : null;

  const paidCount      = stats.totalBookings - stats.pendingPayments;
  const collectionRate = stats.totalBookings > 0
    ? Math.round((paidCount / stats.totalBookings) * 100) : 0;

  // Aging helpers
  const aging = financeDash?.aging ?? [];
  const getAging = (bucket: string) => aging.find(a => a.bucket === bucket);
  const overdueAging   = getAging("overdue");
  const kritisAging    = getAging("kritis");
  const mendesakAging  = getAging("mendesak");
  const perhatianAging = getAging("perhatian");
  const urgentCount    = (overdueAging?.count ?? 0) + (kritisAging?.count ?? 0);
  const urgentAmount   = (overdueAging?.outstanding ?? 0) + (kritisAging?.outstanding ?? 0);
  const hasDebt        = stats.totalOutstanding > 0;
  const isUrgent       = urgentCount > 0;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Ringkasan aktivitas travel Umrah Anda.</p>
          {role === "agent" && (
            <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Data Agen: {user?.firstName ?? "Anda"} — hanya booking yang Anda tangani
            </span>
          )}
          {role === "branch_manager" && (
            <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> Data Cabang Anda
            </span>
          )}
          {role === "finance" && (
            <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> Data Cabang Anda
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border rounded-lg overflow-hidden bg-muted/30">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  period === p.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={() => { setTargetForm(targets); setTargetDialog(true); }}>
            <Target className="w-3.5 h-3.5 mr-1.5" /> Target
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export
          </Button>

          <div className="flex items-center gap-2 text-xs text-muted-foreground border rounded-lg px-3 py-1.5 bg-muted/20">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              title="Refresh sekarang"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
              {lastUpdated ? (
                <span>
                  {formatDistanceToNow(lastUpdated, { locale: localeId, addSuffix: false }) === "kurang dari semenit"
                    ? "baru saja"
                    : formatDistanceToNow(lastUpdated, { locale: localeId, addSuffix: true })}
                </span>
              ) : (
                <span>{new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              )}
            </button>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
        </div>
      </div>

      {/* ── DEBT WARNING BANNER ── */}
      {!loading && isUrgent && !warningDismissed && (
        <div className="relative flex items-center gap-3 p-4 bg-red-600 text-white rounded-xl shadow-lg">
          <div className="bg-red-500 rounded-lg p-2 shrink-0">
            <Siren className="w-5 h-5 animate-pulse" />
          </div>
          <Link href="/admin/piutang" className="flex-1 min-w-0 cursor-pointer">
            <p className="font-bold text-sm">
              ⚠️ Peringatan Piutang Mendesak — {urgentCount} booking butuh tindakan segera
            </p>
            <p className="text-red-100 text-xs mt-0.5">
              Total tagihan kritis/lewat jatuh tempo:{" "}
              <span className="font-bold text-white">{formatRp(urgentAmount)}</span>
              {" "}· Klik untuk lihat detail
            </p>
          </Link>
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {overdueAging && overdueAging.count > 0 && (
              <Link href="/admin/piutang?bucket=overdue">
                <div className="text-center bg-red-700/60 hover:bg-red-700/80 rounded-lg px-3 py-1.5 transition-colors cursor-pointer">
                  <p className="text-lg font-bold leading-none">{overdueAging.count}</p>
                  <p className="text-[10px] text-red-200 mt-0.5">Lewat Jatuh Tempo</p>
                </div>
              </Link>
            )}
            {kritisAging && kritisAging.count > 0 && (
              <Link href="/admin/piutang?bucket=kritis">
                <div className="text-center bg-red-700/60 hover:bg-red-700/80 rounded-lg px-3 py-1.5 transition-colors cursor-pointer">
                  <p className="text-lg font-bold leading-none">{kritisAging.count}</p>
                  <p className="text-[10px] text-red-200 mt-0.5">≤14 Hari Kritis</p>
                </div>
              </Link>
            )}
          </div>
          <button
            onClick={() => setWarningDismissed(true)}
            title="Tutup peringatan"
            className="shrink-0 p-1.5 rounded-lg bg-red-500/50 hover:bg-red-500/80 transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Soft warning when there's debt but not urgent */}
      {!loading && hasDebt && !isUrgent && !warningDismissed && (
        <div className="relative flex items-center gap-3 p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <Link href="/admin/piutang" className="flex-1 min-w-0 cursor-pointer hover:underline">
            <p className="text-sm font-semibold">
              {stats.pendingPayments} booking belum lunas — total piutang {formatRp(stats.totalOutstanding)}
            </p>
            <p className="text-xs text-red-500 mt-0.5">Klik untuk melihat daftar piutang lengkap →</p>
          </Link>
          <button
            onClick={() => setWarningDismissed(true)}
            title="Tutup peringatan"
            className="shrink-0 p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      )}

      {/* ── Financial highlight row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/admin/finance-dashboard" className="sm:col-span-1 block group">
          <Card className="h-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg cursor-pointer group-hover:shadow-xl group-hover:-translate-y-0.5 transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wide">Total Pendapatan</p>
                <Wallet className="w-5 h-5 text-emerald-200" />
              </div>
              {loading ? (
                <div className="h-8 w-32 bg-emerald-400/50 animate-pulse rounded-md" />
              ) : (
                <p className="text-2xl font-bold">{formatRp(stats.totalRevenue)}</p>
              )}
              <p className="text-xs text-emerald-100 mt-1.5">dari semua pembayaran terverifikasi →</p>
            </CardContent>
          </Card>
        </Link>

        {/* Total Piutang — RED gradient */}
        <Link href="/admin/piutang" className="sm:col-span-1 block group">
          <Card className={cn(
            "h-full border-0 shadow-lg cursor-pointer group-hover:shadow-xl group-hover:-translate-y-0.5 transition-all",
            hasDebt
              ? "bg-gradient-to-br from-red-600 to-red-800 text-white"
              : "bg-gradient-to-br from-slate-100 to-slate-200",
          )}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className={cn("text-xs font-semibold uppercase tracking-wide",
                  hasDebt ? "text-red-100" : "text-muted-foreground"
                )}>
                  Total Piutang Aktif
                </p>
                <AlertCircle className={cn("w-5 h-5", hasDebt ? "text-red-200" : "text-muted-foreground")} />
              </div>
              {loading ? (
                <div className="h-8 w-32 bg-white/20 animate-pulse rounded-md" />
              ) : (
                <p className={cn("text-2xl font-bold", hasDebt ? "text-white" : "text-muted-foreground")}>
                  {hasDebt ? formatRp(stats.totalOutstanding) : "Rp 0"}
                </p>
              )}
              {!loading && (
                <>
                  <p className={cn("text-xs mt-1.5", hasDebt ? "text-red-100" : "text-muted-foreground")}>
                    {stats.pendingPayments > 0
                      ? `${stats.pendingPayments} booking belum lunas →`
                      : "Semua booking sudah lunas 🎉"}
                  </p>
                  {/* Aging mini pills */}
                  {hasDebt && aging.length > 0 && (
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      {overdueAging && overdueAging.count > 0 && (
                        <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30">
                          🔴 {overdueAging.count} lewat
                        </span>
                      )}
                      {kritisAging && kritisAging.count > 0 && (
                        <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30">
                          🔥 {kritisAging.count} kritis
                        </span>
                      )}
                      {mendesakAging && mendesakAging.count > 0 && (
                        <span className="text-[10px] bg-white/15 text-red-100 px-2 py-0.5 rounded-full border border-white/20">
                          ⚠️ {mendesakAging.count} mendesak
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/payments" className="sm:col-span-1 block group">
          <Card className="h-full border shadow-sm cursor-pointer group-hover:shadow-md group-hover:-translate-y-0.5 transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tingkat Pelunasan</p>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              {loading ? (
                <div className="h-8 w-20 bg-muted animate-pulse rounded-md" />
              ) : (
                <p className={cn("text-3xl font-bold",
                  collectionRate >= 80 ? "text-emerald-600" : collectionRate >= 50 ? "text-amber-600" : "text-red-600"
                )}>
                  {collectionRate}%
                </p>
              )}
              <div className="mt-3">
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className={cn("h-1.5 rounded-full transition-all duration-500",
                      collectionRate >= 80 ? "bg-emerald-500" :
                      collectionRate >= 50 ? "bg-amber-500" : "bg-red-500"
                    )}
                    style={{ width: `${collectionRate}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {paidCount} dari {stats.totalBookings} booking lunas →
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ── Aging Piutang breakdown (collapsible) ── */}
      {!loading && hasDebt && aging.length > 0 && (
        <Card className="border-l-4 border-l-red-500 overflow-hidden">
          {/* Header — always visible, click to toggle */}
          <button
            onClick={() => setAgingExpanded(v => !v)}
            className="w-full text-left"
            aria-expanded={agingExpanded}
          >
            <div className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-none">Analisa Piutang Belum Lunas</p>
                  {!agingExpanded && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {aging.filter(a => a.count > 0).map(a => {
                        const cfg = AGING_CONFIG[a.bucket];
                        return cfg ? `${a.count} ${cfg.shortLabel}` : null;
                      }).filter(Boolean).join(" · ")}
                      {" — "}{formatRp(stats.totalOutstanding)} total
                    </p>
                  )}
                  {agingExpanded && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pengelompokan tagihan berdasarkan urgensi waktu keberangkatan
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                {!agingExpanded && (
                  <div className="hidden sm:flex gap-1.5">
                    {(["overdue", "kritis", "mendesak"] as const).map(bucket => {
                      const a = getAging(bucket);
                      if (!a || a.count === 0) return null;
                      const cfg = AGING_CONFIG[bucket];
                      return (
                        <span key={bucket} className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", cfg.bg, cfg.text, cfg.border)}>
                          {a.count} {cfg.shortLabel}
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className={cn(
                  "p-1 rounded-md transition-colors",
                  agingExpanded ? "bg-red-50 text-red-500" : "bg-muted/50 text-muted-foreground"
                )}>
                  {agingExpanded
                    ? <ChevronUp className="w-4 h-4" />
                    : <ChevronDown className="w-4 h-4" />
                  }
                </div>
              </div>
            </div>
          </button>

          {/* Collapsible body */}
          {agingExpanded && (
            <CardContent className="px-5 pb-4 pt-0">
              <div className="flex items-center justify-between mb-3">
                <div className="h-px flex-1 bg-border" />
                <Link href="/admin/piutang" className="ml-3 shrink-0">
                  <Button variant="outline" size="sm" className="text-xs h-7 border-red-200 text-red-600 hover:bg-red-50">
                    Lihat Semua <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(["overdue", "kritis", "mendesak", "perhatian"] as const).map(bucket => {
                  const a = getAging(bucket);
                  if (!a || a.count === 0) return null;
                  const cfg = AGING_CONFIG[bucket];
                  const Icon = cfg.icon;
                  return (
                    <Link key={bucket} href={`/admin/piutang?bucket=${bucket}`} className="block">
                      <div className={cn(
                        "rounded-xl p-3 border cursor-pointer hover:shadow-sm transition-all",
                        cfg.bg, cfg.border
                      )}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={cn("text-[10px] font-bold uppercase tracking-wide", cfg.text)}>
                            {cfg.shortLabel}
                          </span>
                          <span className={cn("text-[9px] text-white font-medium px-1.5 py-0.5 rounded-full", cfg.badgeBg)}>
                            {cfg.label}
                          </span>
                        </div>
                        <div className="flex items-end justify-between gap-1">
                          <div>
                            <p className={cn("text-2xl font-bold leading-none", cfg.text)}>{a.count}</p>
                            <p className={cn("text-[10px] mt-0.5 opacity-75", cfg.text)}>booking</p>
                          </div>
                          <Icon className={cn("w-5 h-5 opacity-60", cfg.text)} />
                        </div>
                        <p className={cn("text-[11px] font-semibold mt-2", cfg.text)}>
                          {formatRp(a.outstanding)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Upcoming departures with debt */}
              {financeDash && financeDash.upcomingDepartures.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Keberangkatan Mendatang dengan Piutang
                  </p>
                  <div className="space-y-2">
                    {financeDash.upcomingDepartures.slice(0, 4).map(dep => (
                      <div key={dep.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="shrink-0 text-center bg-background rounded-lg px-2 py-1 border min-w-[52px]">
                          <p className="text-[10px] text-muted-foreground">{format(new Date(dep.departureDate), "MMM", { locale: localeId })}</p>
                          <p className="text-sm font-bold leading-none">{format(new Date(dep.departureDate), "dd")}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{dep.packageTitle}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-muted rounded-full h-1.5 max-w-[80px]">
                              <div
                                className={cn("h-1.5 rounded-full", dep.pctCollected >= 80 ? "bg-emerald-500" : dep.pctCollected >= 50 ? "bg-amber-500" : "bg-red-500")}
                                style={{ width: `${dep.pctCollected}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{dep.pctCollected}% lunas</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-bold text-red-600">{formatRp(dep.outstanding)}</p>
                          <p className="text-[10px] text-muted-foreground">{dep.belumLunasCount} blm lunas</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Operational KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Total Booking"
          value={stats.totalBookings}
          icon={ShoppingBag}
          iconBg="bg-blue-500"
          loading={loading}
          sub={`periode ${PERIODS.find(p => p.value === period)?.label}`}
          href="/admin/bookings"
        />
        <KpiCard
          title="Belum Lunas"
          value={stats.pendingPayments}
          icon={CreditCard}
          iconBg="bg-red-500"
          loading={loading}
          alert={stats.pendingPayments > 0}
          alertLevel="danger"
          sub={stats.pendingPayments > 0 ? `${formatRp(stats.totalOutstanding)} belum terbayar` : "semua sudah bayar ✓"}
          href="/admin/piutang"
        />
        <KpiCard
          title="Total Jamaah"
          value={stats.totalPilgrims}
          icon={UserCheck}
          iconBg="bg-teal-500"
          loading={loading}
          href="/admin/pilgrims"
        />
        <KpiCard
          title="Paket Aktif"
          value={stats.activePackages}
          icon={CalendarCheck}
          iconBg="bg-green-500"
          loading={loading}
          href="/admin/packages"
        />
        <KpiCard
          title="Total Agen"
          value={stats.totalAgents}
          icon={Users}
          iconBg="bg-purple-500"
          loading={loading}
          href="/admin/agents"
        />
        <KpiCard
          title="Cabang"
          value={stats.totalBranches}
          icon={Building2}
          iconBg="bg-indigo-500"
          loading={loading}
          href="/admin/branches"
        />
        <KpiCard
          title="Muthawif"
          value={stats.totalMuthawifs}
          icon={UserPlus}
          iconBg="bg-pink-500"
          loading={loading}
          href="/admin/muthawifs"
        />
        {/* Revenue per periode */}
        <Link href="/admin/analytics" className="block">
          <Card className="relative overflow-hidden border shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Revenue {PERIODS.find(p => p.value === period)?.label}
                    </p>
                    <ExternalLink className="w-3 h-3 text-muted-foreground/50" />
                  </div>
                  {loading || periodLoading ? (
                    <div className="mt-2 h-7 w-24 bg-muted animate-pulse rounded-md" />
                  ) : (
                    <p className="mt-1.5 text-xl font-bold leading-none">
                      {periodRevenue !== null ? formatRp(periodRevenue) : "—"}
                    </p>
                  )}
                  {!loading && !periodLoading && periodRevenue !== null && periodStats?.kpis?.prevRevenue > 0 && (
                    <p className={cn("text-xs mt-1.5 flex items-center gap-0.5",
                      periodRevenue >= periodStats.kpis.prevRevenue ? "text-emerald-600" : "text-red-500"
                    )}>
                      <ArrowUpRight className={cn("w-3 h-3", periodRevenue < periodStats.kpis.prevRevenue && "rotate-180")} />
                      vs periode sebelumnya
                    </p>
                  )}
                </div>
                <div className="rounded-xl p-2.5 bg-cyan-500 text-white shadow shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ── Target vs Aktual ── */}
      {(targetBookings || targetRevenue) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {targetBookings && periodBookings !== null && (
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Booking ({PERIODS.find(p => p.value === period)?.label})</span>
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Aktual</span>
                  <span className="font-bold">{periodBookings} <span className="text-muted-foreground font-normal">/ {targetBookings}</span></span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={cn("h-2 rounded-full transition-all", periodBookings >= targetBookings ? "bg-emerald-500" : "bg-primary")}
                    style={{ width: `${Math.min((periodBookings / targetBookings) * 100, 100)}%` }}
                  />
                </div>
                <p className={cn("text-xs font-medium mt-1.5", periodBookings >= targetBookings ? "text-emerald-600" : "text-muted-foreground")}>
                  {Math.round((periodBookings / targetBookings) * 100)}% tercapai
                </p>
              </CardContent>
            </Card>
          )}
          {targetRevenue && periodRevenue !== null && (
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Revenue ({PERIODS.find(p => p.value === period)?.label})</span>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Aktual</span>
                  <span className="font-bold">{formatRp(periodRevenue)} <span className="text-muted-foreground font-normal">/ {formatRp(targetRevenue)}</span></span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={cn("h-2 rounded-full transition-all", periodRevenue >= targetRevenue ? "bg-emerald-500" : "bg-emerald-500/60")}
                    style={{ width: `${Math.min((periodRevenue / targetRevenue) * 100, 100)}%` }}
                  />
                </div>
                <p className={cn("text-xs font-medium mt-1.5", periodRevenue >= targetRevenue ? "text-emerald-600" : "text-muted-foreground")}>
                  {Math.round((periodRevenue / targetRevenue) * 100)}% tercapai
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Tren Booking</CardTitle>
                <CardDescription>
                  {periodLoading ? "Memuat..." : `Periode: ${PERIODS.find(p => p.value === period)?.label}`}
                </CardDescription>
              </div>
              {periodStats?.kpis && (
                <div className="text-right">
                  <p className="text-xl font-bold">{periodStats.kpis.bookings}</p>
                  <p className="text-xs text-muted-foreground">booking</p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading || periodLoading ? (
              <div className="h-[240px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
              </div>
            ) : trendData.length === 0 || trendData.every((t: any) => t.count === 0) ? (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Belum ada data booking</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={trendData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                    cursor={{ fill: "hsl(var(--muted))", radius: 4 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="count" name="Booking" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  {targets.bookings && (
                    <ReferenceLine
                      y={Number(targets.bookings) / Math.max(trendData.length, 1)}
                      stroke="hsl(var(--destructive))"
                      strokeDasharray="4 4"
                      label={{ value: "Target/bln", fill: "hsl(var(--destructive))", fontSize: 10 }}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Booking Terbaru</CardTitle>
            <CardDescription>5 booking terakhir masuk</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-muted animate-pulse rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-muted animate-pulse rounded w-3/4" />
                      <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada booking</p>
            ) : (
              <div className="space-y-1">
                {recentBookings.map((b) => {
                  const s = STATUS_MAP[b.status] ?? { label: b.status, className: "bg-muted text-muted-foreground border-muted" };
                  return (
                    <Link key={b.id} href={`/admin/bookings`} className="block">
                      <div className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer">
                        <div className="bg-primary/10 p-1.5 rounded-full shrink-0">
                          <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-none truncate">{b.userName || "Tanpa Nama"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{b.packageTitle || "—"} · {b.bookingCode}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(b.createdAt), "d MMM yyyy, HH:mm", { locale: localeId })}
                          </p>
                        </div>
                        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0", s.className)}>
                          {s.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
                <div className="pt-2">
                  <Link href="/admin/bookings">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      Lihat Semua Booking <ExternalLink className="w-3 h-3 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Target Setting Dialog ── */}
      <Dialog open={targetDialog} onOpenChange={setTargetDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" /> Atur Target Periode
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Target Booking (per periode)</Label>
              <Input
                type="number" placeholder="cth. 100"
                value={targetForm.bookings}
                onChange={(e) => setTargetForm({ ...targetForm, bookings: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm">Target Revenue (Rp)</Label>
              <Input
                type="number" placeholder="cth. 500000000"
                value={targetForm.revenue}
                onChange={(e) => setTargetForm({ ...targetForm, revenue: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm">Target Jamaah</Label>
              <Input
                type="number" placeholder="cth. 200"
                value={targetForm.pilgrims}
                onChange={(e) => setTargetForm({ ...targetForm, pilgrims: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <p className="text-xs text-muted-foreground">Target disimpan di browser. Perbandingan dihitung berdasarkan periode yang dipilih.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTargetDialog(false)}>Batal</Button>
            <Button onClick={saveTargets}>Simpan Target</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
