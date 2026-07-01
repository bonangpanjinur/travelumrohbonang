import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  ShoppingBag, 
  CreditCard, 
  TrendingUp, 
  CalendarCheck,
  UserPlus,
  Building2,
  UserCheck
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface RecentBooking {
  id: string;
  booking_code: string;
  status: string;
  created_at: string;
  total_price: number;
  profile: { name: string; email: string } | null;
  package: { title: string } | null;
}

interface MonthlyTrend {
  month: string;
  count: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState({
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

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [
          bookingsRes, agentsRes, paymentsRes, packagesRes,
          pilgrimsRes, branchesRes, muthawifsRes,
          revenueRes, recentRes, trendRes
        ] = await Promise.all([
          supabase.from('bookings').select('*', { count: 'exact', head: true }),
          supabase.from('agents').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'waiting_payment'),
          supabase.from('packages').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('booking_pilgrims').select('*', { count: 'exact', head: true }),
          supabase.from('branches').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('muthawifs').select('*', { count: 'exact', head: true }),
          supabase.from('bookings').select('total_price').eq('status', 'paid'),
          supabase.from('bookings').select(`
            id, booking_code, status, created_at, total_price,
            profile:profiles!bookings_user_id_profiles_fkey(name, email),
            package:packages(title)
          `).order('created_at', { ascending: false }).limit(5),
          supabase.from('bookings').select('created_at'),
        ]);

        const totalRevenue = (revenueRes.data || []).reduce((sum, b) => sum + (b.total_price || 0), 0);

        // Calculate monthly trend (last 6 months)
        const now = new Date();
        const trends: MonthlyTrend[] = [];
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(now, i);
          const monthStart = startOfMonth(monthDate);
          const monthEnd = startOfMonth(subMonths(now, i - 1));
          const count = (trendRes.data || []).filter(b => {
            const d = new Date(b.created_at);
            return d >= monthStart && d < monthEnd;
          }).length;
          trends.push({
            month: format(monthDate, 'MMM yy', { locale: localeId }),
            count,
          });
        }

        setStats({
          totalBookings: bookingsRes.count || 0,
          totalAgents: agentsRes.count || 0,
          pendingPayments: paymentsRes.count || 0,
          activePackages: packagesRes.count || 0,
          totalPilgrims: pilgrimsRes.count || 0,
          totalBranches: branchesRes.count || 0,
          totalMuthawifs: muthawifsRes.count || 0,
          totalRevenue,
        });
        setRecentBookings((recentRes.data as unknown as RecentBooking[]) || []);
        setMonthlyTrend(trends);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Ringkasan aktivitas travel Umrah Anda hari ini.</p>
        </div>
        <div className="text-sm bg-card px-4 py-2 rounded-md border shadow-sm text-muted-foreground">
          Update Terakhir: <span className="font-semibold">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <Card className="col-span-1 lg:col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Tren Pendaftaran Jamaah</CardTitle>
            <CardDescription>Perbandingan 6 bulan terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : monthlyTrend.every(t => t.count === 0) ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Belum ada data booking</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" name="Booking" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
                      <p className="text-sm font-medium leading-none truncate">
                        {b.profile?.name || "Tanpa Nama"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {b.package?.title || "-"} • {b.booking_code}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {format(new Date(b.created_at), "d MMM yyyy, HH:mm", { locale: localeId })}
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
