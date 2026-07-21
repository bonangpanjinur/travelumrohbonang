/**
 * F-7: Chart of Accounts (CoA) — CRUD kode akun standar akuntansi
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Sprout, BookOpen } from "lucide-react";

interface CoaAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  category: string | null;
  normalBalance: string;
  isActive: boolean;
  description: string | null;
  sortOrder: number;
}

const TYPE_LABELS: Record<string, string> = {
  asset: "Aset",
  liability: "Kewajiban",
  equity: "Ekuitas",
  revenue: "Pendapatan",
  expense: "Beban",
};

const TYPE_COLORS: Record<string, string> = {
  asset: "bg-blue-100 text-blue-700",
  liability: "bg-orange-100 text-orange-700",
  equity: "bg-purple-100 text-purple-700",
  revenue: "bg-green-100 text-green-700",
  expense: "bg-red-100 text-red-700",
};

const EMPTY: Partial<CoaAccount> = {
  code: "", name: "", type: "asset", category: "", normalBalance: "debit",
  description: "", sortOrder: 0,
};

export default function ChartOfAccounts() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [form, setForm] = useState<Partial<CoaAccount>>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: accounts = [], isLoading } = useQuery<CoaAccount[]>({
    queryKey: ["coa"],
    queryFn: () => apiFetch("/api/admin/coa"),
  });

  const saveMutation = useMutation({
    mutationFn: (body: Partial<CoaAccount>) => {
      if (editId) return apiFetch(`/api/admin/coa/${editId}`, { method: "PATCH", body: JSON.stringify(body) });
      return apiFetch("/api/admin/coa", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coa"] });
      setDialog(null);
      toast.success(editId ? "Akun diperbarui" : "Akun berhasil ditambahkan");
    },
    onError: (e: any) => toast.error(e.message || "Gagal menyimpan"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/coa/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["coa"] }); toast.success("Akun dihapus"); },
    onError: (e: any) => toast.error(e.message || "Gagal menghapus — mungkin akun sudah dipakai di transaksi"),
  });

  const seedMutation = useMutation({
    mutationFn: () => apiFetch("/api/admin/coa/seed", { method: "POST" }),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["coa"] });
      toast.success(`Seed berhasil: ${data.inserted} akun ditambahkan, ${data.skipped} sudah ada`);
    },
    onError: (e: any) => toast.error(e.message || "Gagal seed"),
  });

  const openAdd = () => { setForm(EMPTY); setEditId(null); setDialog("add"); };
  const openEdit = (a: CoaAccount) => { setForm(a); setEditId(a.id); setDialog("edit"); };

  const filtered = accounts.filter((a) => {
    if (filterType !== "all" && a.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
    }
    return true;
  });

  const grouped = Object.entries(TYPE_LABELS).map(([type, label]) => ({
    type, label,
    items: filtered.filter((a) => a.type === type),
  })).filter((g) => g.items.length > 0 || filterType === type || filterType === "all");

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chart of Accounts</h1>
          <p className="text-muted-foreground text-sm">Kode akun standar akuntansi double-entry</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            <Sprout className="h-4 w-4 mr-2" />
            Seed Akun Standar
          </Button>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Tambah Akun</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Input placeholder="Cari kode / nama..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Memuat...</div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Belum ada kode akun. Klik "Seed Akun Standar" untuk mulai.</p>
          </CardContent>
        </Card>
      ) : (
        grouped.map(({ type, label, items }) => items.length > 0 && (
          <Card key={type}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[type]}`}>{label}</span>
                <span className="text-muted-foreground font-normal text-sm">({items.length} akun)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-2 text-left font-medium w-28">Kode</th>
                      <th className="py-2 text-left font-medium">Nama Akun</th>
                      <th className="py-2 text-left font-medium">Kategori</th>
                      <th className="py-2 text-left font-medium">Saldo Normal</th>
                      <th className="py-2 text-left font-medium">Status</th>
                      <th className="py-2 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((a) => (
                      <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 font-mono text-xs">{a.code}</td>
                        <td className="py-2 font-medium">{a.name}</td>
                        <td className="py-2 text-muted-foreground text-xs">{a.category ?? "-"}</td>
                        <td className="py-2">
                          <Badge variant="outline" className="text-xs">{a.normalBalance === "debit" ? "Debit" : "Kredit"}</Badge>
                        </td>
                        <td className="py-2">
                          <Badge variant={a.isActive ? "default" : "secondary"} className="text-xs">
                            {a.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </td>
                        <td className="py-2">
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(a)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => { if (confirm("Hapus akun ini?")) deleteMutation.mutate(a.id); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Akun" : "Tambah Akun Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Kode Akun *</label>
                <Input value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="1-1101" disabled={!!editId} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tipe *</label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, normalBalance: ["asset","expense"].includes(v) ? "debit" : "credit" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Nama Akun *</label>
              <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Kas / Rekening Bank BCA..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Kategori</label>
                <Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="kas-bank, piutang..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Saldo Normal</label>
                <Select value={form.normalBalance} onValueChange={(v) => setForm({ ...form, normalBalance: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Debit</SelectItem>
                    <SelectItem value="credit">Kredit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
