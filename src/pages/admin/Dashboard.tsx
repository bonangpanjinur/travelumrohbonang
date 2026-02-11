import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Package, Calendar, Users, CreditCard, Building2, UserCheck, TrendingUp, Clock, Plane, MapPin, Wallet } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";

interface Stats {
  totalPackages: number;
  totalDepartures: number;
  totalBookings: number;
  totalPilgrims: number;
  totalBranches: number;
  totalAgents: number;
  totalMuthawifs: number;
  pendingPayments: number;
  revenue: number;
  potentialRevenue: number;
}

interface UpcomingDeparture {
  id: string;
  departure_date: string;
  remaining_quota: number;
  quota: number;
  package: { title: string } | null;
}

interface MonthlyData {
  month: string;
  bookings: number;
  revenue: number;
}

interface PackagePopularity {
  name: string;
  value: number;
}

const CHART_COLORS = ["hsl(38, 75%, 55%)", "hsl(160, 84%, 39%)", "hsl(217, 91%, 60%)", "hsl(263, 70%, 50%)", "hsl(38, 92%, 50%)", "hsl(330, 81%, 60%)"];

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalPackages: 0,
    totalDepartures: 0,
    totalBookings: 0,
    totalPilgrims: 0,
    totalBranches: 0,
    totalAgents: 0,
    totalMuthawifs: 0,
    pendingPayments: 0,
    revenue: 0,
    potentialRevenue: 0,
  });
  const [upcoming, setUpcoming] = useState<UpcomingDeparture[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [packagePopularity, setPackagePopularity] = useState<PackagePopularity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      // Basic stats
      const [
        { count: packages },
        { count: departures },
        { count: bookings },
        { count: pilgrims },
        { count: branches },
        { count: agents },
        { count: muthawifs },
        { count: pending },
        { data: verifiedPayments },
        { data: allBookings },
        { data: upcomingData },
      ] = await Promise.all([
        supabase.from("packages").select("*", { count: "exact", head: true }),
        supabase.from("package_departures").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }),
        supabase.from("booking_pilgrims").select("*", { count: "exact", head: true }),
        supabase.from("branches").select("*", { count: "exact", head: true }),
        supabase.from("agents").select("*", { count: "exact", head: true }),
        supabase.from("muthawifs").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "waiting_payment"),
        supabase.from("payments").select("amount").eq("status", "paid"),
        supabase
          .from("bookings")
          .select("created_at, total_price, status, package:packages(title), profile:profiles!bookings_user_id_profiles_fkey(name, email)")
          .gte("created_at", subMonths(new Date(), 6).toISOString()),
        supabase
          .from("package_departures")
          .select("id, departure_date, remaining_quota, quota, package:packages(title)")
          .gte("departure_date", new Date().toISOString().split("T")[0])
          .order("departure_date", { ascending: true })
          .limit(5),
      ]);

      // Calculate actual revenue from verified payments
      const revenue = (verifiedPayments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      
      // Calculate potential revenue: total_price of all non-cancelled bookings minus what's already paid
      const totalPotential = (allBookings || [])
        .filter(b => b.status !== "cancelled")
        .reduce((sum, b) => sum + (b.total_price || 0), 0);
      const potentialRevenue = Math.max(0, totalPotential - revenue);

      setStats({
        totalPackages: packages || 0,
        totalDepartures: departures || 0,
        totalBookings: bookings || 0,
        totalPilgrims: pilgrims || 0,
        totalBranches: branches || 0,
        totalAgents: agents || 0,
        totalMuthawifs: muthawifs || 0,
        pendingPayments: pending || 0,
        revenue,
        potentialRevenue,
      });

      setUpcoming((upcomingData as unknown as UpcomingDeparture[]) || []);

      // Process monthly data for last 6 months
      // For monthly revenue, we ideally need payments with their paid_at date
      const { data: monthlyPayments } = await supabase
        .from("payments")
        .select("amount, paid_at, created_at")
        .eq("status", "paid")
        .gte("created_at", subMonths(new Date(), 6).toISOString());

      const months: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        
        const monthBookings = (allBookings || []).filter((b: { created_at: string }) => {
          const bookingDate = new Date(b.created_at);
          return bookingDate >= monthStart && bookingDate <= monthEnd;
        });

        const monthRevenue = (monthlyPayments || [])
          .filter((p: { created_at: string, paid_at: string | null }) => {
            const paymentDate = new Date(p.paid_at || p.created_at);
            return paymentDate >= monthStart && paymentDate <= monthEnd;
          })
          .reduce((sum: number, p: { amount: number }) => sum + (p.amount || 0), 0);

        months.push({
          month: format(date, "MMM", { locale: localeId }),
          bookings: monthBookings.length,
          revenue: monthRevenue / 1000000, // In millions
        });
      }
      setMonthlyData(months);

      // Process package popularity
      const packageCounts: Record<string, number> = {};
      (allBookings || []).forEach((b: { package?: { title: string } | null }) => {
        const pkgName = b.package?.title || "Paket Lainnya";
        packageCounts[pkgName] = (packageCounts[pkgName] || 0) + 1;
      });

      const popularPackages = Object.entries(packageCounts)
        .map(([name, value]) => ({ name: name.length > 15 ? name.substring(0, 15) + "..." : name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      setPackagePopularity(popularPackages);
      setLoading(false);
    };

    fetchStats();

    // Real-time subscription
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        fetchStats();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const statCards = [
    { label: "Total Paket", value: stats.totalPackages, icon: Package, color: "bg-blue-500" },
    { label: "Keberangkatan", value: stats.totalDepartures, icon: Calendar, color: "bg-emerald-500" },
    { label: "Total Booking", value: stats.totalBookings, icon: CreditCard, color: "bg-gold" },
    { label: "Total Jemaah", value: stats.totalPilgrims, icon: Users, color: "bg-purple-500" },
    { label: "Cabang", value: stats.totalBranches, icon: Building2, color: "bg-orange-500" },
    { label: "Agen", value: stats.totalAgents, icon: UserCheck, color: "bg-pink-500" },
    { label: "Muthawif", value: stats.totalMuthawifs, icon: MapPin, color: "bg-teal-500" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-display font-bold mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Revenue & Pending */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Pendapatan</div>
              <div className="text-2xl font-display font-bold">Rp {stats.revenue.toLocaleString("id-ID")}</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
              <Clock className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Menunggu Pembayaran</div>
              <div className="text-2xl font-display font-bold">{stats.pendingPayments} Booking</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
              <Wallet className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Potensi Pendapatan</div>
              <div className="text-2xl font-display font-bold">Rp {stats.potentialRevenue.toLocaleString("id-ID")}</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h3 className="text-lg font-display font-bold mb-4">Trend Pendapatan (6 Bulan)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                  formatter={(value: number) => [`Rp ${(value * 1000000).toLocaleString("id-ID")}`, "Pendapatan"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(38, 92%, 50%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Package Popularity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h3 className="text-lg font-display font-bold mb-4">Paket Terpopuler</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={packagePopularity}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {packagePopularity.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming Departures */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-card border border-border rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-display font-bold">Keberangkatan Terdekat</h3>
            <button className="text-sm text-gold hover:underline">Lihat Semua</button>
          </div>
          <div className="space-y-4">
            {upcoming.map((dep) => (
              <div key={dep.id} className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center text-primary">
                    <span className="text-xs font-bold uppercase">{format(new Date(dep.departure_date), "MMM", { locale: localeId })}</span>
                    <span className="text-lg font-bold leading-none">{format(new Date(dep.departure_date), "dd")}</span>
                  </div>
                  <div>
                    <div className="font-bold">{dep.package?.title}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Plane className="w-3 h-3" /> {format(new Date(dep.departure_date), "EEEE, d MMMM yyyy", { locale: localeId })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{dep.quota - dep.remaining_quota} / {dep.quota}</div>
                  <div className="text-xs text-muted-foreground">Jamaah Terdaftar</div>
                </div>
              </div>
            ))}
            {upcoming.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">Tidak ada keberangkatan terdekat</div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions / Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h3 className="text-lg font-display font-bold mb-6">Aktivitas Terbaru</h3>
          <div className="space-y-6">
            {(allBookings || []).slice(0, 5).map((b: any, i: number) => (
              <div key={i} className="flex gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${b.status === "paid" ? "bg-emerald-500" : b.status === "waiting_payment" ? "bg-gold" : "bg-muted"}`} />
                <div>
                  <div className="text-sm font-medium">
                    <span className="font-bold">{b.profile?.name || "User"}</span> melakukan booking
                  </div>
                  <div className="text-xs text-muted-foreground">{b.package?.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{format(new Date(b.created_at), "d MMM, HH:mm")}</div>
                </div>
              </div>
            ))}
            {(allBookings || []).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">Belum ada aktivitas</div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
