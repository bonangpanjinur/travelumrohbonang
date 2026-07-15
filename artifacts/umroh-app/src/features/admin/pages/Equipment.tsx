import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { useToast } from "@/shared/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";

interface Equipment {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
}

const AdminEquipment = () => {
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const { toast } = useToast();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", category: "", description: "", imageUrl: "" });

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      const res = await apiFetch<{ data: Equipment[] }>("/api/admin/masterdata/equipment");
      setItems(res.data || []);
    } catch {
      toast({ title: "Gagal memuat perlengkapan", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editing) {
        await apiFetch(`/api/admin/masterdata/equipment/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
        toast({ title: "Perlengkapan diupdate!" });
      } else {
        await apiFetch("/api/admin/masterdata/equipment", {
          method: "POST",
          body: JSON.stringify(form),
        });
        toast({ title: "Perlengkapan ditambahkan!" });
      }
      fetchEquipment();
      setIsOpen(false);
      resetForm();
    } catch {
      toast({ title: "Gagal menyimpan", variant: "destructive" });
    }
  };

  const handleEdit = (item: Equipment) => {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category || "",
      description: item.description || "",
      imageUrl: item.imageUrl || "",
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeleteTargetId(id);
  };

  const executeDelete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/masterdata/equipment/${id}`, { method: "DELETE" });
      toast({ title: "Perlengkapan dihapus" });
      fetchEquipment();
    } catch {
      toast({ title: "Gagal menghapus", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ name: "", category: "", description: "", imageUrl: "" });
  };

  return (
    <div>
      <DeleteAlertDialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)} onConfirm={() => { if (deleteTargetId) executeDelete(deleteTargetId); setDeleteTargetId(null); }} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Perlengkapan</h1>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-primary"><Plus className="w-4 h-4 mr-2" /> Tambah</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Perlengkapan" : "Tambah Perlengkapan"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nama Perlengkapan *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" />
              </div>
              <div>
                <Label>Kategori</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Contoh: Ihram, Koper, Aksesoris" className="mt-1" />
              </div>
              <div>
                <Label>Deskripsi</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Gambar URL</Label>
                <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." className="mt-1" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                <Button type="submit" className="gradient-gold text-primary">Simpan</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Belum ada perlengkapan</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Perlengkapan</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-semibold">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.category || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminEquipment;
