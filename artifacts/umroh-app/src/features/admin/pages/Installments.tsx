import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { toast } from "sonner";
import {
  Search, Calendar, CheckCircle2, Clock, AlertTriangle, Bell,
  Download, LayoutList, GitBranch, CalendarRange, Loader2,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import ConfirmAlertDialog from "@/features/admin/components/ConfirmAlertDialog";
import AdminPagination from "@/features/admin/components/AdminPagination";
import { useAdminPagination } from "@/features/admin/hooks/useAdminPagination";
import { exportToCsv } from "@/shared/lib/exportCsv";

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
  const [reminderLoading, setReminderLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");

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

  const sendReminders = async () => {
    setReminderLoading(true);
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>("/api/admin/installments/send-reminders", {
        method: "POST",
      });
      toast.success(res?.message || "Reminder berhasil dikirim");
    } catch (e: any) {
      toast.error(e?.message || "Gagal mengirim reminder");
    } finally {
      setReminderLoading(false);
    }
  };

  const isRowOverdue = (row: InstallmentRow) =>
    row.status === "pending" && new Date(row.dueDate) < new Date();

  const filtered = useMemo(() => data.filter((d) => {
    if (search.trim()) {
      const code = d.bookingCode?.toLowerCase() ?? "";
      const name = d.jamaahName?.toLowerCase() ?? "";
      const q = search.toLowerCase();
      if (!code.includes(q) && !name.includes(q)) return false;
    }
    if (dueDateFrom) {
      const due = new Date(d.dueDate);
      if (due < new Date(dueDateFrom)) return false;
    }
    if (dueDateTo) {
      const due = new Date(d.dueDate);
      if (due > new Date(dueDateTo + "T23:59:59")) return false;
    }
    return true;
  }), [data, search, dueDateFrom, dueDateTo]);

  const { page, setPage, totalPages, totalCount, paginatedItems, pageSize, resetPage } =
    useAdminPagination(filtered);

  useEffect(() => { resetPage(); }, [search, filter, dueDateFrom, dueDateTo]);

  const allRows = data;
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

  const handleExport = () => {
    const headers = ["Kode Booking", "Nama Jamaah", "Paket", "Termin", "Jumlah", "Jatuh Tempo", "Status", "Tanggal Lunas"];
    const rows = filtered.map(d => {
      const overdue = isRowOverdue(d);
      const statusLabel = overdue ? "Jatuh Tempo" : d.status === "paid" ? "Lunas" : "Belum Bayar";
      return [
        d.bookingCode || "-",
        d.jamaahName || "-",
        d.packageName || "-",
        `#${d.installmentNumber}`,
        String(Number(d.amount)),
        new Date(d.dueDate).toLocaleDateString("id-ID"),
        statusLabel,
        d.paidAt ? new Date(d.paidAt).toLocaleDateString("id-ID") : "-",
      ];
    });
    exportToCsv("cicilan", headers, rows);
  };

  // Timeline view — group by booking
  const timelineGroups = useMemo(() => {
    const groups: Record<string, { bookingCode: string; jamaahName: string | null; packageName: string | null; items: InstallmentRow[] }> = {};
    filtered.forEach(row => {
      const key = row.bookingId;
      if (!groups[key]) {
        groups[key] = { bookingCode: row.bookingCode || row.bookingId, jamaahName: row.jamaahName, packageName: row.packageName, items: [] };
      }
      groups[key].items.push(row);
    });
    Object.values(groups).forEach(g => g.items.sort((a, b) => a.installmentNumber - b.installmentNumber));
    return Object.values(groups);
  }, [filtered]);

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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold">Monitoring Cicilan</h1>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={sendReminders}
            disabled={reminderLoading}
          >
            {reminderLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
            Kirim Reminder
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              className="rounded-none border-0"
              onClick={() => setViewMode("table")}
            >
              <LayoutList className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "timeline" ? "default" : "ghost"}
              size="sm"
              className="rounded-none border-0"
              onClick={() => setViewMode("timeline")}
            >
              <GitBranch className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
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

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
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
        {/* Date range filter */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <CalendarRange className="w-4 h-4 text-muted-foreground hidden sm:block" />
          <div className="flex gap-2 items-center flex-wrap">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">Jatuh Tempo:</Label>
            <Input type="date" value={dueDateFrom} onChange={(e) => setDueDateFrom(e.target.value)} className="w-auto text-sm" />
            <span className="text-muted-foreground text-sm">s/d</span>
            <Input type="date" value={dueDateTo} onChange={(e) => setDueDateTo(e.target.value)} className="w-auto text-sm" />
            {(dueDateFrom || dueDateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDueDateFrom(""); setDueDateTo(""); }}>Reset</Button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Tidak ada data cicilan.</div>
      ) : viewMode === "timeline" ? (
        /* Timeline View */
        <div className="space-y-4">
          {timelineGroups.map((group) => (
            <Card key={group.bookingCode}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-mono font-semibold text-sm">{group.bookingCode}</p>
                    <p className="text-sm text-muted-foreground">{group.jamaahName || "-"} · {group.packageName || "-"}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {group.items.filter(i => i.status === "paid").length}/{group.items.length} lunas
                  </Badge>
                </div>
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                  <div className="space-y-3">
                    {group.items.map((item) => {
                      const overdue = isRowOverdue(item);
                      const badge = overdue ? statusBadge.overdue : (statusBadge[item.status] ?? statusBadge.pending);
                      return (
                        <div key={item.id} className="flex items-center gap-3 pl-8 relative">
                          <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 ${
                            item.status === "paid" ? "bg-green-500 border-green-500" :
                            overdue ? "bg-destructive border-destructive" :
                            "bg-background border-border"
                          }`} />
                          <div className="flex-1 flex items-center justify-between gap-2 p-2 rounded-lg border bg-muted/30">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-muted-foreground">#{item.installmentNumber}</span>
                              <span className="font-medium text-sm">{fmt(Number(item.amount))}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(item.dueDate).toLocaleDateString("id-ID")}
                              </span>
                              <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
                              {item.status !== "paid" && (
                                <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setConfirmId(item.id)}>
                                  Lunas
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Table View */
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
