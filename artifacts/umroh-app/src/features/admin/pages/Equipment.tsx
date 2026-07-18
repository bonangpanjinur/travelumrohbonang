import { useEffect, useState, useRef } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { useToast } from "@/shared/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, Package, Upload, Loader2, X } from "lucide-react";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";
import AdminPagination from "@/features/admin/components/AdminPagination";
import { useAdminPagination } from "@/features/admin/hooks/useAdminPagination";

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
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", category: "", description: "", imageUrl: "" });
  const [uploadingImg, setUploadingImg] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.category ?? "").toLowerCase().includes(q) ||
      (item.description ?? "").toLowerCase().includes(q)
    );
  });

  const { page, setPage, totalPages, totalCount, paginatedItems, pageSize, resetPage } =
    useAdminPagination(filtered);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleSearchChange = (v: string) => { setSearch(v); resetPage(); };

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
    if (imgInputRef.current) imgInputRef.current.value = "";
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch<{ url: string }>("/api/admin/uploads/image", {
        method: "POST",
        body: fd,
      });
      setForm((prev) => ({ ...prev, imageUrl: res.url }));
      toast({ title: "Gambar berhasil diupload" });
    } catch (err: any) {
      toast({ title: "Gagal upload gambar", description: err?.message, variant: "destructive" });
    } finally {
      setUploadingImg(false);
      if (imgInputRef.current) imgInputRef.current.value = "";
    }
  };

  return (
    <div>
      <DeleteAlertDialog
        open={!!deleteTargetId}
        onOpenChange={() => setDeleteTargetId(null)}
        onConfirm={() => { if (deleteTargetId) executeDelete(deleteTargetId); setDeleteTargetId(null); }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-display font-bold">Perlengkapan</h1>
        <div className="flex gap-3 items-center w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau kategori..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
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
                  <Label>Gambar Perlengkapan (opsional)</Label>
                  <input
                    ref={imgInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                  />
                  <div className="mt-1 space-y-2">
                    <div className="flex gap-2 items-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingImg}
                        onClick={() => imgInputRef.current?.click()}
                      >
                        {uploadingImg
                          ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          : <Upload className="w-4 h-4 mr-1" />}
                        {uploadingImg ? "Mengupload..." : "Pilih Gambar"}
                      </Button>
                      {form.imageUrl && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, imageUrl: "" })}>
                          <X className="w-4 h-4" /> Hapus
                        </Button>
                      )}
                    </div>
                    <Input
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      placeholder="Atau tempel URL gambar langsung..."
                      className="text-sm"
                    />
                    {form.imageUrl && (
                      <img src={form.imageUrl} alt="Preview" className="rounded-lg object-cover h-28 w-full border" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                  <Button type="submit" className="gradient-gold text-primary">Simpan</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Belum ada data perlengkapan</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          Tidak ada perlengkapan yang cocok dengan "{search}"
        </div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Perlengkapan</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold">{item.name}</TableCell>
                    <TableCell>
                      {item.category ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                          {item.category}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                      {item.description || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <AdminPagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};

export default AdminEquipment;
