import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, User, Phone, Search, ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Muthawif {
  id: string;
  name: string;
  phone: string | null;
  photo_url: string | null;
  created_at: string;
}

const Muthawifs = () => {
  const [muthawifs, setMuthawifs] = useState<Muthawif[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMuthawif, setSelectedMuthawif] = useState<Muthawif | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    photo_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchMuthawifs = async () => {
    const { data, error } = await supabase
      .from("muthawifs")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      toast.error("Gagal memuat data muthawif");
      return;
    }

    setMuthawifs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMuthawifs();
  }, []);

  const filteredMuthawifs = muthawifs.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.phone?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreateDialog = () => {
    setSelectedMuthawif(null);
    setFormData({ name: "", phone: "", photo_url: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (muthawif: Muthawif) => {
    setSelectedMuthawif(muthawif);
    setFormData({
      name: muthawif.name,
      phone: muthawif.phone || "",
      photo_url: muthawif.photo_url || "",
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (muthawif: Muthawif) => {
    setSelectedMuthawif(muthawif);
    setDeleteDialogOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file);

    if (uploadError) {
      toast.error("Gagal upload foto");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    setFormData({ ...formData, photo_url: urlData.publicUrl });
    setUploading(false);
    toast.success("Foto berhasil diupload");
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Nama muthawif wajib diisi");
      return;
    }

    setSaving(true);

    if (selectedMuthawif) {
      // Update
      const { error } = await supabase
        .from("muthawifs")
        .update({
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          photo_url: formData.photo_url || null,
        })
        .eq("id", selectedMuthawif.id);

      if (error) {
        toast.error("Gagal menyimpan perubahan");
        setSaving(false);
        return;
      }

      toast.success("Muthawif berhasil diperbarui");
    } else {
      // Create
      const { error } = await supabase.from("muthawifs").insert({
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        photo_url: formData.photo_url || null,
      });

      if (error) {
        toast.error("Gagal menambah muthawif");
        setSaving(false);
        return;
      }

      toast.success("Muthawif berhasil ditambahkan");
    }

    setSaving(false);
    setDialogOpen(false);
    fetchMuthawifs();
  };

  const handleDelete = async () => {
    if (!selectedMuthawif) return;

    const { error } = await supabase
      .from("muthawifs")
      .delete()
      .eq("id", selectedMuthawif.id);

    if (error) {
      toast.error("Gagal menghapus muthawif");
      return;
    }

    toast.success("Muthawif berhasil dihapus");
    setDeleteDialogOpen(false);
    fetchMuthawifs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Manajemen Muthawif
          </h1>
          <p className="text-muted-foreground">
            Kelola data pembimbing ibadah umroh
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gradient-gold text-primary">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Muthawif
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama atau nomor telepon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : filteredMuthawifs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {search ? "Tidak ada muthawif ditemukan" : "Belum ada data muthawif"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Foto</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMuthawifs.map((muthawif) => (
                <TableRow key={muthawif.id}>
                  <TableCell>
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={muthawif.photo_url || ""} alt={muthawif.name} />
                      <AvatarFallback className="bg-accent text-accent-foreground">
                        {muthawif.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{muthawif.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {muthawif.phone || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditDialog(muthawif)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openDeleteDialog(muthawif)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedMuthawif ? "Edit Muthawif" : "Tambah Muthawif Baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Photo */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={formData.photo_url} />
                <AvatarFallback className="bg-accent text-accent-foreground text-2xl">
                  {formData.name.charAt(0).toUpperCase() || <User className="w-8 h-8" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                  disabled={uploading}
                />
                <Label htmlFor="photo-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {uploading ? "Uploading..." : "Upload Foto"}
                    </span>
                  </Button>
                </Label>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                <User className="w-4 h-4 inline mr-2" />
                Nama Muthawif <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Masukkan nama lengkap"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                <Phone className="w-4 h-4 inline mr-2" />
                Nomor Telepon
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Contoh: 081234567890"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gradient-gold text-primary"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Muthawif</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus muthawif "{selectedMuthawif?.name}"?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Muthawifs;
