import { useState, useEffect } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/shared/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Ticket } from "lucide-react";
import { toast } from "sonner";

interface Coupon {
  id: string;
  code: string;
  discountType: string;
  value: number;
  minPurchase: number | null;
  maxUses: number | null;
  usedCount: number | null;
  expiredAt: string | null;
  isActive: boolean | null;
}

const emptyForm = { code: "", discountType: "percentage", value: 0, minPurchase: 0, maxUses: null as number | null, expiredAt: "", isActive: true };

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  const fetchCoupons = async () => {
    try {
      const data = await apiFetch<Coupon[]>("/api/admin/coupons");
      setCoupons(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat data kupon");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleSave = async () => {
    if (!form.code || !form.value) { toast.error("Kode dan nilai wajib diisi"); return; }
    const payload = {
      code: form.code.toUpperCase(),
      discountType: form.discountType,
      value: form.value,
      minPurchase: form.minPurchase || 0,
      maxUses: form.maxUses || null,
      expiredAt: form.expiredAt || null,
      isActive: form.isActive,
    };
    try {
      if (editId) {
        await apiFetch(`/api/admin/coupons/${editId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Kupon diperbarui");
      } else {
        await apiFetch("/api/admin/coupons", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Kupon ditambahkan");
      }
      setDialogOpen(false);
      setEditId(null);
      setForm(emptyForm);
      fetchCoupons();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleEdit = (c: Coupon) => {
    setEditId(c.id);
    setForm({ code: c.code, discountType: c.discountType, value: c.value, minPurchase: c.minPurchase || 0, maxUses: c.maxUses, expiredAt: c.expiredAt || "", isActive: c.isActive ?? true });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
      toast.success("Kupon dihapus");
      fetchCoupons();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = coupons.filter(c => c.code.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Ticket className="h-6 w-6" /> Manajemen Kupon</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Tambah Kupon</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Edit Kupon" : "Tambah Kupon"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Kode Kupon</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="DISKON10" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Tipe Diskon</Label>
                  <Select value={form.discountType} onValueChange={v => setForm({ ...form, discountType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Persentase (%)</SelectItem>
                      <SelectItem value="fixed">Nominal (Rp)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Nilai</Label><Input type="number" value={form.value} onChange={e => setForm({ ...form, value: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Min. Pembelian</Label><Input type="number" value={form.minPurchase || ""} onChange={e => setForm({ ...form, minPurchase: Number(e.target.value) })} /></div>
                <div><Label>Maks. Penggunaan</Label><Input type="number" value={form.maxUses || ""} onChange={e => setForm({ ...form, maxUses: e.target.value ? Number(e.target.value) : null })} /></div>
              </div>
              <div><Label>Kadaluarsa</Label><Input type="date" value={form.expiredAt} onChange={e => setForm({ ...form, expiredAt: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: v })} /><Label>Aktif</Label></div>
              <Button className="w-full" onClick={handleSave}>{editId ? "Simpan Perubahan" : "Tambah"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Input placeholder="Cari kode kupon..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Kode</TableHead><TableHead>Tipe</TableHead><TableHead>Nilai</TableHead><TableHead>Digunakan</TableHead><TableHead>Kadaluarsa</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Aksi</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-bold">{c.code}</TableCell>
                  <TableCell>{c.discountType === "percentage" ? "%" : "Rp"}</TableCell>
                  <TableCell>{c.discountType === "percentage" ? `${c.value}%` : `Rp ${c.value.toLocaleString("id-ID")}`}</TableCell>
                  <TableCell>{c.usedCount || 0}{c.maxUses ? ` / ${c.maxUses}` : ""}</TableCell>
                  <TableCell>{c.expiredAt ? new Date(c.expiredAt).toLocaleDateString("id-ID") : "-"}</TableCell>
                  <TableCell><Badge variant={c.isActive ? "default" : "secondary"}>{c.isActive ? "Aktif" : "Nonaktif"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Hapus kupon {c.code}?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(c.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Belum ada kupon</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCoupons;
