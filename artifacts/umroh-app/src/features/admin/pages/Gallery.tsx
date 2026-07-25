import { useEffect, useState, useRef } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { supabase } from "@/shared/integrations/supabase/client";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Switch } from "@/shared/components/ui/switch";
import { useToast } from "@/shared/hooks/use-toast";
import { Plus, Trash2, Image as ImageIcon, Upload, Loader2, Settings, CheckSquare, Square, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";

interface GalleryItem {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  category: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const AdminGallery = () => {
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [backgroundPattern, setBackgroundPattern] = useState("islamic");
  const [savingPattern, setSavingPattern] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single delete
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; imageUrl: string } | null>(null);

  // Multi-select state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "umroh",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: galleryData } = await apiFetch<{ data: GalleryItem[] }>("/api/admin/content/gallery");
    if (galleryData) setImages(galleryData || []);

    const { data: settingsData } = await apiFetch<{ data: any[] }>("/api/admin/settings");
    const pattern = settingsData?.find((s: any) => s.key === "background_pattern")?.value;
    if (pattern) setBackgroundPattern(pattern);

    setLoading(false);
  };

  // ── Toggle select mode ──────────────────────────────────────────────────────

  const enterSelectMode = () => {
    setSelectMode(true);
    setSelected(new Set());
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(images.map((i) => i.id)));
  const deselectAll = () => setSelected(new Set());

  // ── Bulk delete ─────────────────────────────────────────────────────────────

  const executeBulkDelete = async () => {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    setConfirmBulkDelete(false);
    try {
      await apiFetch("/api/admin/content/gallery/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      toast({ title: `${selected.size} gambar dihapus` });
      setSelected(new Set());
      setSelectMode(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
    } finally {
      setBulkDeleting(false);
    }
  };

  // ── Single delete ───────────────────────────────────────────────────────────

  const handleDelete = (id: string, imageUrl: string) => {
    setDeleteTarget({ id, imageUrl });
  };

  const executeGalleryDelete = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeleteTarget(null);
    try {
      await apiFetch(`/api/admin/content/gallery/${id}`, { method: "DELETE" });
      toast({ title: "Gambar dihapus" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
    }
  };

  // ── Upload ──────────────────────────────────────────────────────────────────

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) {
          toast({ title: "File tidak valid", description: `${file.name} bukan file gambar`, variant: "destructive" });
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast({ title: "File terlalu besar", description: `${file.name} melebihi 5MB`, variant: "destructive" });
          continue;
        }
        const fileExt = file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `gallery/${fileName}`;
        const { error: uploadError } = await supabase.storage.from("cms-images").upload(filePath, file);
        if (uploadError) {
          toast({ title: "Gagal mengupload", description: `${file.name}: ${uploadError.message}`, variant: "destructive" });
          continue;
        }
        const { data: { publicUrl } } = supabase.storage.from("cms-images").getPublicUrl(filePath);
        await apiFetch("/api/admin/content/gallery", {
          method: "POST",
          body: JSON.stringify({ title: form.title || null, description: form.description || null, image_url: publicUrl, category: form.category, sort_order: images.length, is_active: true }),
        });
      }
      toast({ title: "Gambar berhasil diupload" });
      setForm({ title: "", description: "", category: "umroh" });
      setIsOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Gagal mengupload gambar", description: error?.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await apiFetch(`/api/admin/content/gallery/${id}`, { method: "PATCH", body: JSON.stringify({ is_active: !currentStatus }) });
      fetchData();
      toast({ title: currentStatus ? "Gambar dinonaktifkan" : "Gambar diaktifkan" });
    } catch {
      toast({ title: "Gagal", variant: "destructive" });
    }
  };

  const handleSaveBackgroundPattern = async () => {
    setSavingPattern(true);
    try {
      const { data: settings } = await apiFetch<{ data: any[] }>("/api/admin/settings");
      const existing = settings?.find((s: any) => s.key === "background_pattern");
      if (existing) {
        await apiFetch(`/api/admin/settings/${existing.id}`, { method: "PATCH", body: JSON.stringify({ value: backgroundPattern }) });
      } else {
        await apiFetch("/api/admin/settings", { method: "POST", body: JSON.stringify({ key: "background_pattern", value: backgroundPattern }) });
      }
      toast({ title: "Background pattern disimpan" });
    } catch (error: any) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    }
    setSavingPattern(false);
  };

  const backgroundPatterns = [
    { value: "islamic", label: "Islamic Pattern", preview: "islamic-pattern" },
    { value: "dots", label: "Dots Pattern", preview: "bg-dots-pattern" },
    { value: "grid", label: "Grid Pattern", preview: "bg-grid-pattern" },
    { value: "none", label: "Tanpa Pattern", preview: "" },
  ];

  const allSelected = images.length > 0 && selected.size === images.length;

  return (
    <div className="space-y-6">
      {/* Single delete confirmation */}
      <DeleteAlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={executeGalleryDelete}
        title="Hapus Gambar?"
      />

      {/* Bulk delete confirmation */}
      <DeleteAlertDialog
        open={confirmBulkDelete}
        onOpenChange={setConfirmBulkDelete}
        onConfirm={executeBulkDelete}
        title={`Hapus ${selected.size} Gambar?`}
        description={`${selected.size} gambar yang dipilih akan dihapus permanen dan tidak bisa dikembalikan.`}
      />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <ImageIcon className="w-6 h-6 text-gold" />
          Galeri
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {!selectMode ? (
            <>
              <Button variant="outline" onClick={enterSelectMode} className="gap-2">
                <CheckSquare className="w-4 h-4" />
                Pilih Banyak
              </Button>
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-gold text-primary">
                    <Plus className="w-4 h-4 mr-2" /> Upload Gambar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Gambar Baru</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Judul (opsional)</Label>
                      <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Judul gambar" className="mt-1" />
                    </div>
                    <div>
                      <Label>Deskripsi (opsional)</Label>
                      <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi gambar" className="mt-1" rows={2} />
                    </div>
                    <div>
                      <Label>Kategori</Label>
                      <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="umroh">Umroh</SelectItem>
                          <SelectItem value="haji">Haji</SelectItem>
                          <SelectItem value="makkah">Makkah</SelectItem>
                          <SelectItem value="madinah">Madinah</SelectItem>
                          <SelectItem value="other">Lainnya</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Pilih Gambar</Label>
                      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                      <Button type="button" variant="outline" className="w-full mt-1 h-24 border-dashed" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        {uploading ? (
                          <div className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /><span>Mengupload...</span></div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="w-8 h-8 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Klik untuk memilih gambar (bisa pilih beberapa)</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            /* ── Select mode toolbar ── */
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" size="sm" onClick={allSelected ? deselectAll : selectAll} className="gap-1.5 text-sm">
                {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                {allSelected ? "Batal Pilih Semua" : "Pilih Semua"}
              </Button>
              {selected.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmBulkDelete(true)}
                  disabled={bulkDeleting}
                  className="gap-1.5"
                >
                  {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Hapus {selected.size} Gambar
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={exitSelectMode} className="gap-1.5">
                <X className="w-4 h-4" /> Batal
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Select mode hint banner */}
      {selectMode && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 text-sm text-primary flex items-center gap-2">
          <CheckSquare className="w-4 h-4 shrink-0" />
          {selected.size === 0
            ? "Klik gambar untuk memilih. Pilih beberapa gambar lalu hapus sekaligus."
            : `${selected.size} dari ${images.length} gambar dipilih.`}
        </div>
      )}

      {/* Background Pattern Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Pengaturan Background Pattern
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {backgroundPatterns.map((pattern) => (
              <div
                key={pattern.value}
                className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                  backgroundPattern === pattern.value ? "border-gold bg-gold/10" : "border-border hover:border-gold/50"
                }`}
                onClick={() => setBackgroundPattern(pattern.value)}
              >
                <div className={`w-24 h-16 rounded bg-primary ${pattern.preview}`} />
                <p className="text-sm text-center mt-2 font-medium">{pattern.label}</p>
              </div>
            ))}
          </div>
          <Button onClick={handleSaveBackgroundPattern} className="mt-4 gradient-gold text-primary" disabled={savingPattern}>
            {savingPattern ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</> : "Simpan Pattern"}
          </Button>
        </CardContent>
      </Card>

      {/* Gallery Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold" />
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Belum ada gambar. Upload gambar pertama Anda!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {images.map((image) => {
            const isSelected = selected.has(image.id);
            return (
              <div
                key={image.id}
                onClick={() => selectMode && toggleSelect(image.id)}
                className={`relative group rounded-xl overflow-hidden border-2 transition-all ${
                  selectMode ? "cursor-pointer" : ""
                } ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/40"
                    : image.is_active
                    ? "border-transparent"
                    : "border-destructive/50 opacity-50"
                }`}
              >
                <div className="aspect-square">
                  <img src={image.image_url} alt={image.title || "Gallery image"} className="w-full h-full object-cover" />
                </div>

                {/* Select mode: checkbox indicator */}
                {selectMode && (
                  <div className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shadow ${
                    isSelected ? "bg-primary border-primary text-primary-foreground" : "bg-white/80 border-white"
                  }`}>
                    {isSelected && (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                )}

                {/* Normal mode: hover actions */}
                {!selectMode && (
                  <div className="absolute inset-0 bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="icon" variant="secondary" onClick={() => handleToggleActive(image.id, image.is_active)}>
                      <Switch checked={image.is_active} />
                    </Button>
                    <Button size="icon" variant="destructive" onClick={() => handleDelete(image.id, image.image_url)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Title overlay */}
                {image.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/80 to-transparent p-2">
                    <p className="text-primary-foreground text-xs font-medium truncate">{image.title}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminGallery;
