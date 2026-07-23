/**
 * F-12: Budget & Proyeksi Cash Flow
 * Dashboard anggaran: target vs realisasi + proyeksi cash flow 3–6 bulan
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line,
} from "recharts";
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Target, Droplets } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const fmtShort = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}rb`;
  return String(n);
};

const CATEGORIES = [
  { value: "pendapatan_umroh", label: "Pendapatan Umroh", type: "income" },
  { value: "pendapatan_lainnya", label: "Pendapatan Lainnya", type: "income" },
  { value: "biaya_hotel", label: "Biaya Hotel", type: "expense" },
  { value: "biaya_penerbangan", label: "Biaya Penerbangan", type: "expense" },
  { value: "biaya_visa", label: "Biaya Visa", type: "expense" },
  { value: "biaya_transportasi", label: "Biaya Transportasi", type: "expense" },
  { value: "biaya_konsumsi", label: "Biaya Konsumsi", type: "expense" },
  { value: "biaya_perlengkapan", label: "Biaya Perlengkapan", type: "expense" },
  { value: "biaya_muthawif", label: "Biaya Muthawif", type: "expense" },
  { value: "biaya_operasional", label: "Biaya Operasional", type: "expense" },
  { value: "biaya_pemasaran", label: "Biaya Pemasaran", type: "expense" },
  { value: "biaya_administrasi", label: "Biaya Administrasi", type: "expense" },
  { value: "lainnya", label: "Lainnya", type: "expense" },
];

const MONTHS = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

interface BudgetForm {
  periodYear: number;
  periodMonth: number | null;
  category: string;
  budgetType: string;
  amount: string;
  notes: string;
}

const emptyForm: BudgetForm = {
  periodYear: new Date().getFullYear(),
  periodMonth: new Date().getMonth() + 1,
  category: "pendapatan_umroh",
  budgetType: "income",
  amount: "",
  notes: "",
};

// ── Budget CRUD Panel ─────────────────────────────────────────────────────────
function BudgetPanel({ year, month }: { year: number; month: number | null }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<BudgetForm>(emptyForm);

  const params = new URLSearchParams({ year: String(year) });
  if (month) params.set("month", String(month));

  const { data: budgetList = [], isLoading } = useQuery<any[]>({
    queryKey: ["budgets", year, month],
    queryFn: () => apiFetch(`/api/admin/budget?${params}`),
  });

  const saveMutation = useMutation({
    mutationFn: (body: any) =>
      editId
        ? apiFetch(`/api/admin/budget/${editId}`, { method: "PATCH", body: JSON.stringify(body) })
        : apiFetch("/api/admin/budget", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["budget-vs-actual"] });
      setOpen(false);
      toast({ title: editId ? "Budget diperbarui" : "Budget ditambahkan" });
    },
    onError: () => toast({ title: "Gagal menyimpan", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/budget/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["budget-vs-actual"] });
      toast({ title: "Budget dihapus" });
    },
    onError: () => toast({ title: "Gagal menghapus", variant: "destructive" }),
  });

  function openAdd() {
    setEditId(null);
    setForm({ ...emptyForm, periodYear: year, periodMonth: month });
    setOpen(true);
  }

  function openEdit(b: any) {
    setEditId(b.id);
    setForm({
      periodYear: b.periodYear,
      periodMonth: b.periodMonth ?? null,
      category: b.category,
      budgetType: b.budgetType,
      amount: String(b.amount),
      notes: b.notes ?? "",
    });
    setOpen(true);
  }

  function handleSave() {
    if (!form.amount || isNaN(Number(form.amount))) {
      toast({ title: "Nominal anggaran tidak valid", variant: "destructive" });
      return;
    }
    const selectedCat = CATEGORIES.find((c) => c.value === form.category);
    saveMutation.mutate({
      periodYear: form.periodYear,
      periodMonth: form.periodMonth,
      category: form.category,
      categoryLabel: selectedCat?.label ?? form.category,
      budgetType: selectedCat?.type ?? form.budgetType,
      amount: Number(form.amount),
      notes: form.notes || null,
    });
  }

  const incomeItems = (budgetList as any[]).filter((b) => b.budgetType === "income");
  const expenseItems = (budgetList as any[]).filter((b) => b.budgetType !== "income");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> Tambah Anggaran
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
        ))}</div>
      ) : budgetList.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Target className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>Belum ada anggaran untuk periode ini.</p>
          <p className="text-xs mt-1">Klik "Tambah Anggaran" untuk memulai.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {[{ label: "Pendapatan", items: incomeItems }, { label: "Pengeluaran", items: expenseItems }].map((group) =>
            group.items.length > 0 ? (
              <div key={group.label}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">{group.label}</h3>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-left p-3 font-medium">Kategori</th>
                        <th className="text-right p-3 font-medium">Anggaran</th>
                        <th className="text-right p-3 font-medium">Keterangan</th>
                        <th className="p-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((b: any) => (
                        <tr key={b.id} className="border-t hover:bg-muted/20">
                          <td className="p-3 font-medium">{b.categoryLabel ?? b.category}</td>
                          <td className="p-3 text-right font-mono">{fmtCurrency(b.amount)}</td>
                          <td className="p-3 text-right text-xs text-muted-foreground">{b.notes ?? "—"}</td>
                          <td className="p-3">
                            <div className="flex gap-1 justify-end">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(b)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(b.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/20 border-t font-semibold">
                      <tr>
                        <td className="p-3">Total {group.label}</td>
                        <td className="p-3 text-right">{fmtCurrency(group.items.reduce((s: number, b: any) => s + b.amount, 0))}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : null
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Anggaran" : "Tambah Anggaran"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tahun</Label>
                <Input
                  type="number"
                  value={form.periodYear}
                  onChange={(e) => setForm((f) => ({ ...f, periodYear: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Bulan (opsional)</Label>
                <Select
                  value={form.periodMonth !== null ? String(form.periodMonth) : "annual"}
                  onValueChange={(v) => setForm((f) => ({ ...f, periodMonth: v === "annual" ? null : Number(v) }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Tahunan</SelectItem>
                    {MONTHS.slice(1).map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Kategori</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Nominal Anggaran (IDR)</Label>
              <Input
                type="number"
                placeholder="Contoh: 50000000"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Catatan (opsional)</Label>
              <Input
                placeholder="Keterangan anggaran..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── vs-Actual Panel ───────────────────────────────────────────────────────────
function VsActualPanel({ year, month }: { year: number; month: number | null }) {
  const params = new URLSearchParams({ year: String(year) });
  if (month) params.set("month", String(month));

  const { data, isLoading } = useQuery<any>({
    queryKey: ["budget-vs-actual", year, month],
    queryFn: () => apiFetch(`/api/admin/budget/vs-actual?${params}`),
  });

  if (isLoading) {
    return <div className="h-40 bg-muted/50 rounded animate-pulse" />;
  }

  const d = data as any;
  if (!d || !d.comparison?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Target className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p>Belum ada data anggaran.</p>
        <p className="text-xs">Tambahkan anggaran di tab "Anggaran" terlebih dahulu.</p>
      </div>
    );
  }

  const chartData = d.comparison.map((c: any) => ({
    name: c.categoryLabel ?? c.category,
    Anggaran: c.budget,
    Aktual: c.actual,
  }));

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      on_track: { label: "Sesuai Target", cls: "bg-green-100 text-green-800" },
      over_budget: { label: "Melebihi Anggaran", cls: "bg-red-100 text-red-800" },
      under_target: { label: "Belum Tercapai", cls: "bg-amber-100 text-amber-800" },
      under_budget: { label: "Di Bawah Anggaran", cls: "bg-blue-100 text-blue-800" },
    };
    const { label, cls } = map[status] ?? { label: status, cls: "" };
    return <Badge className={`text-xs ${cls}`}>{label}</Badge>;
  };

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Anggaran", value: d.summary?.totalBudget ?? 0, icon: Target, color: "text-blue-600" },
          { label: "Total Aktual", value: d.summary?.totalActual ?? 0, icon: TrendingUp, color: "text-green-600" },
          { label: "Selisih", value: Math.abs(d.summary?.totalVariance ?? 0), icon: TrendingDown, color: (d.summary?.totalVariance ?? 0) >= 0 ? "text-green-600" : "text-red-600" },
        ].map((item, i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <item.icon className={`h-4 w-4 ${item.color}`} />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
              <p className={`font-bold text-lg ${item.color}`}>{fmtCurrency(item.value)}</p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="pt-4">
            <span className="text-xs text-muted-foreground">Realisasi</span>
            <p className={`font-bold text-2xl mt-1 ${(d.summary?.realisasiPct ?? 0) >= 100 ? "text-green-600" : "text-amber-600"}`}>
              {d.summary?.realisasiPct ?? 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Anggaran vs Realisasi per Kategori</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 60, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-35} textAnchor="end" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => fmtCurrency(v)} />
              <Legend />
              <Bar dataKey="Anggaran" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Aktual" fill="#34d399" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detail Tabel */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="text-left p-3 font-medium">Kategori</th>
              <th className="text-right p-3 font-medium">Anggaran</th>
              <th className="text-right p-3 font-medium">Aktual</th>
              <th className="text-right p-3 font-medium">Selisih</th>
              <th className="text-right p-3 font-medium">%</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {d.comparison.map((c: any) => (
              <tr key={c.id} className="border-t hover:bg-muted/20">
                <td className="p-3 font-medium">{c.categoryLabel ?? c.category}</td>
                <td className="p-3 text-right">{fmtCurrency(c.budget)}</td>
                <td className="p-3 text-right">{fmtCurrency(c.actual)}</td>
                <td className={`p-3 text-right font-medium ${c.variance >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {c.variance >= 0 ? "+" : ""}{fmtCurrency(c.variance)}
                </td>
                <td className="p-3 text-right text-xs">{c.variancePct >= 0 ? "+" : ""}{c.variancePct}%</td>
                <td className="p-3">{statusBadge(c.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Cash Flow Projection Panel ────────────────────────────────────────────────
function CashFlowProjectionPanel() {
  const [months, setMonths] = useState(6);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["cash-flow-projection", months],
    queryFn: () => apiFetch(`/api/admin/budget/cash-flow-projection?months=${months}`),
  });

  const d = data as any;

  const chartData = (d?.projection ?? []).map((p: any) => ({
    month: p.month,
    Inflow: p.projectedInflow,
    Outflow: p.projectedOutflow,
    "Net Cash Flow": p.netCashFlow,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Label>Proyeksikan</Label>
        {[3, 6, 9, 12].map((m) => (
          <Button
            key={m}
            size="sm"
            variant={months === m ? "default" : "outline"}
            onClick={() => setMonths(m)}
          >
            {m} bulan
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-60 bg-muted/50 rounded animate-pulse" />
      ) : d ? (
        <>
          {/* Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <Droplets className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{d.note}</p>
              </div>
              <p className="mt-1 text-xs">
                Rata-rata pengeluaran bulanan (3 bln terakhir): <strong>{fmtCurrency(d.avgMonthlyExpense ?? 0)}</strong>
              </p>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Proyeksi Cash Flow {months} Bulan ke Depan</CardTitle>
              <CardDescription>Inflow = cicilan jatuh tempo + outstanding booking. Outflow = proyeksi berdasarkan rata-rata historis.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="Inflow" stroke="#34d399" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Outflow" stroke="#f87171" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Net Cash Flow" stroke="#60a5fa" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tabel */}
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left p-3 font-medium">Bulan</th>
                  <th className="text-right p-3 font-medium">Cicilan Jatuh Tempo</th>
                  <th className="text-right p-3 font-medium">Outstanding Booking</th>
                  <th className="text-right p-3 font-medium">Total Inflow</th>
                  <th className="text-right p-3 font-medium">Proj. Outflow</th>
                  <th className="text-right p-3 font-medium">Net Cash Flow</th>
                </tr>
              </thead>
              <tbody>
                {(d.projection ?? []).map((p: any) => (
                  <tr key={p.month} className="border-t hover:bg-muted/20">
                    <td className="p-3 font-medium">{p.month}</td>
                    <td className="p-3 text-right">{fmtCurrency(p.cicilan)}</td>
                    <td className="p-3 text-right">{fmtCurrency(p.pelunasan)}</td>
                    <td className="p-3 text-right text-green-700 font-medium">{fmtCurrency(p.projectedInflow)}</td>
                    <td className="p-3 text-right text-red-700">{fmtCurrency(p.projectedOutflow)}</td>
                    <td className={`p-3 text-right font-bold ${p.netCashFlow >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {p.netCashFlow >= 0 ? "+" : ""}{fmtCurrency(p.netCashFlow)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BudgetCashFlow() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | null>(currentMonth);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Budget & Proyeksi Cash Flow</h1>
        <p className="text-muted-foreground mt-1">
          Kelola anggaran pendapatan & pengeluaran, monitor realisasi, dan proyeksikan arus kas.
        </p>
      </div>

      {/* Filter Periode */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>Tahun</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Bulan</Label>
          <Select value={month !== null ? String(month) : "annual"} onValueChange={(v) => setMonth(v === "annual" ? null : Number(v))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="annual">Semua Bulan</SelectItem>
              {MONTHS.slice(1).map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="vs-actual">
        <TabsList>
          <TabsTrigger value="vs-actual">
            <Target className="h-4 w-4 mr-1" />
            Realisasi vs Anggaran
          </TabsTrigger>
          <TabsTrigger value="projection">
            <TrendingUp className="h-4 w-4 mr-1" />
            Proyeksi Cash Flow
          </TabsTrigger>
          <TabsTrigger value="budget">
            <Droplets className="h-4 w-4 mr-1" />
            Kelola Anggaran
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vs-actual" className="mt-4">
          <VsActualPanel year={year} month={month} />
        </TabsContent>

        <TabsContent value="projection" className="mt-4">
          <CashFlowProjectionPanel />
        </TabsContent>

        <TabsContent value="budget" className="mt-4">
          <BudgetPanel year={year} month={month} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
