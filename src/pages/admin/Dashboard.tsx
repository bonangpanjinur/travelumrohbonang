import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Package, Calendar, Users, CreditCard, Building2, UserCheck, TrendingUp, Clock } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Stats {
  totalPackages: number;
  totalDepartures: number;
  totalBookings: number;
  totalPilgrims: number;
  totalBranches: number;
  totalAgents: number;
  pendingPayments: number;
  revenue: number;
}

interface UpcomingDeparture {
  id: string;
  departure_date: string;
  remaining_quota: number;
  package: { title: string } | null;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalPackages: 0,
    totalDepartures: 0,
    totalBookings: 0,
    totalPilgrims: 0,
    totalBranches: 0,
    totalAgents: 0,
    pendingPayments: 0,
    revenue: 0,
  });
  const [upcoming, setUpcoming] = useState<UpcomingDeparture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [
        { count: packages },
        { count: departures },
        { count: bookings },
        { count: pilgrims },
        { count: branches },
        { count: agents },
        { count: pending },
        { data: paidBookings },
        { data: upcomingData },
      ] = await Promise.all([
        supabase.from("packages").select("*", { count: "exact", head: true }),
        supabase.from("package_departures").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }),
        supabase.from("booking_pilgrims").select("*", { count: "exact", head: true }),
        supabase.from("branches").select("*", { count: "exact", head: true }),
        supabase.from("agents").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "waiting_payment"),
        supabase.from("bookings").select("total_price").eq("status", "paid"),
        supabase
          .from("package_departures")
          .select("id, departure_date, remaining_quota, package:packages(title)")
          .gte("departure_date", new Date().toISOString().split("T")[0])
          .order("departure_date", { ascending: true })
          .limit(5),
      ]);

      const revenue = (paidBookings || []).reduce((sum, b) => sum + (b.total_price || 0), 0);

      setStats({
        totalPackages: packages || 0,
        totalDepartures: departures || 0,
        totalBookings: bookings || 0,
        totalPilgrims: pilgrims || 0,
        totalBranches: branches || 0,
        totalAgents: agents || 0,
        pendingPayments: pending || 0,
        revenue,
      });

      setUpcoming((upcomingData as unknown as UpcomingDeparture[]) || []);
      setLoading(false);
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: "Total Paket", value: stats.totalPackages, icon: Package, color: "bg-blue-500" },
    { label: "Keberangkatan", value: stats.totalDepartures, icon: Calendar, color: "bg-emerald-500" },
    { label: "Total Booking", value: stats.totalBookings, icon: CreditCard, color: "bg-gold" },
    { label: "Total Jemaah", value: stats.totalPilgrims, icon: Users, color: "bg-purple-500" },
    { label: "Cabang", value: stats.totalBranches, icon: Building2, color: "bg-orange-500" },
    { label: "Agen", value: stats.totalAgents, icon: UserCheck, color: "bg-pink-500" },
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
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Revenue & Pending */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
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
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500 flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Menunggu Pembayaran</div>
              <div className="text-2xl font-display font-bold">{stats.pendingPayments} Booking</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Upcoming Departures */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-xl p-6"
      >
        <h2 className="text-lg font-display font-bold mb-4">Keberangkatan Terdekat</h2>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground text-sm">Belum ada jadwal keberangkatan</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((dep) => (
              <div key={dep.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <div className="font-semibold">{dep.package?.title || "Paket Umroh"}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(dep.departure_date), "d MMMM yyyy", { locale: localeId })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gold">{dep.remaining_quota} kursi</div>
                  <div className="text-xs text-muted-foreground">tersedia</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
