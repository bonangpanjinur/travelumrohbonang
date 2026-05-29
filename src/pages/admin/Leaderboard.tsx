import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Award, Download } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { logAudit } from "@/lib/audit";

interface Row {
  agent_id: string;
  agent_name: string;
  bookings: number;
  commission_total: number;
  commission_paid: number;
}

const presets = [
  { label: "30 hari terakhir", days: 30 },
  { label: "90 hari terakhir", days: 90 },
  { label: "Tahun ini", days: 0 },
  { label: "Semua", days: -1 },
];

const AdminLeaderboard = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState("30");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const range = useMemo(() => {
    if (startDate || endDate) return { start: startDate || null, end: endDate || null };
    const p = presets.find((x) => x.days.toString() === preset);
    if (!p || p.days === -1) return { start: null, end: null };
    if (p.days === 0) {
      const start = new Date(new Date().getFullYear(), 0, 1).toISOString();
      return { start, end: null };
    }
    const d = new Date();
    d.setDate(d.getDate() - p.days);
    return { start: d.toISOString(), end: null };
  }, [preset, startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    let query = supabase
      .from("agent_commissions")
      .select("agent_id, amount, status, created_at, agents:agent_id(name)");
    if (range.start) query = query.gte("created_at", range.start);
    if (range.end) query = query.lte("created_at", range.end);
    const { data } = await query;

    const grouped = new Map<string, Row>();
    (data || []).forEach((r: any) => {
      const id = r.agent_id;
      if (!grouped.has(id)) {
        grouped.set(id, {
          agent_id: id,
          agent_name: r.agents?.name || "Unknown",
          bookings: 0,
          commission_total: 0,
          commission_paid: 0,
        });
      }
      const row = grouped.get(id)!;
      row.bookings += 1;
      row.commission_total += Number(r.amount || 0);
      if (r.status === "paid") row.commission_paid += Number(r.amount || 0);
    });

    const sorted = Array.from(grouped.values()).sort((a, b) => b.commission_total - a.commission_total);
    setRows(sorted);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [range.start, range.end]);
  useEffect(() => { logAudit({ action: "view_leaderboard" }); }, []);

  const exportCSV = () => {
    const header = ["Rank", "Agen", "Booking", "Total Komisi", "Sudah Dibayar"];
    const lines = rows.map((r, i) => [i + 1, `"${r.agent_name.replace(/"/g, '""')}"`, r.bookings, r.commission_total, r.commission_paid].join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leaderboard-agen-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    logAudit({ action: "export_leaderboard_csv", metadata: { rows: rows.length } });
  };

  const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);
  const chartData = rows.slice(0, 10).map((r) => ({ name: r.agent_name, komisi: r.commission_total }));

  const rankBadge = (i: number) => {
    if (i === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (i === 1) return <Medal className="h-5 w-5 text-slate-400" />;
    if (i === 2) return <Award className="h-5 w-5 text-amber-700" />;
    return <span className="text-muted-foreground">#{i + 1}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard Agen</h1>
        <p className="text-muted-foreground mt-1">Peringkat agen berdasarkan komisi diperoleh.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Periode</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Preset</Label>
            <Select value={preset} onValueChange={(v) => { setPreset(v); setStartDate(""); setEndDate(""); }}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p.days} value={p.days.toString()}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Dari</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Sampai</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Top 10 Agen</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}jt`} />
                <Tooltip formatter={(v: number) => `Rp ${fmt(v)}`} />
                <Bar dataKey="komisi" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Peringkat Lengkap ({rows.length})</CardTitle>
          <Button size="sm" variant="outline" onClick={exportCSV} disabled={rows.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Ekspor CSV
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Agen</TableHead>
                    <TableHead className="text-right">Booking</TableHead>
                    <TableHead className="text-right">Total Komisi</TableHead>
                    <TableHead className="text-right">Sudah Dibayar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada data komisi pada periode ini.</TableCell></TableRow>
                  ) : rows.map((r, i) => (
                    <TableRow key={r.agent_id}>
                      <TableCell>{rankBadge(i)}</TableCell>
                      <TableCell className="font-medium">{r.agent_name}</TableCell>
                      <TableCell className="text-right">{r.bookings}</TableCell>
                      <TableCell className="text-right font-semibold">Rp {fmt(r.commission_total)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">Rp {fmt(r.commission_paid)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLeaderboard;
