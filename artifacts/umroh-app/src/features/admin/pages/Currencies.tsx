import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";
import { toast } from "@/shared/hooks/use-toast";
import { Coins, Plus, Pencil, Trash2 } from "lucide-react";
import { useCurrency, type Currency } from "@/shared/hooks/useCurrency";

const empty = { code: "", name: "", symbol: "", rateToIdr: 1, isDefault: false, isActive: true };

const AdminCurrencies = () => {
  const { refresh } = useCurrency();
  const [items, setItems] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Currency | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Currency[]>("/api/admin/currencies");
      setItems(data || []);
    } catch (e: any) {
      toast({ title: "Gagal memuat", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (c: Currency) => {
    setEditing(c);
    setForm({ code: c.code, name: c.name, symbol: c.symbol, rateToIdr: c.rate_to_idr, isDefault: c.is_default, isActive: c.is_active });
    setOpen(true);
  };

  const save = async () => {
    if (!form.code || !form.name) {
      toast({ title: "Kode dan nama wajib diisi", variant: "destructive" });
      return;
    }
    const payload = { ...form, code: form.code.toUpperCase(), rateToIdr: Number(form.rateToIdr) || 1 };
    try {
      if (editing) {
        await apiFetch(`/api/admin/currencies/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/admin/currencies", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      
      toast({ title: editing ? "Mata uang diperbarui" : "Mata uang ditambahkan" });
      setOpen(false);
      await fetchData();
      await refresh();
    } catch (e: any) {
      toast({ title: "Gagal menyimpan", description: e.message, variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/admin/currencies/${deleteId}`, { method: "DELETE" });
      toast({ title: "Mata uang dihapus" });
      setDeleteId(null);
      await fetchData();
      await refresh();
    } catch (e: any) {
      toast({ title: "Gagal menghapus", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mata Uang</h1>
          <p className="text-muted-foreground mt-1">Kelola mata uang dan kurs konversi ke IDR.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Tambah</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Coins className="h-5 w-5" /> Daftar Mata Uang</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Simbol</TableHead>
                    <TableHead>1 unit = IDR</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-medium">{c.code}</TableCell>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.symbol}</TableCell>
                      <TableCell>{new Intl.NumberFormat("id-ID").format(c.rate_to_idr)}</TableCell>
                      <TableCell className="space-x-1">
                        {c.is_default && <Badge variant="default">Default</Badge>}
                        {c.is_active ? <Badge variant="secondary">Aktif</Badge> : <Badge variant="outline">Nonaktif</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteId(c.id)} disabled={c.code === "IDR"}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Mata Uang" : "Tambah Mata Uang"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kode (ISO)</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="USD" maxLength={5} />
              </div>
              <div>
                <Label>Simbol</Label>
                <Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="$" />
              </div>
            </div>
            <div>
              <Label>Nama</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="US Dollar" />
            </div>
            <div>
              <Label>1 unit = ... IDR</Label>
              <Input type="number" step="0.01" value={form.rateToIdr} onChange={(e) => setForm({ ...form, rateToIdr: Number(e.target.value) })} />
              <p className="text-xs text-muted-foreground mt-1">Contoh: untuk USD isi sekitar 15800</p>
            </div>
            <div className="flex items-center justify-between">
              <Label>Mata uang default</Label>
              <Switch checked={form.isDefault} onCheckedChange={(v) => setForm({ ...form, isDefault: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Aktif</Label>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteAlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Hapus mata uang?"
        description="Tindakan ini tidak dapat dibatalkan."
      />
    </div>
  );
};

export default AdminCurrencies;
