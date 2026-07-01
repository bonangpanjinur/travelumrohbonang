import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/shared/integrations/supabase/client";
import { useAuth } from "@/shared/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Building2, ShoppingBag, Users, DollarSign, CreditCard, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import SEO from "@/shared/components/seo/SEO";

const BranchDashboard = () => {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [branch, setBranch] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get user's branch
      const { data: profile } = await supabase
        .from("profiles")
        .select("branch_id, name")
        .eq("id", user!.id)
        .maybeSingle();

      if (!profile?.branch_id) {
        toast.error("Anda belum di-assign ke cabang manapun");
        setLoading(false);
        return;
      }

      const { data: branchData } = await supabase
        .from("branches")
        .select("*")
        .eq("id", profile.branch_id)
        .maybeSingle();
      setBranch(branchData);

      // Bookings of this branch
      const { data: bookingData } = await supabase
        .from("bookings")
        .select("id, booking_code, total_price, status, created_at, packages(title)")
        .eq("branch_id", profile.branch_id)
        .order("created_at", { ascending: false })
        .limit(100);
      setBookings(bookingData || []);

      // Agents of this branch
      const { data: agentData } = await supabase
        .from("agents")
        .select("id, name, phone, commission_percent")
        .eq("branch_id", profile.branch_id)
        .eq("is_active", true);
      setAgents(agentData || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal memuat data cabang");
    } finally {
      setLoading(false);
    }
  };

  const paidBookings = bookings.filter((b) => b.status === "paid");
  const totalRevenue = paidBookings.reduce((s, b) => s + (Number(b.total_price) || 0), 0);
  const pendingCount = bookings.filter((b) => b.status === "pending" || b.status === "waiting_payment").length;
  const thisMonthBookings = bookings.filter((b) => {
    const d = new Date(b.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="min-h-screen bg-muted/30 p-6">
        <div className="max-w-2xl mx-auto pt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-primary" />
                Dashboard Cabang
              </CardTitle>
              <CardDescription>
                Akun Anda belum di-assign ke cabang. Hubungi admin untuk konfigurasi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/dashboard")}>Kembali ke Dashboard</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO title={`Dashboard ${branch.name}`} description="Dashboard khusus cabang" />
      <div className="min-h-screen bg-muted/30 p-4 lg:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Building2 className="w-7 h-7 text-primary" />
                Dashboard {branch.name}
              </h1>
              {branch.address && (
                <p className="text-muted-foreground text-sm">{branch.address}</p>
              )}
            </div>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Dashboard Utama
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={ShoppingBag} label="Total Booking" value={bookings.length} />
            <StatCard icon={Calendar} label="Bulan Ini" value={thisMonthBookings.length} color="text-primary" />
            <StatCard icon={CreditCard} label="Pending" value={pendingCount} color="text-amber-600" />
            <StatCard
              icon={DollarSign}
              label="Revenue"
              value={`Rp ${totalRevenue.toLocaleString("id-ID")}`}
              color="text-success"
            />
          </div>

          {/* Agents */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" /> Agen di Cabang ({agents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada agen aktif di cabang ini</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {agents.map((a) => (
                    <div key={a.id} className="p-3 border rounded-lg">
                      <p className="font-medium text-sm">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.phone || "-"}</p>
                      <p className="text-xs text-primary mt-1">Komisi: {a.commission_percent}%</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Bookings */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Booking Terbaru</CardTitle>
              <CardDescription>100 booking terakhir di cabang ini</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead>Paket</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead className="text-right">Nilai</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Belum ada booking
                        </TableCell>
                      </TableRow>
                    ) : (
                      bookings.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono text-xs">{b.booking_code}</TableCell>
                          <TableCell className="text-sm">{b.packages?.title || "-"}</TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(b.created_at), "dd MMM yyyy", { locale: localeId })}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            Rp {Number(b.total_price).toLocaleString("id-ID")}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={b.status} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-muted">
        <Icon className={`w-5 h-5 ${color || "text-foreground"}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={`text-base font-bold truncate ${color || ""}`}>{value}</p>
      </div>
    </CardContent>
  </Card>
);

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; variant: any }> = {
    paid: { label: "Lunas", variant: "default" },
    pending: { label: "Pending", variant: "secondary" },
    waiting_payment: { label: "Menunggu Bayar", variant: "secondary" },
    cancelled: { label: "Batal", variant: "destructive" },
    draft: { label: "Draft", variant: "outline" },
    confirmed: { label: "Konfirmasi", variant: "default" },
  };
  const cfg = map[status] || { label: status, variant: "outline" };
  return <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>;
};

export default BranchDashboard;
