import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from "recharts";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
  TrendingUp, Users, Package, Calendar, DollarSign, 
  BarChart3, PieChartIcon, Award, Building2 
} from "lucide-react";
import CommissionReport from "@/components/admin/CommissionReport";

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

  useEffect(() => {
    fetchAllData();
  }, [period]);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case "7days":
        return { start: subDays(now, 7), end: now };
      case "30days":
        return { start: subDays(now, 30), end: now };
      case "3months":
        return { start: subMonths(now, 3), end: now };
      case "6months":
        return { start: subMonths(now, 6), end: now };
      case "1year":
        return { start: subMonths(now, 12), end: now };
      default:
        return { start: subDays(now, 30), end: now };
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    const { start, end } = getDateRange();

    await Promise.all([
      fetchBookingStats(start, end),
      fetchPackageStats(start, end),
      fetchDepartureStats(),
      fetchAgentStats(start, end),
      fetchSummary(start, end),
    ]);

    setLoading(false);
  };

  const fetchBookingStats = async (start: Date, end: Date) => {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, created_at")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .neq("status", "cancelled");

    const { data: payments } = await supabase
      .from("payments")
      .select("amount, paid_at, created_at")
      .eq("status", "paid")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    if (!bookings) return;

    // Group bookings by date
    const grouped = bookings.reduce((acc: Record<string, { count: number; revenue: number }>, booking) => {
      const date = format(new Date(booking.created_at), "yyyy-MM-dd");
      if (!acc[date]) acc[date] = { count: 0, revenue: 0 };
      acc[date].count++;
      return acc;
    }, {});

    // Add revenue from payments to the correct dates
    (payments || []).forEach(payment => {
      const date = format(new Date(payment.paid_at || payment.created_at), "yyyy-MM-dd");
      if (!grouped[date]) grouped[date] = { count: 0, revenue: 0 };
      grouped[date].revenue += payment.amount || 0;
    });

    const stats = Object.entries(grouped)
      .map(([date, { count, revenue }]) => ({
        date: format(new Date(date), "d MMM", { locale: localeId }),
        count,
        revenue,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setBookingStats(stats);
  };

  const fetchPackageStats = async (start: Date, end: Date) => {
    const { data: bookings } = await supabase
      .from("bookings")
      .select(`
        id,
        package:packages(title)
      `)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .neq("status", "cancelled");

    if (!bookings) return;

    const bookingIds = bookings.map(b => b.id);
    const { data: payments } = await supabase
      .from("payments")
      .select("amount, booking_id")
      .eq("status", "paid")
      .in("booking_id", bookingIds);

    const grouped = bookings.reduce((acc: Record<string, { bookings: number; revenue: number }>, booking: any) => {
      const name = booking.package?.title || "Unknown";
      if (!acc[name]) acc[name] = { bookings: 0, revenue: 0 };
      acc[name].bookings++;
      
      // Find payments for this booking
      const bookingPayments = (payments || []).filter(p => p.booking_id === booking.id);
      const bookingRevenue = bookingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      acc[name].revenue += bookingRevenue;
      
      return acc;
    }, {});

    const stats = Object.entries(grouped)
      .map(([name, { bookings, revenue }]) => ({ name, bookings, revenue }))
      .sort((a, b) => b.bookings - a.bookings);

    setPackageStats(stats);
  };

  const fetchDepartureStats = async () => {
    const { data: departures } = await supabase
      .from("package_departures")
      .select(`
        id, departure_date, quota, remaining_quota,
        package:packages(title)
      `)
      .gte("departure_date", new Date().toISOString().split("T")[0])
      .order("departure_date", { ascending: true })
      .limit(10);

    if (!departures) return;

    const stats = departures.map((dep: any) => ({
      id: dep.id,
      package_title: dep.package?.title || "-",
      departure_date: dep.departure_date,
      quota: dep.quota,
      booked: dep.quota - dep.remaining_quota,
      remaining: dep.remaining_quota,
    }));

    setDepartureStats(stats);
  };

  const fetchAgentStats = async (start: Date, end: Date) => {
    const { data: bookings } = await supabase
      .from("bookings")
      .select(`
        id, pic_id, pic_type
      `)
      .eq("pic_type", "agent")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .neq("status", "cancelled");

    if (!bookings || bookings.length === 0) {
      setAgentStats([]);
      return;
    }

    const bookingIds = bookings.map(b => b.id);
    const { data: payments } = await supabase
      .from("payments")
      .select("amount, booking_id")
      .eq("status", "paid")
      .in("booking_id", bookingIds);

    // Get unique agent IDs
    const agentIds = [...new Set(bookings.map((b) => b.pic_id).filter(Boolean))];
    
    if (agentIds.length === 0) {
      setAgentStats([]);
      return;
    }

    const { data: agents } = await supabase
      .from("agents")
      .select("id, name, branch:branches(name)")
      .in("id", agentIds);

    if (!agents) return;

    const agentMap = agents.reduce((acc: Record<string, any>, agent: any) => {
      acc[agent.id] = { name: agent.name, branch: agent.branch?.name || null };
      return acc;
    }, {});

    const grouped = bookings.reduce((acc: Record<string, { bookings: number; revenue: number }>, booking) => {
      const agentId = booking.pic_id;
      if (!agentId || !agentMap[agentId]) return acc;
      if (!acc[agentId]) acc[agentId] = { bookings: 0, revenue: 0 };
      acc[agentId].bookings++;
      
      // Find payments for this booking
      const bookingPayments = (payments || []).filter(p => p.booking_id === booking.id);
      const bookingRevenue = bookingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      acc[agentId].revenue += bookingRevenue;
      
      return acc;
    }, {});

    const stats = Object.entries(grouped)
      .map(([id, { bookings, revenue }]) => ({
        id,
        name: agentMap[id]?.name || "-",
        branch: agentMap[id]?.branch,
        bookings,
        revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    setAgentStats(stats);
  };

  const fetchSummary = async (start: Date, end: Date) => {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .neq("status", "cancelled");

    const bookingIds = bookings?.map(b => b.id) || [];
    
    const { data: payments } = await supabase
      .from("payments")
      .select("amount")
      .eq("status", "paid")
      .in("booking_id", bookingIds);

    const { data: pilgrims } = await supabase
      .from("booking_pilgrims")
      .select("id, booking:bookings!inner(created_at, status)")
      .gte("booking.created_at", start.toISOString())
      .lte("booking.created_at", end.toISOString())
      .neq("booking.status", "cancelled");

    const totalBookings = bookings?.length || 0;
    const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const totalPilgrims = pilgrims?.length || 0;

    setSummary({
      totalBookings,
      totalRevenue,
      totalPilgrims,
      avgBookingValue: totalBookings > 0 ? totalRevenue / totalBookings : 0,
    });
  };

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
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <DollarSign className="w-6 h-6 text-emerald-500" />
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
                        {packageStats.map((entry, index) => (
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
                    {departureStats.map((dep) => (
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
                  {agentStats.map((agent) => (
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
