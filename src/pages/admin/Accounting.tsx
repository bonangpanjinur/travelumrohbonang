import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, TrendingUp, TrendingDown, Wallet, Search, Pencil, Trash2, ArrowUpDown, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import DeleteAlertDialog from "@/components/admin/DeleteAlertDialog";
import AdminPagination from "@/components/admin/AdminPagination";
import { useAdminPagination } from "@/hooks/useAdminPagination";

const incomeCategories = [
  "Pembayaran Paket",
  "DP Booking",
  "Pelunasan",
  "Komisi",
  "Lain-lain (Pemasukan)",
];

const expenseCategories = [
  "Operasional Kantor",
  "Gaji Karyawan",
  "Hotel",
  "Tiket Pesawat",
  "Transportasi",
  "Konsumsi",
  "Visa & Dokumen",
  "Marketing",
  "Lain-lain (Pengeluaran)",
];

interface TransactionForm {
  type: "income" | "expense";
  category: string;
  description: string;
  amount: string;
  transaction_date: string;
  reference_number: string;
}

const defaultForm: TransactionForm = {
  type: "income",
  category: "",
  description: "",
  amount: "",
  transaction_date: new Date().toISOString().split("T")[0],
  reference_number: "",
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

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["financial_transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = transactions.filter((t: any) => {
    const matchesSearch =
      !search ||
      t.category?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.reference_number?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || t.type === filterType;
    return matchesSearch && matchesType;
  });

  const { page, setPage, totalPages, totalCount, paginatedItems, pageSize } =
    useAdminPagination(filtered);

  // Summary calculations
  const totalIncome = transactions
    .filter((t: any) => t.type === "income")
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
  const totalExpense = transactions
    .filter((t: any) => t.type === "expense")
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  const saveMutation = useMutation({
    mutationFn: async (data: TransactionForm) => {
      const payload = {
        type: data.type,
        category: data.category,
        description: data.description || null,
        amount: Number(data.amount),
        transaction_date: data.transaction_date,
        reference_number: data.reference_number || null,
        created_by: user?.id,
      };

      if (editId) {
        const { error } = await supabase
          .from("financial_transactions")
          .update(payload)
          .eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("financial_transactions")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      toast.success(editId ? "Transaksi diperbarui" : "Transaksi ditambahkan");
      setDialogOpen(false);
      setEditId(null);
      setForm(defaultForm);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_transactions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      toast.success("Transaksi dihapus");
      setDeleteId(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleEdit = (t: any) => {
    setEditId(t.id);
    setForm({
      type: t.type,
      category: t.category,
      description: t.description || "",
      amount: String(t.amount),
      transaction_date: t.transaction_date,
      reference_number: t.reference_number || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category || !form.amount || Number(form.amount) <= 0) {
      toast.error("Kategori dan jumlah harus diisi");
      return;
    }
    saveMutation.mutate(form);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

  const categories = form.type === "income" ? incomeCategories : expenseCategories;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Akuntansi & Keuangan</h1>
          <p className="text-muted-foreground text-sm">Pencatatan pemasukan dan pengeluaran</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) { setEditId(null); setForm(defaultForm); }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Tambah Transaksi</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Transaksi" : "Tambah Transaksi"}</DialogTitle>
            </DialogHeader>
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
                  <Input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Kategori</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Jumlah (Rp)</Label>
                <Input type="number" min="0" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <Label>No. Referensi (opsional)</Label>
                <Input placeholder="INV-001" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} />
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pemasukan</CardTitle>
            <TrendingUp className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pengeluaran</CardTitle>
            <TrendingDown className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
            <Wallet className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${balance >= 0 ? "text-success" : "text-destructive"}`}>
              {formatCurrency(balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      {transactions.length > 0 && (() => {
        const monthlyData: Record<string, { month: string; pemasukan: number; pengeluaran: number }> = {};
        transactions.forEach((t: any) => {
          const key = t.transaction_date?.substring(0, 7); // YYYY-MM
          if (!key) return;
          if (!monthlyData[key]) {
            const [y, m] = key.split("-");
            const label = format(new Date(Number(y), Number(m) - 1), "MMM yyyy", { locale: localeId });
            monthlyData[key] = { month: label, pemasukan: 0, pengeluaran: 0 };
          }
          if (t.type === "income") monthlyData[key].pemasukan += Number(t.amount);
          else monthlyData[key].pengeluaran += Number(t.amount);
        });
        const chartData = Object.entries(monthlyData)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, v]) => v);

        return (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Tren Pemasukan vs Pengeluaran</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}jt`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="pemasukan" name="Pemasukan" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pengeluaran" name="Pengeluaran" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );
      })()}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari transaksi..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-44">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            <SelectItem value="income">Pemasukan</SelectItem>
            <SelectItem value="expense">Pengeluaran</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
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
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Memuat data...</TableCell>
                  </TableRow>
                ) : paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Belum ada transaksi</TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(t.transaction_date), "dd MMM yyyy", { locale: localeId })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.type === "income" ? "default" : "destructive"} className={t.type === "income" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}>
                          {t.type === "income" ? "Masuk" : "Keluar"}
                        </Badge>
                      </TableCell>
                      <TableCell>{t.category}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{t.description || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.reference_number || "-"}</TableCell>
                      <TableCell className={`text-right font-semibold whitespace-nowrap ${t.type === "income" ? "text-emerald-600" : "text-destructive"}`}>
                        {t.type === "income" ? "+" : "-"}{formatCurrency(Number(t.amount))}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

export default AdminAccounting;
