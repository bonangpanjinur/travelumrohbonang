import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DeleteAlertDialog } from "@/components/admin/DeleteAlertDialog";
import { toast } from "@/hooks/use-toast";
import { Coins, Plus, Pencil, Trash2 } from "lucide-react";
import { useCurrency, Currency } from "@/hooks/useCurrency";

const empty = { code: "", name: "", symbol: "", rate_to_idr: 1, is_default: false, is_active: true };

const AdminCurrencies = () => {
  const { refresh } = useCurrency();
  const [items, setItems] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Currency | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("currencies").select("*").order("code");
    if (error) toast({ title: "Gagal memuat", description: error.message, variant: "destructive" });
    setItems((data || []) as Currency[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (c: Currency) => {
    setEditing(c);
    setForm({ code: c.code, name: c.name, symbol: c.symbol, rate_to_idr: c.rate_to_idr, is_default: c.is_default, is_active: c.is_active });
    setOpen(true);
  };

  const save = async () => {
    if (!form.code || !form.name) {
      toast({ title: "Kode dan nama wajib diisi", variant: "destructive" });
      return;
    }
    const payload = { ...form, code: form.code.toUpperCase(), rate_to_idr: Number(form.rate_to_idr) || 1 };
    const op = editing
      ? supabase.from("currencies").update(payload).eq("id", editing.id)
      : supabase.from("currencies").insert(payload);
    const { error } = await op;
    if (error) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
      return;
    }
    // Ensure single default
    if (payload.is_default) {
      await supabase.from("currencies").update({ is_default: false })
        .neq("code", payload.code);
    }
    toast({ title: editing ? "Mata uang diperbarui" : "Mata uang ditambahkan" });
    setOpen(false);
    await fetchData();
    await refresh();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("currencies").delete().eq("id", deleteId);
    if (error) toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
    else toast({ title: "Mata uang dihapus" });
    setDeleteId(null);
    await fetchData();
    await refresh();
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
              <Input type="number" step="0.01" value={form.rate_to_idr} onChange={(e) => setForm({ ...form, rate_to_idr: Number(e.target.value) })} />
              <p className="text-xs text-muted-foreground mt-1">Contoh: untuk USD isi sekitar 15800</p>
            </div>
            <div className="flex items-center justify-between">
              <Label>Mata uang default</Label>
              <Switch checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Aktif</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
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
