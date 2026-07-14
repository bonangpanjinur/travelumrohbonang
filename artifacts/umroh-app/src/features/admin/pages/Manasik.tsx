import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Switch } from "@/shared/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, BookOpen, FileText, Video, Book } from "lucide-react";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";

type Material = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  file_url: string | null;
  thumbnail_url: string | null;
  sort_order: number;
  is_active: boolean;
};

const AdminManasik = () => {
  const [list, setList] = useState<Material[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [toDelete, setToDelete] = useState<Material | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "pdf",
    file_url: "",
    thumbnail_url: "",
    sort_order: 0,
    is_active: true,
  });

  const load = async () => {
    try {
      const { data } = await apiFetch<{ data: Material[] }>("/api/admin/content/manasik-materials");
      setList(data || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", description: "", type: "pdf", file_url: "", thumbnail_url: "", sort_order: 0, is_active: true });
    setOpen(true);
  };
  const openEdit = (m: Material) => {
    setEditing(m);
    setForm({
      title: m.title,
      description: m.description || "",
      type: m.type,
      file_url: m.file_url || "",
      thumbnail_url: m.thumbnail_url || "",
      sort_order: m.sort_order,
      is_active: m.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) return void toast.error("Judul wajib");
    const payload = { ...form, description: form.description || null, file_url: form.file_url || null, thumbnail_url: form.thumbnail_url || null };
    
    try {
      if (editing) {
        await apiFetch(`/api/admin/content/manasik-materials/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/admin/content/manasik-materials", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      toast.success("Tersimpan");
      setOpen(false);
      load();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await apiFetch(`/api/admin/content/manasik-materials/${toDelete.id}`, { method: "DELETE" });
      toast.success("Dihapus");
      load();
    } catch (error: any) {
      toast.error(error.message);
    }
    setToDelete(null);
  };

  const typeIcon = (t: string) => t === "video" ? <Video className="w-4 h-4" /> : t === "ebook" ? <Book className="w-4 h-4" /> : <FileText className="w-4 h-4" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6 text-primary" /> Manasik Kit</h1>
          <p className="text-muted-foreground text-sm">Kelola materi PDF, video, dan e-book panduan manasik.</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Tambah</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Materi ({list.length})</CardTitle></CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Belum ada materi</p>
          ) : (
            <ul className="divide-y">
              {list.map((m) => (
                <li key={m.id} className="py-3 flex items-center gap-3">
                  <div className="p-2 rounded bg-muted">{typeIcon(m.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.description}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${m.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {m.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setToDelete(m)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Tambah"} Materi</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Judul *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Deskripsi</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipe</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="ebook">E-Book</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Urutan</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
            </div>
            <div className="space-y-1.5"><Label>URL File / Video</Label><Input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="https://..." /></div>
            <div className="space-y-1.5"><Label>URL Thumbnail (opsional)</Label><Input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Aktif</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteAlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} onConfirm={remove} title="Hapus materi?" description="Materi akan dihapus permanen." />
    </div>
  );
};

export default AdminManasik;
