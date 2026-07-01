import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  GitBranch, Building2, TrendingUp, Users, ShoppingBag,
  CreditCard, DollarSign, BarChart3, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";

const AdminMultiBranch = () => {
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ["multi-branch-branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all bookings with branch info
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["multi-branch-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, booking_code, total_price, status, created_at, branch_id, packages(title)")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch agents per branch
  const { data: agents = [] } = useQuery({
    queryKey: ["multi-branch-agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("id, name, branch_id, is_active")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch pilgrims count per booking
  const { data: pilgrimCounts = [] } = useQuery({
    queryKey: ["multi-branch-pilgrims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_pilgrims")
        .select("booking_id");
      if (error) throw error;
      return data || [];
    },
  });

  // Compute per-branch stats
  const branchStats = useMemo(() => {
    const stats: Record<string, {
      name: string;
      totalBookings: number;
      paidBookings: number;
      revenue: number;
      pendingPayments: number;
      pilgrims: number;
      agents: number;
      monthlyData: Record<string, number>;
    }> = {};

    // Initialize "Pusat" for bookings without branch
    const initBranch = (id: string, name: string) => {
      if (!stats[id]) {
        stats[id] = {
          name,
          totalBookings: 0,
          paidBookings: 0,
          revenue: 0,
          pendingPayments: 0,
          pilgrims: 0,
          agents: 0,
          monthlyData: {},
        };
      }
    };

    branches.forEach((b: any) => initBranch(b.id, b.name));
    initBranch("pusat", "Pusat (Tanpa Cabang)");

    // Pilgrim lookup
    const pilgrimsByBooking: Record<string, number> = {};
    pilgrimCounts.forEach((p: any) => {
      pilgrimsByBooking[p.booking_id] = (pilgrimsByBooking[p.booking_id] || 0) + 1;
    });

    // Process bookings
    bookings.forEach((b: any) => {
      const branchId = b.branch_id || "pusat";
      if (!stats[branchId]) initBranch(branchId, "Cabang Lainnya");

      stats[branchId].totalBookings++;
      if (b.status === "paid") {
        stats[branchId].paidBookings++;
        stats[branchId].revenue += Number(b.total_price) || 0;
      }
      if (b.status === "pending" || b.status === "waiting_payment") {
        stats[branchId].pendingPayments++;
      }
      stats[branchId].pilgrims += pilgrimsByBooking[b.id] || 0;

      // Monthly data
      const month = b.created_at?.slice(0, 7);
      if (month) {
        stats[branchId].monthlyData[month] = (stats[branchId].monthlyData[month] || 0) + 1;
      }
    });

    // Count agents per branch
    agents.forEach((a: any) => {
      const branchId = a.branch_id || "pusat";
      if (stats[branchId]) stats[branchId].agents++;
    });

    return stats;
  }, [bookings, branches, agents, pilgrimCounts]);

  // Filter stats based on selected branch
  const filteredStats = useMemo(() => {
    if (selectedBranch === "all") return branchStats;
    const filtered: typeof branchStats = {};
    if (branchStats[selectedBranch]) {
      filtered[selectedBranch] = branchStats[selectedBranch];
    }
    return filtered;
  }, [branchStats, selectedBranch]);

  // Total aggregates
  const totals = useMemo(() => {
    const entries = Object.values(filteredStats);
    return {
      totalBookings: entries.reduce((s, e) => s + e.totalBookings, 0),
      paidBookings: entries.reduce((s, e) => s + e.paidBookings, 0),
      revenue: entries.reduce((s, e) => s + e.revenue, 0),
      pendingPayments: entries.reduce((s, e) => s + e.pendingPayments, 0),
      pilgrims: entries.reduce((s, e) => s + e.pilgrims, 0),
      agents: entries.reduce((s, e) => s + e.agents, 0),
    };
  }, [filteredStats]);

  // Chart data: monthly comparison across branches
  const chartData = useMemo(() => {
    const now = new Date();
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      months.push(format(subMonths(now, i), "yyyy-MM"));
    }

    return months.map((m) => {
      const row: any = { month: format(new Date(m + "-01"), "MMM yy", { locale: localeId }) };
      Object.entries(filteredStats).forEach(([id, stat]) => {
        row[stat.name] = stat.monthlyData[m] || 0;
      });
      return row;
    });
  }, [filteredStats]);

  const branchNames = Object.values(filteredStats).map((s) => s.name);
  const chartColors = [
    "hsl(var(--primary))",
    "hsl(210, 70%, 55%)",
    "hsl(150, 60%, 45%)",
    "hsl(30, 80%, 55%)",
    "hsl(280, 60%, 55%)",
    "hsl(0, 70%, 55%)",
    "hsl(180, 50%, 45%)",
    "hsl(60, 70%, 45%)",
  ];

  // Ranking by revenue
  const branchRanking = useMemo(() => {
    return Object.entries(branchStats)
      .map(([id, stat]) => ({ id, ...stat }))
      .filter((s) => s.totalBookings > 0 || branches.some((b: any) => b.id === s.id))
      .sort((a, b) => b.revenue - a.revenue);
  }, [branchStats, branches]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="w-7 h-7 text-primary" />
            Multi-Cabang Dashboard
          </h1>
          <p className="text-muted-foreground">Perbandingan performa antar cabang</p>
        </div>
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Pilih Cabang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Cabang</SelectItem>
            {branches.map((b: any) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
            <SelectItem value="pusat">Pusat (Tanpa Cabang)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <SummaryCard icon={ShoppingBag} label="Total Booking" value={totals.totalBookings} />
            <SummaryCard icon={CreditCard} label="Lunas" value={totals.paidBookings} color="text-success" />
            <SummaryCard icon={DollarSign} label="Revenue" value={`Rp ${totals.revenue.toLocaleString("id-ID")}`} color="text-success" />
            <SummaryCard icon={CreditCard} label="Pending" value={totals.pendingPayments} color="text-amber-600" />
            <SummaryCard icon={Users} label="Jemaah" value={totals.pilgrims} />
            <SummaryCard icon={Building2} label="Agen" value={totals.agents} />
          </div>

          {/* Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tren Booking per Cabang (6 Bulan)</CardTitle>
              <CardDescription>Perbandingan jumlah booking antar cabang</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.every((d) => branchNames.every((n) => !d[n])) ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>Belum ada data booking</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis allowDecimals={false} className="text-xs" />
                    <Tooltip />
                    <Legend />
                    {branchNames.map((name, i) => (
                      <Bar
                        key={name}
                        dataKey={name}
                        fill={chartColors[i % chartColors.length]}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Branch Ranking Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Peringkat Performa Cabang</CardTitle>
              <CardDescription>Diurutkan berdasarkan revenue tertinggi</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Cabang</TableHead>
                      <TableHead className="text-right">Booking</TableHead>
                      <TableHead className="text-right">Lunas</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Jemaah</TableHead>
                      <TableHead className="text-right">Agen</TableHead>
                      <TableHead className="text-right">Konversi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branchRanking.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Belum ada data cabang
                        </TableCell>
                      </TableRow>
                    ) : (
                      branchRanking.map((stat, idx) => {
                        const convRate = stat.totalBookings > 0
                          ? ((stat.paidBookings / stat.totalBookings) * 100).toFixed(0)
                          : "0";
                        return (
                          <TableRow key={stat.id}>
                            <TableCell>
                              <Badge variant={idx === 0 ? "default" : "outline"} className="text-xs">
                                {idx + 1}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{stat.name}</TableCell>
                            <TableCell className="text-right">{stat.totalBookings}</TableCell>
                            <TableCell className="text-right">{stat.paidBookings}</TableCell>
                            <TableCell className="text-right font-medium">
                              Rp {stat.revenue.toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell className="text-right">{stat.pilgrims}</TableCell>
                            <TableCell className="text-right">{stat.agents}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {Number(convRate) >= 70 ? (
                                  <ArrowUpRight className="w-3 h-3 text-success" />
                                ) : Number(convRate) >= 40 ? (
                                  <Minus className="w-3 h-3 text-amber-500" />
                                ) : (
                                  <ArrowDownRight className="w-3 h-3 text-destructive" />
                                )}
                                <span className="text-sm">{convRate}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

const SummaryCard = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  color?: string;
}) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-muted">
        <Icon className={`w-4 h-4 ${color || "text-foreground"}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={`text-sm font-bold truncate ${color || ""}`}>
          {value}
        </p>
      </div>
    </CardContent>
  </Card>
);

export default AdminMultiBranch;
