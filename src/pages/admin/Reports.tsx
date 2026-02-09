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
    const { data } = await supabase
      .from("bookings")
      .select("created_at, total_price, status")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .neq("status", "cancelled");

    if (!data) return;

    // Group by date
    const grouped = data.reduce((acc: Record<string, { count: number; revenue: number }>, booking) => {
      const date = format(new Date(booking.created_at), "yyyy-MM-dd");
      if (!acc[date]) acc[date] = { count: 0, revenue: 0 };
      acc[date].count++;
      acc[date].revenue += booking.total_price || 0;
      return acc;
    }, {});

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
    const { data } = await supabase
      .from("bookings")
      .select(`
        total_price,
        package:packages(title)
      `)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .neq("status", "cancelled");

    if (!data) return;

    const grouped = data.reduce((acc: Record<string, { bookings: number; revenue: number }>, booking: any) => {
      const name = booking.package?.title || "Unknown";
      if (!acc[name]) acc[name] = { bookings: 0, revenue: 0 };
      acc[name].bookings++;
      acc[name].revenue += booking.total_price || 0;
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
        total_price, pic_id, pic_type
      `)
      .eq("pic_type", "agent")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .neq("status", "cancelled");

    if (!bookings || bookings.length === 0) {
      setAgentStats([]);
      return;
    }

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
      acc[agentId].revenue += booking.total_price || 0;
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
      .select("id, total_price")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .neq("status", "cancelled");

    const { data: pilgrims } = await supabase
      .from("booking_pilgrims")
      .select("id, booking:bookings!inner(created_at, status)")
      .gte("booking.created_at", start.toISOString())
      .lte("booking.created_at", end.toISOString())
      .neq("booking.status", "cancelled");

    const totalBookings = bookings?.length || 0;
    const totalRevenue = bookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
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
                <DollarSign className="w-6 h-6 text-gold" />
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
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <Users className="w-6 h-6 text-emerald-600" />
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
              <div className="p-3 rounded-xl bg-blue-500/10">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rata-rata Booking</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.avgBookingValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="bookings">Booking</TabsTrigger>
          <TabsTrigger value="packages">Paket</TabsTrigger>
          <TabsTrigger value="departures">Keberangkatan</TabsTrigger>
          <TabsTrigger value="agents">Agen</TabsTrigger>
          <TabsTrigger value="commissions">Komisi</TabsTrigger>
        </TabsList>

        {/* Booking Stats Tab */}
        <TabsContent value="bookings" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-gold" />
                  Booking per Hari
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bookingStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={bookingStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(142, 76%, 36%)" name="Jumlah Booking" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Belum ada data booking
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-gold" />
                  Pendapatan per Hari
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bookingStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={bookingStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(45, 93%, 47%)" 
                        strokeWidth={2}
                        name="Pendapatan"
                        dot={{ fill: "hsl(45, 93%, 47%)" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Belum ada data pendapatan
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Package Stats Tab */}
        <TabsContent value="packages" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-gold" />
                  Paket Terlaris
                </CardTitle>
              </CardHeader>
              <CardContent>
                {packageStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={packageStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="bookings"
                        nameKey="name"
                        label={({ name, percent }) => `${name.slice(0, 15)}... (${(percent * 100).toFixed(0)}%)`}
                      >
                        {packageStats.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string) => [value, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Belum ada data paket
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="w-5 h-5 text-gold" />
                  Ranking Paket
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {packageStats.length > 0 ? (
                    packageStats.map((pkg, index) => (
                      <div key={pkg.name} className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? "bg-gold text-primary" : 
                          index === 1 ? "bg-gray-300 text-gray-700" : 
                          index === 2 ? "bg-amber-600 text-white" : 
                          "bg-muted text-muted-foreground"
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">{pkg.name}</div>
                          <div className="text-sm text-muted-foreground">{pkg.bookings} booking</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gold">{formatCurrency(pkg.revenue)}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">Belum ada data</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Departure Stats Tab */}
        <TabsContent value="departures" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gold" />
                Jemaah per Keberangkatan (Upcoming)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {departureStats.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Paket</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead className="text-center">Kuota</TableHead>
                        <TableHead className="text-center">Terisi</TableHead>
                        <TableHead className="text-center">Sisa</TableHead>
                        <TableHead className="text-center">Persentase</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departureStats.map((dep) => {
                        const percentage = Math.round((dep.booked / dep.quota) * 100);
                        return (
                          <TableRow key={dep.id}>
                            <TableCell className="font-semibold">{dep.package_title}</TableCell>
                            <TableCell>
                              {format(new Date(dep.departure_date), "d MMMM yyyy", { locale: localeId })}
                            </TableCell>
                            <TableCell className="text-center">{dep.quota}</TableCell>
                            <TableCell className="text-center font-semibold text-primary">{dep.booked}</TableCell>
                            <TableCell className="text-center">{dep.remaining}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={`
                                ${percentage >= 80 ? "bg-green-50 text-green-700 border-green-200" :
                                  percentage >= 50 ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                  "bg-red-50 text-red-700 border-red-200"}
                              `}>
                                {percentage}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Belum ada keberangkatan mendatang
                </div>
              )}
            </CardContent>
          </Card>

          {/* Departure Chart */}
          {departureStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Visualisasi Pengisian Kuota</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departureStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="package_title" 
                      type="category" 
                      width={150} 
                      fontSize={12}
                      tickFormatter={(v) => v.length > 20 ? v.slice(0, 20) + "..." : v}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="booked" stackId="a" fill="hsl(142, 76%, 36%)" name="Terisi" />
                    <Bar dataKey="remaining" stackId="a" fill="hsl(var(--muted))" name="Sisa" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Agent Stats Tab */}
        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gold" />
                Performa Agen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agentStats.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Nama Agen</TableHead>
                        <TableHead>Cabang</TableHead>
                        <TableHead className="text-center">Total Booking</TableHead>
                        <TableHead className="text-right">Total Pendapatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agentStats.map((agent, index) => (
                        <TableRow key={agent.id}>
                          <TableCell>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0 ? "bg-gold text-primary" : 
                              index === 1 ? "bg-gray-300 text-gray-700" : 
                              index === 2 ? "bg-amber-600 text-white" : 
                              "bg-muted text-muted-foreground"
                            }`}>
                              {index + 1}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">{agent.name}</TableCell>
                          <TableCell>{agent.branch || "-"}</TableCell>
                          <TableCell className="text-center">{agent.bookings}</TableCell>
                          <TableCell className="text-right font-bold text-gold">
                            {formatCurrency(agent.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Belum ada data performa agen
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agent Chart */}
          {agentStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pendapatan per Agen</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={agentStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="revenue" fill="hsl(45, 93%, 47%)" name="Pendapatan" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Commission Stats Tab */}
        <TabsContent value="commissions" className="space-y-4">
          <CommissionReport startDate={getDateRange().start} endDate={getDateRange().end} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminReports;
