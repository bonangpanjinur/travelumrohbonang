import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Ticket } from "lucide-react";
import { toast } from "sonner";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  value: number;
  min_purchase: number | null;
  max_uses: number | null;
  used_count: number | null;
  expired_at: string | null;
  is_active: boolean | null;
}

const emptyForm = { code: "", discount_type: "percentage", value: 0, min_purchase: 0, max_uses: null as number | null, expired_at: "", is_active: true };

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  const fetchCoupons = async () => {
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setCoupons(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleSave = async () => {
    if (!form.code || !form.value) { toast.error("Kode dan nilai wajib diisi"); return; }
    const payload = {
      code: form.code.toUpperCase(),
      discount_type: form.discount_type,
      value: form.value,
      min_purchase: form.min_purchase || 0,
      max_uses: form.max_uses || null,
      expired_at: form.expired_at || null,
      is_active: form.is_active,
    };
    if (editId) {
      const { error } = await supabase.from("coupons").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success("Kupon diperbarui");
    } else {
      const { error } = await supabase.from("coupons").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Kupon ditambahkan");
    }
    setDialogOpen(false);
    setEditId(null);
    setForm(emptyForm);
    fetchCoupons();
  };

  const handleEdit = (c: Coupon) => {
    setEditId(c.id);
    setForm({ code: c.code, discount_type: c.discount_type, value: c.value, min_purchase: c.min_purchase || 0, max_uses: c.max_uses, expired_at: c.expired_at || "", is_active: c.is_active ?? true });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("coupons").delete().eq("id", id);
    toast.success("Kupon dihapus");
    fetchCoupons();
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
                  <Select value={form.discount_type} onValueChange={v => setForm({ ...form, discount_type: v })}>
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
                <div><Label>Min. Pembelian</Label><Input type="number" value={form.min_purchase || ""} onChange={e => setForm({ ...form, min_purchase: Number(e.target.value) })} /></div>
                <div><Label>Maks. Penggunaan</Label><Input type="number" value={form.max_uses || ""} onChange={e => setForm({ ...form, max_uses: e.target.value ? Number(e.target.value) : null })} /></div>
              </div>
              <div><Label>Kadaluarsa</Label><Input type="date" value={form.expired_at} onChange={e => setForm({ ...form, expired_at: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>Aktif</Label></div>
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
                  <TableCell>{c.discount_type === "percentage" ? "%" : "Rp"}</TableCell>
                  <TableCell>{c.discount_type === "percentage" ? `${c.value}%` : `Rp ${c.value.toLocaleString("id-ID")}`}</TableCell>
                  <TableCell>{c.used_count || 0}{c.max_uses ? ` / ${c.max_uses}` : ""}</TableCell>
                  <TableCell>{c.expired_at ? new Date(c.expired_at).toLocaleDateString("id-ID") : "-"}</TableCell>
                  <TableCell><Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Aktif" : "Nonaktif"}</Badge></TableCell>
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
