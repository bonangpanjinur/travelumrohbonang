/**
 * K-05 FIX: Reports.tsx — replaced all direct supabase client calls with
 * apiFetch via /api/admin/analytics/summary and /api/admin/analytics/agent-stats.
 * Previously the page was broken in dev (no Supabase URL configured).
 */
import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { format, parseISO, isValid } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  TrendingUp, Users, Package, Calendar, DollarSign,
  BarChart3, PieChartIcon, Award, Building2
} from "lucide-react";
import CommissionReport from "@/features/admin/components/CommissionReport";
import { toast } from "sonner";

const COLORS = ["hsl(142, 76%, 36%)", "hsl(45, 93%, 47%)", "hsl(142, 50%, 50%)", "hsl(45, 70%, 60%)", "hsl(200, 70%, 50%)"];

interface BookingStats {
  date: string;
  count: number;
  revenue: number;
}

interface PackageStats {
  name: string;
  bookings: number;
  revenue: number;
}

interface DepartureStats {
  id: string;
  package_title: string;
  departure_date: string;
  quota: number;
  booked: number;
  remaining: number;
}

interface AgentStats {
  id: string;
  name: string;
  branch: string | null;
  bookings: number;
  revenue: number;
}

interface AnalyticsSummary {
  kpis: {
    bookings: number;
    revenue: number;
    pilgrims: number;
    avgValue: number;
  };
  trend: { key: string; bookings: number; revenue: number }[];
  packageRevenue: { name: string; bookings: number; revenue: number }[];
  departures: { id: string; package_title: string; departure_date: string; quota: number; booked: number }[];
}

const AdminReports = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30days");
  const [bookingStats, setBookingStats] = useState<BookingStats[]>([]);
  const [packageStats, setPackageStats] = useState<PackageStats[]>([]);
  const [departureStats, setDepartureStats] = useState<DepartureStats[]>([]);
  const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
  const [summary, setSummary] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    totalPilgrims: 0,
    avgBookingValue: 0,
  });

  const getDateRange = () => {
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    switch (period) {
      case "7days":   return { start: new Date(now.getTime() - 7  * msPerDay), end: now };
      case "30days":  return { start: new Date(now.getTime() - 30 * msPerDay), end: now };
      case "3months": { const s = new Date(now); s.setMonth(s.getMonth() - 3);  return { start: s, end: now }; }
      case "6months": { const s = new Date(now); s.setMonth(s.getMonth() - 6);  return { start: s, end: now }; }
      case "1year":   { const s = new Date(now); s.setFullYear(s.getFullYear() - 1); return { start: s, end: now }; }
      default:        return { start: new Date(now.getTime() - 30 * msPerDay), end: now };
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [summary, agents] = await Promise.all([
          apiFetch<AnalyticsSummary>(`/api/admin/analytics/summary?period=${period}`),
          apiFetch<AgentStats[]>(`/api/admin/analytics/agent-stats?period=${period}`).catch(() => []),
        ]);

        // KPI summary
        setSummary({
          totalBookings: summary.kpis.bookings,
          totalRevenue: summary.kpis.revenue,
          totalPilgrims: summary.kpis.pilgrims,
          avgBookingValue: summary.kpis.avgValue,
        });

        // Booking stats — format trend keys to "d MMM" labels
        const useMonthly = ["3months", "6months", "1year"].includes(period);
        setBookingStats(
          summary.trend.map((t) => {
            let label = t.key;
            try {
              const d = useMonthly ? new Date(`${t.key}-01`) : new Date(t.key);
              if (!isNaN(d.getTime())) {
                label = format(d, useMonthly ? "MMM yy" : "d MMM", { locale: localeId });
              }
            } catch { /* keep raw key */ }
            return { date: label, count: t.bookings, revenue: t.revenue };
          })
        );

        // Package stats
        setPackageStats(summary.packageRevenue);

        // Departure stats
        setDepartureStats(
          summary.departures.map((d) => ({
            id: d.id,
            package_title: d.package_title,
            departure_date: d.departure_date,
            quota: d.quota,
            booked: d.booked,
            remaining: d.quota - d.booked,
          }))
        );

        // Agent stats
        setAgentStats(agents);
      } catch (err: any) {
        toast.error(err?.message ?? "Gagal memuat laporan");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [period]);

  const formatCurrency = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-gold" />
          Laporan & Statistik
        </h1>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Pilih periode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">7 Hari Terakhir</SelectItem>
            <SelectItem value="30days">30 Hari Terakhir</SelectItem>
            <SelectItem value="3months">3 Bulan Terakhir</SelectItem>
            <SelectItem value="6months">6 Bulan Terakhir</SelectItem>
            <SelectItem value="1year">1 Tahun Terakhir</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Booking</p>
                <p className="text-2xl font-bold">{summary.totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gold/10">
                <TrendingUp className="w-6 h-6 text-gold" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pendapatan</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Jemaah</p>
                <p className="text-2xl font-bold">{summary.totalPilgrims}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <DollarSign className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rata-rata Booking</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.avgBookingValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Ikhtisar
          </TabsTrigger>
          <TabsTrigger value="packages" className="flex items-center gap-2">
            <PieChartIcon className="w-4 h-4" /> Paket & Keberangkatan
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Award className="w-4 h-4" /> Agen & Cabang
          </TabsTrigger>
          <TabsTrigger value="commissions" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Komisi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trend Pendapatan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={bookingStats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                        formatter={(value: number) => [formatCurrency(value), "Pendapatan"]}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(45, 93%, 47%)" strokeWidth={3} dot={{ r: 4, fill: "hsl(45, 93%, 47%)" }} activeDot={{ r: 6 }} name="Pendapatan" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trend Booking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bookingStats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                      />
                      <Bar dataKey="count" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} name="Jumlah Booking" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="packages" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribusi Paket</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={packageStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="bookings"
                      >
                        {packageStats.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Okupansi Keberangkatan</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paket</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead className="text-right">Terisi</TableHead>
                      <TableHead className="text-right">Sisa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departureStats.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Tidak ada keberangkatan mendatang</TableCell></TableRow>
                    ) : departureStats.map((dep) => (
                      <TableRow key={dep.id}>
                        <TableCell className="font-medium">{dep.package_title}</TableCell>
                        <TableCell>{format(new Date(dep.departure_date), "d MMM yyyy")}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={dep.booked / dep.quota > 0.8 ? "destructive" : "secondary"}>
                            {dep.booked} / {dep.quota}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{dep.remaining}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pendapatan per Agen</CardTitle>
            </CardHeader>
            <CardContent>
              {agentStats.length > 0 && (
                <div className="h-[300px] w-full mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agentStats} layout="vertical" margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} width={100} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                        formatter={(value: number) => [formatCurrency(value), "Pendapatan"]}
                      />
                      <Bar dataKey="revenue" fill="hsl(45, 93%, 47%)" name="Pendapatan" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Agen</TableHead>
                    <TableHead>Cabang</TableHead>
                    <TableHead className="text-right">Total Booking</TableHead>
                    <TableHead className="text-right">Total Pendapatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentStats.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Belum ada data agen</TableCell></TableRow>
                  ) : agentStats.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell>{agent.branch || "-"}</TableCell>
                      <TableCell className="text-right">{agent.bookings}</TableCell>
                      <TableCell className="text-right font-bold text-gold">{formatCurrency(agent.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions">
          <CommissionReport startDate={getDateRange().start} endDate={getDateRange().end} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminReports;
