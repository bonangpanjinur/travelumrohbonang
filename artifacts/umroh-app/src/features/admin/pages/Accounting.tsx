import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { useAuth } from "@/shared/hooks/useAuth";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Badge } from "@/shared/components/ui/badge";
import { Textarea } from "@/shared/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus, TrendingUp, TrendingDown, Wallet, Search, Pencil, Trash2,
  ArrowUpDown, BarChart3, Download, CalendarRange, Settings2, FileText,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { safeFormatDate } from "@/lib/utils";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";
import AdminPagination from "@/features/admin/components/AdminPagination";
import { useAdminPagination } from "@/features/admin/hooks/useAdminPagination";
import { exportToCsv } from "@/shared/lib/exportCsv";

const BASE_INCOME_CATEGORIES = [
  "Pembayaran Paket", "DP Booking", "Pelunasan",
  "booking_payment", "installment_payment", "Komisi", "Lain-lain (Pemasukan)",
];
const BASE_EXPENSE_CATEGORIES = [
  "Operasional Kantor", "Gaji Karyawan", "Hotel", "Tiket Pesawat",
  "Transportasi", "Konsumsi", "Visa & Dokumen", "Marketing",
  "refund", "Lain-lain (Pengeluaran)",
];

const CUSTOM_CATS_KEY = "accounting_custom_cats";

function loadCustomCats(): { income: string[]; expense: string[] } {
  try { return JSON.parse(localStorage.getItem(CUSTOM_CATS_KEY) || "{}") || { income: [], expense: [] }; }
  catch { return { income: [], expense: [] }; }
}
function saveCustomCats(cats: { income: string[]; expense: string[] }) {
  localStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(cats));
}

interface Transaction {
  id: string;
  type: string;
  category: string;
  description: string | null;
  amount: string | number;
  transactionDate: string | null;
  referenceNumber: string | null;
  recordedBy: string | null;
  createdAt: string | null;
}

interface TransactionForm {
  type: "income" | "expense";
  category: string;
  description: string;
  amount: string;
  transactionDate: string;
  referenceNumber: string;
}

const defaultForm: TransactionForm = {
  type: "income",
  category: "",
  description: "",
  amount: "",
  transactionDate: new Date().toISOString().split("T")[0],
  referenceNumber: "",
};

const AdminAccounting = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TransactionForm>(defaultForm);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customCats, setCustomCats] = useState(loadCustomCats);
  const [newCatDialog, setNewCatDialog] = useState(false);
  const [newCatType, setNewCatType] = useState<"income" | "expense">("income");
  const [newCatName, setNewCatName] = useState("");

  const queryKey = useMemo(
    () => ["financial_transactions", dateFrom, dateTo],
    [dateFrom, dateTo]
  );

  const { data: transactions = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      return apiFetch<Transaction[]>(`/api/admin/accounting${params.toString() ? `?${params}` : ""}`);
    },
  });

  const filtered = useMemo(() => transactions.filter((t) => {
    const matchesSearch =
      !search ||
      t.category?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.referenceNumber?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || t.type === filterType;
    return matchesSearch && matchesType;
  }), [transactions, search, filterType]);

  const { page, setPage, totalPages, totalCount, paginatedItems, pageSize } =
    useAdminPagination(filtered);

  const totalIncome = useMemo(() => transactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0), [transactions]);
  const totalExpense = useMemo(() => transactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0), [transactions]);
  const balance = totalIncome - totalExpense;

  const saveMutation = useMutation({
    mutationFn: async (data: TransactionForm) => {
      const payload = {
        type: data.type, category: data.category,
        description: data.description || undefined,
        amount: Number.isFinite(parseFloat(String(data.amount))) ? parseFloat(String(data.amount)) : 0,
        transactionDate: data.transactionDate,
        referenceNumber: data.referenceNumber || undefined,
      };
      if (editId) return apiFetch(`/api/admin/accounting/${editId}`, { method: "PATCH", body: JSON.stringify(payload) });
      return apiFetch("/api/admin/accounting", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      toast.success(editId ? "Transaksi diperbarui" : "Transaksi ditambahkan");
      setDialogOpen(false); setEditId(null); setForm(defaultForm);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/accounting/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      toast.success("Transaksi dihapus"); setDeleteId(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleEdit = (t: Transaction) => {
    setEditId(t.id);
    setForm({
      type: t.type as "income" | "expense",
      category: t.category,
      description: t.description || "",
      amount: String(t.amount),
      transactionDate: t.transactionDate ? t.transactionDate.toString().split("T")[0] : new Date().toISOString().split("T")[0],
      referenceNumber: t.referenceNumber || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category || !form.amount || Number(form.amount) <= 0) { toast.error("Kategori dan jumlah harus diisi"); return; }
    saveMutation.mutate(form);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

  const incomeCategories = [...BASE_INCOME_CATEGORIES, ...customCats.income];
  const expenseCategories = [...BASE_EXPENSE_CATEGORIES, ...customCats.expense];
  const categories = form.type === "income" ? incomeCategories : expenseCategories;

  const addCustomCategory = () => {
    if (!newCatName.trim()) return;
    const updated = {
      ...customCats,
      [newCatType]: [...customCats[newCatType], newCatName.trim()],
    };
    setCustomCats(updated);
    saveCustomCats(updated);
    setNewCatName(""); setNewCatDialog(false);
    toast.success("Kategori kustom ditambahkan");
  };

  // Export CSV
  const handleExportTransactions = () => {
    const headers = ["Tanggal", "Tipe", "Kategori", "Keterangan", "Referensi", "Jumlah"];
    const rows = filtered.map(t => [
      t.transactionDate ? t.transactionDate.toString().split("T")[0] : "-",
      t.type === "income" ? "Pemasukan" : "Pengeluaran",
      t.category,
      t.description || "-",
      t.referenceNumber || "-",
      String(Number(t.amount)),
    ]);
    exportToCsv(`transaksi_${new Date().toISOString().slice(0,10)}`, headers, rows);
  };

  // P&L by month
  const plData = useMemo(() => {
    const byMonth: Record<string, { month: string; pemasukan: number; pengeluaran: number }> = {};
    transactions.forEach(t => {
      const dateStr = t.transactionDate ? (typeof t.transactionDate === "string" ? t.transactionDate : new Date(t.transactionDate).toISOString()) : null;
      const key = dateStr?.substring(0, 7);
      if (!key) return;
      if (!byMonth[key]) {
        const [y, m] = key.split("-");
        const parsedDate = new Date(Number(y), Number(m) - 1);
        const label = isNaN(parsedDate.getTime()) ? key : format(parsedDate, "MMM yyyy", { locale: localeId });
        byMonth[key] = { month: label, pemasukan: 0, pengeluaran: 0 };
      }
      if (t.type === "income") byMonth[key].pemasukan += Number(t.amount);
      else byMonth[key].pengeluaran += Number(t.amount);
    });
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => ({ ...v, laba: v.pemasukan - v.pengeluaran }));
  }, [transactions]);

  const handleExportPL = () => {
    const headers = ["Bulan", "Pemasukan", "Pengeluaran", "Laba/Rugi"];
    const rows = plData.map(r => [r.month, String(r.pemasukan), String(r.pengeluaran), String(r.laba)]);
    exportToCsv(`pl_report_${new Date().toISOString().slice(0,10)}`, headers, rows);
    toast.success("Laporan P&L diekspor");
  };

  // P&L by category
  const plByCategory = useMemo(() => {
    const cats: Record<string, { category: string; type: string; total: number }> = {};
    transactions.forEach(t => {
      const key = `${t.type}:${t.category}`;
      if (!cats[key]) cats[key] = { category: t.category, type: t.type, total: 0 };
      cats[key].total += Number(t.amount);
    });
    return Object.values(cats).sort((a, b) => b.total - a.total);
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Akuntansi & Keuangan</h1>
          <p className="text-muted-foreground text-sm">Pencatatan pemasukan dan pengeluaran</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => { setNewCatDialog(true); }}>
            <Settings2 className="w-4 h-4 mr-1" /> Kategori +
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) { setEditId(null); setForm(defaultForm); }
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Tambah Transaksi</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{editId ? "Edit Transaksi" : "Tambah Transaksi"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipe</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "income" | "expense", category: "" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Pemasukan</SelectItem>
                        <SelectItem value="expense">Pengeluaran</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tanggal</Label>
                    <Input type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Kategori</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Jumlah (Rp)</Label>
                  <Input type="number" min="0" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div>
                  <Label>No. Referensi (opsional)</Label>
                  <Input placeholder="INV-001" value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} />
                </div>
                <div>
                  <Label>Keterangan (opsional)</Label>
                  <Textarea placeholder="Catatan transaksi..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Menyimpan..." : editId ? "Perbarui" : "Simpan"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pemasukan</CardTitle>
            <TrendingUp className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-success">{formatCurrency(totalIncome)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pengeluaran</CardTitle>
            <TrendingDown className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpense)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
            <Wallet className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${balance >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(balance)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transaksi</TabsTrigger>
          <TabsTrigger value="pl">Laporan P&L</TabsTrigger>
          <TabsTrigger value="reconciliation">Rekonsiliasi</TabsTrigger>
        </TabsList>

        {/* ── Transactions Tab ── */}
        <TabsContent value="transactions" className="space-y-4 mt-4">
          {/* Period Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari transaksi..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-44">
                <ArrowUpDown className="w-4 h-4 mr-2" /><SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="income">Pemasukan</SelectItem>
                <SelectItem value="expense">Pengeluaran</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExportTransactions} className="shrink-0">
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
          </div>
          {/* Date Range */}
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <CalendarRange className="w-4 h-4 text-muted-foreground hidden sm:block" />
            <div className="flex gap-2 items-center flex-wrap">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">Filter Periode:</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto text-sm" />
              <span className="text-muted-foreground text-sm">s/d</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto text-sm" />
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>Reset</Button>
              )}
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead>Referensi</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Memuat data...</TableCell></TableRow>
                    ) : paginatedItems.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Belum ada transaksi</TableCell></TableRow>
                    ) : (
                      paginatedItems.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="whitespace-nowrap">
                            {safeFormatDate(t.transactionDate, "dd MMM yyyy", { locale: localeId })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={t.type === "income" ? "default" : "destructive"} className={t.type === "income" ? "bg-success/10 text-success hover:bg-success/10" : ""}>
                              {t.type === "income" ? "Masuk" : "Keluar"}
                            </Badge>
                          </TableCell>
                          <TableCell>{t.category}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{t.description || "-"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{t.referenceNumber || "-"}</TableCell>
                          <TableCell className={`text-right font-semibold whitespace-nowrap ${t.type === "income" ? "text-success" : "text-destructive"}`}>
                            {t.type === "income" ? "+" : "-"}{formatCurrency(Number(t.amount))}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}><Pencil className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <AdminPagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onPageChange={setPage} />
        </TabsContent>

        {/* ── P&L Tab ── */}
        <TabsContent value="pl" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Laporan Laba & Rugi</h2>
            <Button variant="outline" size="sm" onClick={handleExportPL}>
              <Download className="w-4 h-4 mr-1" /> Export P&L
            </Button>
          </div>

          {plData.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={plData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}jt`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="pemasukan" name="Pemasukan" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pengeluaran" name="Pengeluaran" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="laba" name="Laba Bersih" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bulan</TableHead>
                    <TableHead className="text-right text-success">Pemasukan</TableHead>
                    <TableHead className="text-right text-destructive">Pengeluaran</TableHead>
                    <TableHead className="text-right">Laba/Rugi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plData.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow>
                  ) : plData.map((r) => (
                    <TableRow key={r.month}>
                      <TableCell className="font-medium">{r.month}</TableCell>
                      <TableCell className="text-right text-success">{formatCurrency(r.pemasukan)}</TableCell>
                      <TableCell className="text-right text-destructive">{formatCurrency(r.pengeluaran)}</TableCell>
                      <TableCell className={`text-right font-bold ${r.laba >= 0 ? "text-success" : "text-destructive"}`}>
                        {r.laba >= 0 ? "+" : ""}{formatCurrency(r.laba)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {plData.length > 0 && (
                    <TableRow className="bg-muted/30 font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right text-success">{formatCurrency(totalIncome)}</TableCell>
                      <TableCell className="text-right text-destructive">{formatCurrency(totalExpense)}</TableCell>
                      <TableCell className={`text-right ${balance >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(balance)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* By Category breakdown */}
          <Card>
            <CardHeader><CardTitle className="text-base">Breakdown per Kategori</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plByCategory.slice(0, 20).map((r) => {
                    const base = r.type === "income" ? totalIncome : totalExpense;
                    const pct = base > 0 ? (r.total / base) * 100 : 0;
                    return (
                      <TableRow key={`${r.type}:${r.category}`}>
                        <TableCell>{r.category}</TableCell>
                        <TableCell>
                          <Badge variant={r.type === "income" ? "default" : "destructive"} className={r.type === "income" ? "bg-success/10 text-success" : ""}>
                            {r.type === "income" ? "Masuk" : "Keluar"}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${r.type === "income" ? "text-success" : "text-destructive"}`}>
                          {formatCurrency(r.total)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">{pct.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Reconciliation Tab ── */}
        <TabsContent value="reconciliation" className="space-y-4 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Rekonsiliasi dengan Booking</h2>
          </div>
          <ReconciliationTab transactions={transactions} formatCurrency={formatCurrency} />
        </TabsContent>
      </Tabs>

      {/* Custom Category Dialog */}
      <Dialog open={newCatDialog} onOpenChange={setNewCatDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tambah Kategori Kustom</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipe</Label>
              <Select value={newCatType} onValueChange={(v) => setNewCatType(v as "income" | "expense")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Pemasukan</SelectItem>
                  <SelectItem value="expense">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nama Kategori</Label>
              <Input placeholder="Nama kategori baru..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustomCategory()} />
            </div>
            {(customCats.income.length > 0 || customCats.expense.length > 0) && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium">Kustom yang ada:</p>
                {[...customCats.income.map(c => ({ c, t: "income" })), ...customCats.expense.map(c => ({ c, t: "expense" }))].map(({ c, t }) => (
                  <div key={`${t}:${c}`} className="flex items-center justify-between">
                    <span>{c} <Badge variant="outline" className="text-xs ml-1">{t === "income" ? "Masuk" : "Keluar"}</Badge></span>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => {
                      const updated = { ...customCats, [t]: customCats[t as "income" | "expense"].filter(x => x !== c) };
                      setCustomCats(updated); saveCustomCats(updated);
                    }}>×</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCatDialog(false)}>Tutup</Button>
            <Button onClick={addCustomCategory} disabled={!newCatName.trim()}>Tambah</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteAlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Hapus Transaksi"
        description="Transaksi yang dihapus tidak dapat dikembalikan."
      />
    </div>
  );
};

// ── Reconciliation sub-component ──────────────────────────────────────────────
function ReconciliationTab({ transactions, formatCurrency }: { transactions: Transaction[]; formatCurrency: (n: number) => string }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ data: any[] }>("/api/admin/bookings?limit=100&status=paid")
      .then(r => setBookings(r?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Map booking reference numbers to their financial transactions
  const txByRef = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    transactions.forEach(t => {
      if (t.referenceNumber) {
        if (!map[t.referenceNumber]) map[t.referenceNumber] = [];
        map[t.referenceNumber].push(t);
      }
    });
    return map;
  }, [transactions]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (bookings.length === 0) return <div className="text-center py-12 text-muted-foreground">Tidak ada booking lunas untuk direkonsiliasi.</div>;

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode Booking</TableHead>
              <TableHead>Jamaah</TableHead>
              <TableHead className="text-right">Total Booking</TableHead>
              <TableHead>Transaksi Tercatat</TableHead>
              <TableHead>Status Rekonsiliasi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.slice(0, 50).map((b: any) => {
              const bookingCode = b.bookingCode ?? b.booking_code ?? "-";
              const relatedTxs = transactions.filter(t =>
                t.referenceNumber?.includes(b.id) ||
                t.description?.includes(bookingCode) ||
                t.referenceNumber === bookingCode
              );
              const recordedAmount = relatedTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
              const totalPrice = Number(b.totalPrice ?? b.total_price ?? 0);
              const isReconciled = recordedAmount >= totalPrice * 0.99; // 1% tolerance
              return (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-sm">{bookingCode}</TableCell>
                  <TableCell className="text-sm">{b.userName ?? b.user_name ?? b.pilgrimName ?? "-"}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(totalPrice)}</TableCell>
                  <TableCell>
                    {relatedTxs.length > 0
                      ? <span className="text-sm">{relatedTxs.length} transaksi · {formatCurrency(recordedAmount)}</span>
                      : <span className="text-xs text-muted-foreground">Tidak ditemukan</span>
                    }
                  </TableCell>
                  <TableCell>
                    <Badge variant={isReconciled ? "default" : "destructive"} className={isReconciled ? "bg-success/10 text-success" : ""}>
                      {isReconciled ? "Sesuai" : "Belum Sesuai"}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default AdminAccounting;
