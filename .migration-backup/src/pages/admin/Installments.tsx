import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Calendar, CheckCircle2, Clock, AlertTriangle, DollarSign } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface InstallmentRow {
  id: string;
  booking_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: string;
  paid_at: string | null;
  notes: string | null;
  booking?: { booking_code: string; profile?: { name: string } };
}

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Belum Bayar", variant: "outline" },
  paid: { label: "Lunas", variant: "default" },
  overdue: { label: "Jatuh Tempo", variant: "destructive" },
};

const AdminInstallments = () => {
  const [data, setData] = useState<InstallmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    let query = supabase
      .from("installment_schedules")
      .select(`*, booking:bookings(booking_code, profile:profiles!bookings_user_id_profiles_fkey(name))`)
      .order("due_date", { ascending: true });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data: result } = await query;
    setData((result as unknown as InstallmentRow[]) || []);
    setLoading(false);
  };

  const markAsPaid = async (id: string) => {
    const { error } = await supabase
      .from("installment_schedules")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error("Gagal update status");
    } else {
      toast.success("Cicilan ditandai lunas");
      fetchData();
    }
  };

  const filtered = data.filter((d) => {
    if (!search.trim()) return true;
    const code = (d.booking as any)?.booking_code || "";
    const name = (d.booking as any)?.profile?.name || "";
    const q = search.toLowerCase();
    return code.toLowerCase().includes(q) || name.toLowerCase().includes(q);
  });

  const totalPending = data.filter((d) => d.status === "pending").reduce((s, d) => s + Number(d.amount), 0);
  const totalOverdue = data.filter((d) => d.status === "overdue").reduce((s, d) => s + Number(d.amount), 0);
  const totalPaid = data.filter((d) => d.status === "paid").reduce((s, d) => s + Number(d.amount), 0);

  const fmt = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Monitoring Cicilan</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-lg"><Clock className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Belum Bayar</p>
              <p className="text-lg font-bold">{fmt(totalPending)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Jatuh Tempo</p>
              <p className="text-lg font-bold text-destructive">{fmt(totalOverdue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Sudah Lunas</p>
              <p className="text-lg font-bold">{fmt(totalPaid)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari kode booking / nama..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="pending">Belum Bayar</SelectItem>
            <SelectItem value="overdue">Jatuh Tempo</SelectItem>
            <SelectItem value="paid">Lunas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Tidak ada data cicilan.</div>
      ) : (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode Booking</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="text-center">Termin</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => {
                const badge = statusBadge[row.status] || statusBadge.pending;
                const isOverdue = row.status === "pending" && new Date(row.due_date) < new Date();
                return (
                  <TableRow key={row.id} className={isOverdue ? "bg-destructive/5" : ""}>
                    <TableCell className="font-mono text-sm">{(row.booking as any)?.booking_code || "-"}</TableCell>
                    <TableCell>{(row.booking as any)?.profile?.name || "-"}</TableCell>
                    <TableCell className="text-center">#{row.installment_number}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(row.amount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {new Date(row.due_date).toLocaleDateString("id-ID")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isOverdue ? "destructive" : badge.variant}>
                        {isOverdue ? "Jatuh Tempo" : badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {row.status !== "paid" && (
                        <Button size="sm" variant="outline" onClick={() => markAsPaid(row.id)}>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Tandai Lunas
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminInstallments;
