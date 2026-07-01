import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Award } from "lucide-react";
import { toast } from "sonner";

interface Advantage { id: string; title: string; icon: string | null; sort_order: number | null; is_active: boolean | null; }

const emptyForm = { title: "", icon: "check-circle", sort_order: 0, is_active: true };

const AdminAdvantages = () => {
  const [items, setItems] = useState<Advantage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetch = async () => {
    const { data } = await supabase.from("advantages").select("*").order("sort_order");
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleSave = async () => {
    if (!form.title) { toast.error("Judul wajib diisi"); return; }
    const payload = { title: form.title, icon: form.icon, sort_order: form.sort_order, is_active: form.is_active };
    if (editId) {
      const { error } = await supabase.from("advantages").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success("Keunggulan diperbarui");
    } else {
      const { error } = await supabase.from("advantages").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Keunggulan ditambahkan");
    }
    setDialogOpen(false); setEditId(null); setForm(emptyForm); fetch();
  };

  const handleEdit = (a: Advantage) => { setEditId(a.id); setForm({ title: a.title, icon: a.icon || "check-circle", sort_order: a.sort_order || 0, is_active: a.is_active ?? true }); setDialogOpen(true); };
  const handleDelete = async (id: string) => { await supabase.from("advantages").delete().eq("id", id); toast.success("Dihapus"); fetch(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Award className="h-6 w-6" /> Keunggulan</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Tambah</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Tambah"} Keunggulan</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Judul</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Icon (Lucide name)</Label><Input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="check-circle" /></div>
              <div><Label>Urutan</Label><Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>Aktif</Label></div>
              <Button className="w-full" onClick={handleSave}>Simpan</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Judul</TableHead><TableHead>Icon</TableHead><TableHead>Urutan</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.title}</TableCell>
                <TableCell className="font-mono text-sm">{a.icon}</TableCell>
                <TableCell>{a.sort_order}</TableCell>
                <TableCell><Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "Aktif" : "Nonaktif"}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(a)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus "{a.title}"?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(a.id)}>Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Belum ada data</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default AdminAdvantages;
