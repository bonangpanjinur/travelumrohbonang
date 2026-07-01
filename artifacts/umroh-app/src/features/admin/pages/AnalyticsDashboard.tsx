import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { format, subDays, subMonths, eachDayOfInterval, eachMonthOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  TrendingUp, TrendingDown, Users, Package, CreditCard,
  DollarSign, LayoutDashboard, RefreshCw, Calendar, ArrowRight, Minus
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import LoadingSpinner from "@/shared/components/ui/loading-spinner";

const PALETTE = {
  green:  "hsl(142, 76%, 36%)",
  gold:   "hsl(45, 93%, 47%)",
  blue:   "hsl(217, 91%, 60%)",
  red:    "hsl(0, 84%, 60%)",
  purple: "hsl(263, 70%, 50%)",
  teal:   "hsl(180, 70%, 40%)",
  orange: "hsl(25, 95%, 53%)",
};

const PIE_COLORS: Record<string, string> = {
  paid:     PALETTE.green,
  verified: PALETTE.green,
  pending:  PALETTE.gold,
  rejected: PALETTE.red,
  cancelled: PALETTE.red,
  refunded: PALETTE.purple,
};

const STATUS_LABEL: Record<string, string> = {
  paid:      "Terbayar",
  verified:  "Terverifikasi",
  pending:   "Menunggu",
  rejected:  "Ditolak",
  cancelled: "Dibatalkan",
  refunded:  "Direfund",
};

const BOOKING_STATUS_COLOR: Record<string, string> = {
  confirmed:  PALETTE.green,
  paid:       PALETTE.blue,
  processing: PALETTE.gold,
  draft:      "hsl(var(--muted-foreground))",
  cancelled:  PALETTE.red,
  completed:  PALETTE.teal,
};

const BOOKING_STATUS_LABEL: Record<string, string> = {
  confirmed:  "Dikonfirmasi",
  paid:       "Terbayar",
  processing: "Diproses",
  draft:      "Draft",
  cancelled:  "Dibatalkan",
  completed:  "Selesai",
};

interface KpiCard {
  label: string;
  value: string | number;
  prev: string | number;
  icon: React.ElementType;
  color: string;
  prefix?: string;
  suffix?: string;
}

interface TrendPoint {
  label: string;
  bookings: number;
  revenue: number;
}

interface PackageRevenue {
  name: string;
  bookings: number;
  revenue: number;
}

interface PaymentStatusSlice {
  name: string;
  value: number;
  label: string;
}

interface BookingStatusSlice {
  name: string;
  value: number;
  label: string;
  color: string;
}

interface DepartureOccupancy {
  id: string;
  package_title: string;
  departure_date: string;
  quota: number;
  booked: number;
}

const formatIDR = (v: number) =>
  v >= 1_000_000_000
    ? `Rp ${(v / 1_000_000_000).toFixed(1)}M`
    : v >= 1_000_000
    ? `Rp ${(v / 1_000_000).toFixed(1)} jt`
    : `Rp ${v.toLocaleString("id-ID")}`;

const formatIDRFull = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;

const TrendBadge = ({ current, prev }: { current: number; prev: number }) => {
  if (prev === 0 && current === 0) return <span className="text-xs text-muted-foreground flex items-center gap-1"><Minus className="w-3 h-3" /> –</span>;
  const pct = prev === 0 ? 100 : Math.round(((current - prev) / prev) * 100);
  const up = pct >= 0;
  return (
    <span className={`text-xs font-medium flex items-center gap-0.5 ${up ? "text-emerald-600" : "text-red-500"}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? "+" : ""}{pct}% vs periode lalu
    </span>
  );
};

const CustomTooltipRevenue = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-md px-3 py-2 text-xs space-y-1">
      <p className="font-semibold">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.dataKey === "revenue" ? formatIDRFull(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

const CustomTooltipPie = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-md px-3 py-2 text-xs">
      <p className="font-semibold">{item.name}</p>
      <p>{item.value} transaksi</p>
    </div>
  );
};

const AnalyticsDashboard = () => {
  const [period, setPeriod] = useState("30days");
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const [kpis, setKpis] = useState({ bookings: 0, prevBookings: 0, revenue: 0, prevRevenue: 0, pilgrims: 0, prevPilgrims: 0, avgValue: 0, prevAvgValue: 0 });
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [packageRevenue, setPackageRevenue] = useState<PackageRevenue[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusSlice[]>([]);
  const [bookingStatus, setBookingStatus] = useState<BookingStatusSlice[]>([]);
  const [departures, setDepartures] = useState<DepartureOccupancy[]>([]);

  const getRange = useCallback((p: string) => {
    const now = new Date();
    switch (p) {
      case "7days":   return { start: subDays(now, 7), end: now, prev_start: subDays(now, 14), prev_end: subDays(now, 7) };
      case "30days":  return { start: subDays(now, 30), end: now, prev_start: subDays(now, 60), prev_end: subDays(now, 30) };
      case "3months": return { start: subMonths(now, 3), end: now, prev_start: subMonths(now, 6), prev_end: subMonths(now, 3) };
      case "6months": return { start: subMonths(now, 6), end: now, prev_start: subMonths(now, 12), prev_end: subMonths(now, 6) };
      case "1year":   return { start: subMonths(now, 12), end: now, prev_start: subMonths(now, 24), prev_end: subMonths(now, 12) };
      default:        return { start: subDays(now, 30), end: now, prev_start: subDays(now, 60), prev_end: subDays(now, 30) };
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { start, end, prev_start, prev_end } = getRange(period);

    await Promise.all([
      loadKpis(start, end, prev_start, prev_end),
      loadTrend(start, end, period),
      loadPackageRevenue(start, end),
      loadPaymentStatus(start, end),
      loadBookingStatus(start, end),
      loadDepartures(),
    ]);

    setLastRefreshed(new Date());
    setLoading(false);
  }, [period, getRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadKpis = async (start: Date, end: Date, prevStart: Date, prevEnd: Date) => {
    const [{ data: bCurr }, { data: bPrev }] = await Promise.all([
      supabase.from("bookings").select("id").gte("created_at", start.toISOString()).lte("created_at", end.toISOString()).neq("status", "cancelled"),
      supabase.from("bookings").select("id").gte("created_at", prevStart.toISOString()).lte("created_at", prevEnd.toISOString()).neq("status", "cancelled"),
    ]);

    const currIds = bCurr?.map(b => b.id) ?? [];
    const prevIds = bPrev?.map(b => b.id) ?? [];

    const [{ data: pCurr }, { data: pPrev }, { data: pilgCurr }, { data: pilgPrev }] = await Promise.all([
      supabase.from("payments").select("amount").eq("status", "paid").in("booking_id", currIds.length ? currIds : [""]),
      supabase.from("payments").select("amount").eq("status", "paid").in("booking_id", prevIds.length ? prevIds : [""]),
      supabase.from("booking_pilgrims").select("id, booking:bookings!inner(status)").in("booking_id", currIds.length ? currIds : [""]),
      supabase.from("booking_pilgrims").select("id, booking:bookings!inner(status)").in("booking_id", prevIds.length ? prevIds : [""]),
    ]);

    const revCurr = (pCurr ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
    const revPrev = (pPrev ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
    const bkCurr = currIds.length;
    const bkPrev = prevIds.length;

    setKpis({
      bookings: bkCurr, prevBookings: bkPrev,
      revenue: revCurr, prevRevenue: revPrev,
      pilgrims: pilgCurr?.length ?? 0, prevPilgrims: pilgPrev?.length ?? 0,
      avgValue: bkCurr > 0 ? revCurr / bkCurr : 0,
      prevAvgValue: bkPrev > 0 ? revPrev / bkPrev : 0,
    });
  };

  const loadTrend = async (start: Date, end: Date, p: string) => {
    const useMonthly = ["3months","6months","1year"].includes(p);

    const [{ data: bookings }, { data: payments }] = await Promise.all([
      supabase.from("bookings").select("created_at").gte("created_at", start.toISOString()).lte("created_at", end.toISOString()).neq("status", "cancelled"),
      supabase.from("payments").select("amount, paid_at, created_at").eq("status", "paid").gte("created_at", start.toISOString()).lte("created_at", end.toISOString()),
    ]);

    if (useMonthly) {
      const months = eachMonthOfInterval({ start: startOfMonth(start), end: endOfMonth(end) });
      const map: Record<string, TrendPoint> = {};
      months.forEach(m => {
        const key = format(m, "yyyy-MM");
        map[key] = { label: format(m, "MMM yy", { locale: localeId }), bookings: 0, revenue: 0 };
      });
      (bookings ?? []).forEach(b => {
        const key = format(new Date(b.created_at ?? ""), "yyyy-MM");
        if (map[key]) map[key].bookings++;
      });
      (payments ?? []).forEach(pay => {
        const key = format(new Date(pay.paid_at ?? pay.created_at ?? ""), "yyyy-MM");
        if (map[key]) map[key].revenue += pay.amount ?? 0;
      });
      setTrendData(Object.values(map));
    } else {
      const days = eachDayOfInterval({ start, end });
      const map: Record<string, TrendPoint> = {};
      days.forEach(d => {
        const key = format(d, "yyyy-MM-dd");
        map[key] = { label: format(d, "d MMM", { locale: localeId }), bookings: 0, revenue: 0 };
      });
      (bookings ?? []).forEach(b => {
        const key = format(new Date(b.created_at ?? ""), "yyyy-MM-dd");
        if (map[key]) map[key].bookings++;
      });
      (payments ?? []).forEach(pay => {
        const key = format(new Date(pay.paid_at ?? pay.created_at ?? ""), "yyyy-MM-dd");
        if (map[key]) map[key].revenue += pay.amount ?? 0;
      });
      setTrendData(Object.values(map));
    }
  };

  const loadPackageRevenue = async (start: Date, end: Date) => {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, package:packages(title)")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .neq("status", "cancelled");

    if (!bookings?.length) { setPackageRevenue([]); return; }

    const ids = bookings.map(b => b.id);
    const { data: payments } = await supabase.from("payments").select("amount, booking_id").eq("status", "paid").in("booking_id", ids);

    const map: Record<string, { bookings: number; revenue: number }> = {};
    bookings.forEach((b: any) => {
      const name = b.package?.title ?? "Tanpa Paket";
      if (!map[name]) map[name] = { bookings: 0, revenue: 0 };
      map[name].bookings++;
      (payments ?? []).filter(p => p.booking_id === b.id).forEach(p => { map[name].revenue += p.amount ?? 0; });
    });

    setPackageRevenue(
      Object.entries(map)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8)
    );
  };

  const loadPaymentStatus = async (start: Date, end: Date) => {
    const { data } = await supabase
      .from("payments")
      .select("status")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    const map: Record<string, number> = {};
    (data ?? []).forEach(p => { map[p.status] = (map[p.status] ?? 0) + 1; });
    setPaymentStatus(
      Object.entries(map).map(([key, val]) => ({
        name: STATUS_LABEL[key] ?? key,
        label: key,
        value: val,
      }))
    );
  };

  const loadBookingStatus = async (start: Date, end: Date) => {
    const { data } = await supabase
      .from("bookings")
      .select("status")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    const map: Record<string, number> = {};
    (data ?? []).forEach(b => { map[b.status] = (map[b.status] ?? 0) + 1; });
    setBookingStatus(
      Object.entries(map).map(([key, val]) => ({
        name: BOOKING_STATUS_LABEL[key] ?? key,
        value: val,
        label: key,
        color: BOOKING_STATUS_COLOR[key] ?? PALETTE.blue,
      }))
    );
  };

  const loadDepartures = async () => {
    const { data } = await supabase
      .from("package_departures")
      .select("id, departure_date, quota, remaining_quota, package:packages(title)")
      .gte("departure_date", new Date().toISOString().split("T")[0])
      .order("departure_date", { ascending: true })
      .limit(8);

    setDepartures(
      (data ?? []).map((d: any) => ({
        id: d.id,
        package_title: d.package?.title ?? "–",
        departure_date: d.departure_date,
        quota: d.quota,
        booked: d.quota - d.remaining_quota,
      }))
    );
  };

  const kpiCards: KpiCard[] = [
    { label: "Total Booking", value: kpis.bookings, prev: kpis.prevBookings, icon: Package, color: "text-primary", prefix: "" },
    { label: "Total Pendapatan", value: formatIDR(kpis.revenue), prev: kpis.prevRevenue, icon: DollarSign, color: "text-amber-500" },
    { label: "Total Jemaah", value: kpis.pilgrims, prev: kpis.prevPilgrims, icon: Users, color: "text-blue-500" },
    { label: "Rata-rata Booking", value: formatIDR(kpis.avgValue), prev: kpis.prevAvgValue, icon: TrendingUp, color: "text-emerald-500" },
  ];

  const totalPayments = paymentStatus.reduce((s, p) => s + p.value, 0);
  const totalBookingStatuses = bookingStatus.reduce((s, b) => s + b.value, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            Dashboard Analitik
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Diperbarui: {format(lastRefreshed, "d MMM yyyy, HH:mm", { locale: localeId })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">7 Hari Terakhir</SelectItem>
              <SelectItem value="30days">30 Hari Terakhir</SelectItem>
              <SelectItem value="3months">3 Bulan Terakhir</SelectItem>
              <SelectItem value="6months">6 Bulan Terakhir</SelectItem>
              <SelectItem value="1year">1 Tahun Terakhir</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner className="py-24" />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((kpi) => (
              <Card key={kpi.label} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{kpi.label}</p>
                      <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                      <TrendBadge
                        current={typeof kpi.value === "number" ? kpi.value : kpis[kpi.label === "Total Booking" ? "bookings" : kpi.label === "Total Jemaah" ? "pilgrims" : "revenue"] ?? 0}
                        prev={typeof kpi.prev === "number" ? kpi.prev : 0}
                      />
                    </div>
                    <div className={`p-3 rounded-xl bg-muted`}>
                      <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Trend Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Trend Pendapatan</CardTitle>
                <CardDescription>Pendapatan dari pembayaran terverifikasi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ left: -20, right: 8 }}>
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={PALETTE.gold} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={PALETTE.gold} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={v => formatIDR(v)} />
                      <Tooltip content={<CustomTooltipRevenue />} />
                      <Area
                        type="monotone" dataKey="revenue" name="Pendapatan"
                        stroke={PALETTE.gold} strokeWidth={2.5}
                        fill="url(#revenueGrad)" dot={false} activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Booking Trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Trend Booking</CardTitle>
                <CardDescription>Jumlah booking baru per hari / bulan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ left: -25, right: 8 }}>
                      <defs>
                        <linearGradient id="bookingGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={PALETTE.green} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={PALETTE.green} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltipRevenue />} />
                      <Area
                        type="monotone" dataKey="bookings" name="Booking"
                        stroke={PALETTE.green} strokeWidth={2.5}
                        fill="url(#bookingGrad)" dot={false} activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue per Package + Payment Status */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Revenue per Package */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pendapatan per Paket</CardTitle>
                <CardDescription>Top 8 paket berdasarkan total pendapatan</CardDescription>
              </CardHeader>
              <CardContent>
                {packageRevenue.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Belum ada data</div>
                ) : (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={packageRevenue} layout="vertical" margin={{ left: 0, right: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={v => formatIDR(v)} />
                        <YAxis
                          dataKey="name" type="category" axisLine={false} tickLine={false}
                          tick={{ fontSize: 11 }} width={130}
                          tickFormatter={v => v.length > 18 ? v.slice(0, 18) + "…" : v}
                        />
                        <Tooltip content={<CustomTooltipRevenue />} />
                        <Bar dataKey="revenue" name="Pendapatan" fill={PALETTE.gold} radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Status Breakdown */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Status Pembayaran</CardTitle>
                <CardDescription>Distribusi status pembayaran</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentStatus.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Belum ada data</div>
                ) : (
                  <>
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={paymentStatus} cx="50%" cy="50%"
                            innerRadius={55} outerRadius={80}
                            paddingAngle={3} dataKey="value"
                          >
                            {paymentStatus.map((entry, i) => (
                              <Cell
                                key={i}
                                fill={PIE_COLORS[entry.label] ?? Object.values(PALETTE)[i % Object.values(PALETTE).length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltipPie />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-2">
                      {paymentStatus.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: PIE_COLORS[item.label] ?? Object.values(PALETTE)[i % Object.values(PALETTE).length] }}
                            />
                            <span className="text-muted-foreground">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{item.value}</span>
                            <span className="text-muted-foreground text-xs">
                              ({totalPayments > 0 ? Math.round((item.value / totalPayments) * 100) : 0}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Booking Status + Departure Occupancy */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Booking Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Status Booking</CardTitle>
                <CardDescription>Distribusi status semua booking pada periode ini</CardDescription>
              </CardHeader>
              <CardContent>
                {bookingStatus.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">Belum ada data</div>
                ) : (
                  <div className="space-y-3">
                    {bookingStatus.sort((a, b) => b.value - a.value).map((item) => {
                      const pct = totalBookingStatuses > 0 ? Math.round((item.value / totalBookingStatuses) * 100) : 0;
                      return (
                        <div key={item.label} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                              <span>{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{item.value}</span>
                              <Badge variant="secondary" className="text-xs px-1.5 py-0">{pct}%</Badge>
                            </div>
                          </div>
                          <Progress value={pct} className="h-1.5" style={{ "--progress-color": item.color } as React.CSSProperties} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Departure Occupancy */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Keberangkatan Mendatang
                </CardTitle>
                <CardDescription>Tingkat hunian keberangkatan berikutnya</CardDescription>
              </CardHeader>
              <CardContent>
                {departures.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">Tidak ada keberangkatan mendatang</div>
                ) : (
                  <div className="space-y-4">
                    {departures.map((dep) => {
                      const pct = dep.quota > 0 ? Math.round((dep.booked / dep.quota) * 100) : 0;
                      const isFull = pct >= 100;
                      const isAlmostFull = pct >= 80 && !isFull;
                      return (
                        <div key={dep.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium truncate max-w-[60%]">{dep.package_title}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(dep.departure_date), "d MMM yyyy")}
                              </span>
                              <Badge
                                variant={isFull ? "destructive" : isAlmostFull ? "outline" : "secondary"}
                                className="text-xs px-1.5 py-0"
                              >
                                {dep.booked}/{dep.quota}
                              </Badge>
                            </div>
                          </div>
                          <div className="relative">
                            <Progress
                              value={pct}
                              className="h-2"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">{pct}% terisi · {dep.quota - dep.booked} kursi tersisa</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Package Performance Table */}
          {packageRevenue.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Performa Paket</CardTitle>
                    <CardDescription>Rincian booking dan pendapatan per paket</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-3 font-medium">Nama Paket</th>
                        <th className="pb-3 font-medium text-right">Booking</th>
                        <th className="pb-3 font-medium text-right">Pendapatan</th>
                        <th className="pb-3 font-medium text-right">Rata-rata</th>
                        <th className="pb-3 font-medium text-right">Kontribusi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {packageRevenue.map((pkg, i) => {
                        const totalRev = packageRevenue.reduce((s, p) => s + p.revenue, 0);
                        const contrib = totalRev > 0 ? Math.round((pkg.revenue / totalRev) * 100) : 0;
                        const avg = pkg.bookings > 0 ? pkg.revenue / pkg.bookings : 0;
                        return (
                          <tr key={i} className="hover:bg-muted/40 transition-colors">
                            <td className="py-3 font-medium max-w-xs">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: Object.values(PALETTE)[i % Object.values(PALETTE).length] }}
                                />
                                {pkg.name}
                              </div>
                            </td>
                            <td className="py-3 text-right">{pkg.bookings}</td>
                            <td className="py-3 text-right font-semibold text-amber-600">{formatIDR(pkg.revenue)}</td>
                            <td className="py-3 text-right text-muted-foreground">{formatIDR(avg)}</td>
                            <td className="py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 bg-muted rounded-full h-1.5 hidden sm:block">
                                  <div
                                    className="h-1.5 rounded-full bg-amber-400"
                                    style={{ width: `${contrib}%` }}
                                  />
                                </div>
                                <Badge variant="secondary" className="text-xs">{contrib}%</Badge>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t font-semibold bg-muted/30">
                        <td className="pt-3 pb-1">Total</td>
                        <td className="pt-3 pb-1 text-right">{packageRevenue.reduce((s, p) => s + p.bookings, 0)}</td>
                        <td className="pt-3 pb-1 text-right text-amber-600">{formatIDR(packageRevenue.reduce((s, p) => s + p.revenue, 0))}</td>
                        <td className="pt-3 pb-1 text-right text-muted-foreground">–</td>
                        <td className="pt-3 pb-1 text-right">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
