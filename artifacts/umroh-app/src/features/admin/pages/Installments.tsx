import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { toast } from "sonner";
import { Search, Calendar, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import ConfirmAlertDialog from "@/features/admin/components/ConfirmAlertDialog";
import AdminPagination from "@/features/admin/components/AdminPagination";
import { useAdminPagination } from "@/features/admin/hooks/useAdminPagination";

interface InstallmentRow {
  id: string;
  bookingId: string;
  installmentNumber: number;
  amount: string | number;
  dueDate: string;
  status: string;
  paidAt: string | null;
  bookingCode: string | null;
  packageName: string | null;
  jamaahName: string | null;
  jamaahEmail: string | null;
  jamaahPhone: string | null;
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
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      const result = await apiFetch<{ data: InstallmentRow[]; total: number }>(
        `/api/admin/installments${params.toString() ? `?${params}` : ""}`
      );
      setData(result?.data || []);
    } catch (e: any) {
      toast.error(e?.message || "Gagal memuat data cicilan");
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      await apiFetch(`/api/admin/installments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "paid" }),
      });
      toast.success("Cicilan ditandai lunas");
      fetchData();
    } catch (e: any) {
      toast.error(e?.message || "Gagal update status cicilan");
    }
  };

  // Determine overdue inline — even when filter=all, rows returned as "pending"
  // with dueDate in the past are treated as overdue for display & counters.
  const isRowOverdue = (row: InstallmentRow) =>
    row.status === "pending" && new Date(row.dueDate) < new Date();

  const filtered = data.filter((d) => {
    if (!search.trim()) return true;
    const code = d.bookingCode?.toLowerCase() ?? "";
    const name = d.jamaahName?.toLowerCase() ?? "";
    const q = search.toLowerCase();
    return code.includes(q) || name.includes(q);
  });

  const { page, setPage, totalPages, totalCount, paginatedItems, pageSize, resetPage } =
    useAdminPagination(filtered);

  useEffect(() => { resetPage(); }, [search, filter]);

  // Summary counters — when filter=all, backend returns all statuses; compute locally.
  // When filter=overdue, backend already pre-filtered to overdue-pending rows.
  const allRows = data; // raw data from backend for current filter
  const totalPending = filter === "all"
    ? allRows.filter((d) => d.status === "pending" && !isRowOverdue(d)).reduce((s, d) => s + Number(d.amount), 0)
    : filter === "pending"
    ? allRows.filter((d) => !isRowOverdue(d)).reduce((s, d) => s + Number(d.amount), 0)
    : 0;
  const totalOverdue = filter === "all"
    ? allRows.filter((d) => isRowOverdue(d)).reduce((s, d) => s + Number(d.amount), 0)
    : filter === "overdue"
    ? allRows.reduce((s, d) => s + Number(d.amount), 0)
    : 0;
  const totalPaid = filter === "all"
    ? allRows.filter((d) => d.status === "paid").reduce((s, d) => s + Number(d.amount), 0)
    : filter === "paid"
    ? allRows.reduce((s, d) => s + Number(d.amount), 0)
    : 0;

  const fmt = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  const confirmTarget = confirmId ? data.find((d) => d.id === confirmId) : null;

  return (
    <div>
      <ConfirmAlertDialog
        open={!!confirmId}
        onOpenChange={(open) => { if (!open) setConfirmId(null); }}
        onConfirm={async () => {
          if (confirmId) await markAsPaid(confirmId);
          setConfirmId(null);
        }}
        title="Tandai Cicilan Lunas?"
        description={
          confirmTarget
            ? `Cicilan #${confirmTarget.installmentNumber} milik ${confirmTarget.jamaahName || confirmTarget.bookingCode || "-"} sebesar ${fmt(Number(confirmTarget.amount))} akan ditandai lunas dan dicatat ke buku kas.`
            : "Cicilan akan ditandai lunas dan dicatat ke buku kas."
        }
        confirmLabel="Tandai Lunas"
        variant="default"
      />

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
        <>
          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode Booking</TableHead>
                  <TableHead>Nama Jamaah</TableHead>
                  <TableHead>Paket</TableHead>
                  <TableHead className="text-center">Termin</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((row) => {
                  const overdue = isRowOverdue(row);
                  const badge = overdue ? statusBadge.overdue : (statusBadge[row.status] ?? statusBadge.pending);
                  return (
                    <TableRow key={row.id} className={overdue ? "bg-destructive/5" : ""}>
                      <TableCell className="font-mono text-sm">{row.bookingCode || "-"}</TableCell>
                      <TableCell>{row.jamaahName || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.packageName || "-"}</TableCell>
                      <TableCell className="text-center">#{row.installmentNumber}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(Number(row.amount))}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {new Date(row.dueDate).toLocaleDateString("id-ID")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {row.status !== "paid" && (
                          <Button size="sm" variant="outline" onClick={() => setConfirmId(row.id)}>
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
          <AdminPagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
};

export default AdminInstallments;
