import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/badge";
import { useToast } from "@/shared/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, Tag, ChevronRight } from "lucide-react";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";
import { useDeleteConfirm } from "@/features/admin/hooks/useDeleteConfirm";

interface Category {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  show_extra_hotels: boolean | null;
  parent?: { name: string } | null;
}

const emptyForm = {
  name: "",
  description: "",
  parent_id: "",
  sort_order: 0,
  is_active: true,
  show_extra_hotels: false,
};

const AdminPackageCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { isDeleteOpen, requestDelete, cancelDelete, confirmDelete } = useDeleteConfirm();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: any[] }>("/api/admin/masterdata/categories");
      setCategories((res.data || []).map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        parent_id: c.parentId,
        sort_order: c.sortOrder,
        is_active: c.isActive,
        show_extra_hotels: c.showExtraHotels,
        parent: c.parent,
      })));
    } catch (error: any) {
      toast({ title: "Gagal memuat kategori", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditing(null);
  };

  const handleEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      description: cat.description || "",
      parent_id: cat.parent_id || "",
      sort_order: cat.sort_order || 0,
      is_active: cat.is_active ?? true,
      show_extra_hotels: cat.show_extra_hotels ?? false,
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      parentId: form.parent_id || null,
      sortOrder: form.sort_order,
      isActive: form.is_active,
      showExtraHotels: form.show_extra_hotels,
    };

    try {
      if (editing) {
        await apiFetch(`/api/admin/masterdata/categories/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/admin/masterdata/categories", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      toast({ title: editing ? "Kategori diperbarui" : "Kategori ditambahkan" });
      fetchCategories();
      setIsOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const executeDelete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/masterdata/categories/${id}`, { method: "DELETE" });
      toast({ title: "Kategori dihapus" });
      fetchCategories();
    } catch (error: any) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (cat: Category) => {
    try {
      await apiFetch(`/api/admin/masterdata/categories/${cat.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !cat.is_active }),
      });
      setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, is_active: !c.is_active } : c));
    } catch {
      toast({ title: "Gagal mengubah status", variant: "destructive" });
    }
  };

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const rootCategories = categories.filter((c) => !c.parent_id);

  return (
    <div>
      <DeleteAlertDialog
        open={isDeleteOpen}
        onOpenChange={cancelDelete}
        onConfirm={() => confirmDelete(executeDelete)}
        title="Hapus Kategori?"
        description="Kategori akan dihapus. Paket yang menggunakan kategori ini perlu diperbarui secara manual."
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Kategori Paket</h1>
          <p className="text-muted-foreground text-sm mt-1">Kelola kategori untuk paket umroh (Reguler, VIP, Plus, dll.)</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-56"
            />
          </div>

          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-gold text-primary">
                <Plus className="w-4 h-4 mr-2" /> Tambah Kategori
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Kategori" : "Tambah Kategori Baru"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label>Nama Kategori *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="mis. Reguler, VIP, Plus"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Deskripsi</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Penjelasan singkat kategori ini..."
                    rows={3}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Parent Kategori</Label>
                  <Select
                    value={form.parent_id || "__none__"}
                    onValueChange={(v) => setForm({ ...form, parent_id: v === "__none__" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tanpa parent (root)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Tanpa parent (root) —</SelectItem>
                      {rootCategories
                        .filter((c) => c.id !== editing?.id)
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Urutan Tampil</Label>
                    <Input
                      type="number"
                      value={form.sort_order}
                      onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                      min={0}
                    />
                  </div>
                  <div className="space-y-1.5 flex flex-col justify-end">
                    <div className="flex items-center gap-3 pb-2">
                      <Switch
                        checked={form.is_active}
                        onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                        id="is_active"
                      />
                      <Label htmlFor="is_active">Aktif</Label>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="show_extra_hotels" className="font-medium">Hotel Tambahan</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Tampilkan pilihan hotel tambahan saat paket menggunakan kategori ini
                      </p>
                    </div>
                    <Switch
                      id="show_extra_hotels"
                      checked={form.show_extra_hotels}
                      onCheckedChange={(v) => setForm({ ...form, show_extra_hotels: v })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                  <Button type="submit" className="gradient-gold text-primary" disabled={saving}>
                    {saving ? "Menyimpan..." : "Simpan"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Tag className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>{search ? "Kategori tidak ditemukan" : "Belum ada kategori"}</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Kategori</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="w-20 text-center">Urutan</TableHead>
                <TableHead className="w-32 text-center">Hotel Tambahan</TableHead>
                <TableHead className="w-24 text-center">Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium">
                      {cat.parent_id && (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                      {cat.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {(cat.parent as any)?.name || <span className="italic opacity-50">Root</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {cat.description || "—"}
                  </TableCell>
                  <TableCell className="text-center text-sm">{cat.sort_order ?? 0}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={cat.show_extra_hotels ? "default" : "secondary"} className="text-xs">
                      {cat.show_extra_hotels ? "Ya" : "Tidak"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <Switch
                        checked={cat.is_active ?? true}
                        onCheckedChange={() => handleToggleActive(cat)}
                        className="scale-90"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)} title="Edit">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => requestDelete(cat.id)} title="Hapus">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-4 text-sm text-muted-foreground">
        {filtered.length} kategori · {categories.filter((c) => c.is_active).length} aktif
      </div>
    </div>
  );
};

export default AdminPackageCategories;
