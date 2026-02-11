import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  ShoppingBag, 
  CreditCard, 
  TrendingUp, 
  CalendarCheck,
  UserPlus
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalAgents: 0,
    pendingPayments: 0,
    activePackages: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch real counts from Supabase
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Parallel fetching for performance
        const [bookingsRes, agentsRes, paymentsRes, packagesRes] = await Promise.all([
          supabase.from('bookings').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'agent'),
          supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('payment_status', 'pending'),
          supabase.from('packages').select('*', { count: 'exact', head: true }).eq('is_active', true)
        ]);

        setStats({
          totalBookings: bookingsRes.count || 0,
          totalAgents: agentsRes.count || 0,
          pendingPayments: paymentsRes.count || 0,
          activePackages: packagesRes.count || 0
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard Overview</h1>
            <p className="text-gray-500 mt-1">Ringkasan aktivitas travel Umrah Anda hari ini.</p>
          </div>
          <div className="text-sm bg-white px-4 py-2 rounded-md border shadow-sm text-gray-600">
            Update Terakhir: <span className="font-semibold">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total Booking" 
            value={stats.totalBookings} 
            icon={ShoppingBag} 
            trend="+12% bulan ini"
            color="bg-blue-500"
            loading={loading}
          />
          <StatCard 
            title="Menunggu Pembayaran" 
            value={stats.pendingPayments} 
            icon={CreditCard} 
            trend="Action needed"
            color="bg-orange-500"
            alert={stats.pendingPayments > 0}
            loading={loading}
          />
          <StatCard 
            title="Total Agen" 
            value={stats.totalAgents} 
            icon={Users} 
            trend="+3 agen baru"
            color="bg-purple-500"
            loading={loading}
          />
          <StatCard 
            title="Paket Aktif" 
            value={stats.activePackages} 
            icon={CalendarCheck} 
            trend="Siap dipesan"
            color="bg-green-500"
            loading={loading}
          />
        </div>

        {/* Second Row: Charts & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
          
          {/* Main Chart Area (Placeholder for now) */}
          <Card className="col-span-1 lg:col-span-4 shadow-sm">
            <CardHeader>
              <CardTitle>Tren Pendaftaran Jamaah</CardTitle>
              <CardDescription>Perbandingan 6 bulan terakhir</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full bg-gray-50 rounded-lg flex items-center justify-center border border-dashed border-gray-300">
                <div className="text-center text-gray-400">
                  <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Grafik Penjualan akan muncul disini</p>
                  <p className="text-xs">(Memerlukan library Recharts/Chart.js)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity / Quick Tasks */}
          <Card className="col-span-1 lg:col-span-3 shadow-sm">
            <CardHeader>
              <CardTitle>Aktivitas Terbaru</CardTitle>
              <CardDescription>Log sistem terkini</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Mock Activities */}
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start space-x-4">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <UserPlus className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-900 leading-none">
                        Jamaah Baru Mendaftar
                      </p>
                      <p className="text-xs text-gray-500">
                        Ahmad Fulan mendaftar Paket Umrah Ramadhan
                      </p>
                      <p className="text-[10px] text-gray-400">2 jam yang lalu</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

// Reusable Component untuk Kartu Statistik
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color, 
  alert = false,
  loading = false
}: any) => (
  <Card className={`border-l-4 ${alert ? 'border-l-red-500' : 'border-l-transparent'} shadow-sm hover:shadow-md transition-shadow`}>
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-x-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {loading ? (
             <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
          ) : (
             <h2 className="text-3xl font-bold text-gray-900">{value}</h2>
          )}
        </div>
        <div className={`${color} p-3 rounded-xl text-white shadow-lg shadow-gray-200`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="mt-4 flex items-center text-xs text-gray-500">
        <span className={`${alert ? 'text-red-600 font-bold' : 'text-green-600'} flex items-center`}>
          {trend}
        </span>
      </div>
    </CardContent>
  </Card>
);

export default AdminDashboard;
