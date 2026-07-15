import { useState, useEffect } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/shared/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ListOrdered } from "lucide-react";
import { toast } from "sonner";

interface GuideStep { id: string; step_number: number; title: string; description: string | null; icon: string; is_active: boolean | null; }

const emptyForm = { step_number: 1, title: "", description: "", icon: "circle", is_active: true };

const AdminGuideSteps = () => {
  const [items, setItems] = useState<GuideStep[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      const { data } = await apiFetch<{ data: GuideStep[] }>("/api/admin/content/guide-steps");
      setItems(data || []);
    } catch (e) {
      toast.error("Gagal memuat data");
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.title) { toast.error("Judul wajib diisi"); return; }
    const payload = { step_number: form.step_number, title: form.title, description: form.description || null, icon: form.icon, is_active: form.is_active };
    try {
      if (editId) {
        await apiFetch(`/api/admin/content/guide-steps/${editId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Langkah diperbarui");
      } else {
        await apiFetch("/api/admin/content/guide-steps", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Langkah ditambahkan");
      }
      setDialogOpen(false); setEditId(null); setForm(emptyForm); fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleEdit = (g: GuideStep) => { setEditId(g.id); setForm({ step_number: g.step_number, title: g.title, description: g.description || "", icon: g.icon, is_active: g.is_active ?? true }); setDialogOpen(true); };
  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/content/guide-steps/${id}`, { method: "DELETE" });
      toast.success("Dihapus");
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ListOrdered className="h-6 w-6" /> Langkah Panduan</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Tambah</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Tambah"} Langkah</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>No. Langkah</Label><Input type="number" value={form.step_number} onChange={e => setForm({ ...form, step_number: Number(e.target.value) })} /></div>
                <div><Label>Icon</Label><Input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="circle" /></div>
              </div>
              <div><Label>Judul</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Deskripsi</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>Aktif</Label></div>
              <Button className="w-full" onClick={handleSave}>Simpan</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead className="w-16">#</TableHead><TableHead>Judul</TableHead><TableHead>Deskripsi</TableHead><TableHead>Icon</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map(g => (
              <TableRow key={g.id}>
                <TableCell className="font-bold">{g.step_number}</TableCell>
                <TableCell className="font-medium">{g.title}</TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{g.description || "-"}</TableCell>
                <TableCell className="font-mono text-sm">{g.icon}</TableCell>
                <TableCell><Badge variant={g.is_active ? "default" : "secondary"}>{g.is_active ? "Aktif" : "Nonaktif"}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(g)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus langkah "{g.title}"?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(g.id)}>Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Belum ada data</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default AdminGuideSteps;
