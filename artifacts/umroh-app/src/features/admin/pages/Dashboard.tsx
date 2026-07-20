import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Users, ShoppingBag, CreditCard, TrendingUp, CalendarCheck,
  UserPlus, Building2, UserCheck, Download, Target, Pencil,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  LineChart, Line, ReferenceLine,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { exportToCsv } from "@/shared/lib/exportCsv";

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
  monthlyTrend: MonthlyTrend[];
}

type Period = "7days" | "30days" | "3months" | "6months" | "1year";

interface Targets {
  bookings: string;
  revenue: string;
  pilgrims: string;
}

const DEFAULT_TARGETS: Targets = { bookings: "", revenue: "", pilgrims: "" };
const STORAGE_KEY = "dashboard_targets";

const PERIODS: { value: Period; label: string }[] = [
  { value: "7days", label: "7 Hari" },
  { value: "30days", label: "30 Hari" },
  { value: "3months", label: "3 Bulan" },
  { value: "6months", label: "6 Bulan" },
  { value: "1year", label: "1 Tahun" },
];

const AdminDashboard = () => {
  const [stats, setStats] = useState<Omit<DashboardStats, "monthlyTrend">>({
    totalBookings: 0,
    totalAgents: 0,
    pendingPayments: 0,
    activePackages: 0,
    totalPilgrims: 0,
    totalBranches: 0,
    totalMuthawifs: 0,
    totalRevenue: 0,
  });
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("6months");
  const [periodStats, setPeriodStats] = useState<any>(null);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [targets, setTargets] = useState<Targets>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || DEFAULT_TARGETS; }
    catch { return DEFAULT_TARGETS; }
  });
  const [targetDialog, setTargetDialog] = useState(false);
  const [targetForm, setTargetForm] = useState<Targets>(targets);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsResult, recentResult] = await Promise.all([
          apiFetch<DashboardStats>("/api/admin/analytics/dashboard-stats").catch(() => null),
          apiFetch<{ data: RecentBooking[] }>("/api/admin/bookings?limit=5").catch(() => ({ data: [] as RecentBooking[] })),
        ]);
        if (statsResult) {
          const { monthlyTrend: trend, ...counts } = statsResult;
          setStats(counts);
          setMonthlyTrend(trend ?? []);
        }
        setRecentBookings(recentResult.data || []);
      } catch (error) {
        console.error("Error fetching stats:", error);
        toast.error("Gagal memuat statistik dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const fetchPeriodStats = useCallback(async (p: Period) => {
    setPeriodLoading(true);
    try {
      const data = await apiFetch<any>(`/api/admin/analytics/summary?period=${p}`);
      setPeriodStats(data);
    } catch {
      // silently ignore — period stats are supplementary
    } finally {
      setPeriodLoading(false);
    }
  }, []);

  useEffect(() => { fetchPeriodStats(period); }, [period]);

  const saveTargets = () => {
    setTargets(targetForm);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(targetForm));
    setTargetDialog(false);
    toast.success("Target disimpan");
  };

  const handleExport = () => {
    const headers = ["Metrik", "Nilai"];
    const rows = [
      ["Total Booking", String(stats.totalBookings)],
      ["Menunggu Pembayaran", String(stats.pendingPayments)],
      ["Total Agen", String(stats.totalAgents)],
      ["Paket Aktif", String(stats.activePackages)],
      ["Total Jamaah", String(stats.totalPilgrims)],
      ["Total Cabang", String(stats.totalBranches)],
      ["Total Muthawif", String(stats.totalMuthawifs)],
      ["Total Pendapatan", String(stats.totalRevenue)],
    ];
    if (periodStats?.kpis) {
      const kpis = periodStats.kpis;
      rows.push(
        [`Booking (${period})`, String(kpis.bookings)],
        [`Revenue (${period})`, String(kpis.revenue)],
      );
    }
    exportToCsv(`dashboard_${period}_${new Date().toISOString().slice(0, 10)}`, headers, rows);
    toast.success("Data dashboard diekspor");
  };

  // Trend data: use periodStats if available, else fall back to monthlyTrend
  const trendData = periodStats?.trend?.map((t: any) => ({
    month: t.key,
    count: t.bookings,
    revenue: t.revenue,
    target: targets.bookings ? Number(targets.bookings) : undefined,
  })) || monthlyTrend.map(t => ({
    month: t.month,
    count: t.count,
    target: targets.bookings ? Number(targets.bookings) / 6 : undefined,
  }));

  const periodBookings = periodStats?.kpis?.bookings ?? null;
  const periodRevenue = periodStats?.kpis?.revenue ?? null;
  const targetBookings = targets.bookings ? Number(targets.bookings) : null;
  const targetRevenue = targets.revenue ? Number(targets.revenue) : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Ringkasan aktivitas travel Umrah Anda.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Period selector */}
          <div className="flex border rounded-md overflow-hidden">
            {PERIODS.map(p => (
              <Button
                key={p.value}
                variant={period === p.value ? "default" : "ghost"}
                size="sm"
                className="rounded-none border-0 text-xs px-2"
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => { setTargetForm(targets); setTargetDialog(true); }}>
            <Target className="w-4 h-4 mr-1" /> Target
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          <div className="text-sm bg-card px-3 py-1.5 rounded-md border text-muted-foreground">
            {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Target vs Aktual — only show if targets are set */}
      {(targetBookings || targetRevenue) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {targetBookings && periodBookings !== null && (
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Booking ({PERIODS.find(p => p.value === period)?.label})</span>
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Aktual</span><span className="font-bold">{periodBookings}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Target</span><span>{targetBookings}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${periodBookings >= targetBookings ? "bg-success" : "bg-primary"}`}
                      style={{ width: `${Math.min((periodBookings / targetBookings) * 100, 100)}%` }}
                    />
                  </div>
                  <p className={`text-xs font-medium ${periodBookings >= targetBookings ? "text-success" : "text-muted-foreground"}`}>
                    {Math.round((periodBookings / targetBookings) * 100)}% tercapai
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {targetRevenue && periodRevenue !== null && (
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Revenue ({PERIODS.find(p => p.value === period)?.label})</span>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Aktual</span><span className="font-bold">Rp {periodRevenue.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Target</span><span>Rp {targetRevenue.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${periodRevenue >= targetRevenue ? "bg-success" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min((periodRevenue / targetRevenue) * 100, 100)}%` }}
                    />
                  </div>
                  <p className={`text-xs font-medium ${periodRevenue >= targetRevenue ? "text-success" : "text-muted-foreground"}`}>
                    {Math.round((periodRevenue / targetRevenue) * 100)}% tercapai
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Booking" value={stats.totalBookings} icon={ShoppingBag} color="bg-blue-500" loading={loading} />
        <StatCard title="Menunggu Pembayaran" value={stats.pendingPayments} icon={CreditCard} color="bg-orange-500" alert={stats.pendingPayments > 0} loading={loading} />
        <StatCard title="Total Agen" value={stats.totalAgents} icon={Users} color="bg-purple-500" loading={loading} />
        <StatCard title="Paket Aktif" value={stats.activePackages} icon={CalendarCheck} color="bg-green-500" loading={loading} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Jamaah" value={stats.totalPilgrims} icon={UserCheck} color="bg-teal-500" loading={loading} />
        <StatCard title="Cabang" value={stats.totalBranches} icon={Building2} color="bg-indigo-500" loading={loading} />
        <StatCard title="Muthawif" value={stats.totalMuthawifs} icon={UserPlus} color="bg-pink-500" loading={loading} />
        <StatCard
          title="Total Pendapatan"
          value={loading ? 0 : stats.totalRevenue}
          icon={TrendingUp}
          color="bg-emerald-500"
          loading={loading}
          isCurrency
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <Card className="col-span-1 lg:col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Tren Booking</CardTitle>
            <CardDescription>
              {periodLoading ? "Memuat..." : `Periode: ${PERIODS.find(p => p.value === period)?.label}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading || periodLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : trendData.length === 0 || trendData.every((t: any) => t.count === 0) ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Belum ada data booking</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} className="text-xs" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Booking" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  {targets.bookings && (
                    <ReferenceLine y={Number(targets.bookings) / Math.max(trendData.length, 1)} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: "Target/bln", fill: "hsl(var(--destructive))", fontSize: 11 }} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>Booking Terbaru</CardTitle>
            <CardDescription>5 booking terakhir masuk</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="h-14 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : recentBookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Belum ada booking</p>
            ) : (
              <div className="space-y-4">
                {recentBookings.map((b) => (
                  <div key={b.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="bg-blue-100 p-2 rounded-full shrink-0">
                      <ShoppingBag className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="text-sm font-medium leading-none truncate">{b.userName || "Tanpa Nama"}</p>
                      <p className="text-xs text-muted-foreground truncate">{b.packageTitle || "-"} • {b.bookingCode}</p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {format(new Date(b.createdAt), "d MMM yyyy, HH:mm", { locale: localeId })}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                      b.status === 'paid' ? 'bg-green-100 text-green-700' :
                      b.status === 'waiting_payment' ? 'bg-orange-100 text-orange-700' :
                      b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {b.status === 'paid' ? 'Lunas' :
                       b.status === 'waiting_payment' ? 'Menunggu' :
                       b.status === 'cancelled' ? 'Batal' :
                       b.status === 'draft' ? 'Draft' : b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Target Setting Dialog */}
      <Dialog open={targetDialog} onOpenChange={setTargetDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" /> Atur Target
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Target Booking (per periode)</Label>
              <Input
                type="number"
                placeholder="cth. 100"
                value={targetForm.bookings}
                onChange={(e) => setTargetForm({ ...targetForm, bookings: e.target.value })}
              />
            </div>
            <div>
              <Label>Target Revenue (Rp)</Label>
              <Input
                type="number"
                placeholder="cth. 500000000"
                value={targetForm.revenue}
                onChange={(e) => setTargetForm({ ...targetForm, revenue: e.target.value })}
              />
            </div>
            <div>
              <Label>Target Jamaah</Label>
              <Input
                type="number"
                placeholder="cth. 200"
                value={targetForm.pilgrims}
                onChange={(e) => setTargetForm({ ...targetForm, pilgrims: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">Target disimpan di browser (lokal). Perbandingan dihitung berdasarkan periode yang dipilih.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTargetDialog(false)}>Batal</Button>
            <Button onClick={saveTargets}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, alert = false, loading = false, isCurrency = false }: any) => (
  <Card className={`border-l-4 ${alert ? 'border-l-red-500' : 'border-l-transparent'} shadow-sm hover:shadow-md transition-shadow`}>
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-x-4">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
          ) : (
            <h2 className="text-2xl font-bold truncate">
              {isCurrency ? `Rp ${value.toLocaleString('id-ID')}` : value}
            </h2>
          )}
        </div>
        <div className={`${color} p-3 rounded-xl text-white shadow-lg shrink-0`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default AdminDashboard;
