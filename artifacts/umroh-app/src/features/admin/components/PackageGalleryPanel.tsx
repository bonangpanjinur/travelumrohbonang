import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Image as ImageIcon, Loader2, X, Link2 } from "lucide-react";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";

type GalleryItem = {
  id: string;
  package_id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
};

interface Props {
  packageId: string;
  packageTitle: string;
}

const PackageGalleryPanel = ({ packageId, packageTitle }: Props) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<GalleryItem | null>(null);
  const [inputMode, setInputMode] = useState<"url" | "file">("url");

  useEffect(() => {
    loadItems();
  }, [packageId]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: GalleryItem[] }>(
        `/api/admin/gallery/package/${packageId}`,
      );
      setItems(res.data || []);
    } catch {
      toast.error("Gagal memuat galeri");
    }
    setLoading(false);
  };

  const handleUploadFile = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", `packages/${packageId}`);
      const data = await apiFetch<{ url: string; imageUrl?: string; image_url?: string }>(
        "/api/admin/uploads/image",
        { method: "POST", body: formData },
      );
      await saveItem(data.url || data.imageUrl || data.image_url || "");
      setFile(null);
    } catch (e: any) {
      toast.error(e.message || "Gagal upload gambar");
    } finally {
      setUploading(false);
    }
  };

  const saveItem = async (url: string) => {
    if (!url.trim()) return void toast.error("URL foto tidak boleh kosong");
    setSaving(true);
    try {
      await apiFetch("/api/admin/gallery/package", {
        method: "POST",
        body: JSON.stringify({
          package_id: packageId,
          image_url: url.trim(),
          caption: caption.trim() || null,
          sort_order: items.length,
        }),
      });
      toast.success("Foto ditambahkan");
      setImageUrl("");
      setCaption("");
      loadItems();
    } catch (e: any) {
      toast.error(e.message || "Gagal menambah foto");
    }
    setSaving(false);
  };

  const handleAdd = async () => {
    if (inputMode === "file" && file) {
      await handleUploadFile();
    } else {
      await saveItem(imageUrl);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await apiFetch(`/api/admin/gallery/package/${toDelete.id}`, { method: "DELETE" });
      toast.success("Foto dihapus");
      loadItems();
    } catch (e: any) {
      toast.error(e.message);
    }
    setToDelete(null);
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground font-medium">{packageTitle}</p>

      {/* ── Add form ── */}
      <div className="bg-muted/40 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Tambah Foto</p>
          <div className="flex gap-1 p-0.5 bg-background rounded-md border border-border text-xs">
            <button
              type="button"
              onClick={() => setInputMode("url")}
              className={`px-2 py-1 rounded transition-all ${inputMode === "url" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              URL
            </button>
            <button
              type="button"
              onClick={() => setInputMode("file")}
              className={`px-2 py-1 rounded transition-all ${inputMode === "file" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Upload
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          {inputMode === "url" ? (
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs flex items-center gap-1">
                <Link2 className="w-3 h-3" /> URL Foto
              </Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="h-9"
              />
            </div>
          ) : (
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">File Foto</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="text-xs h-9"
                />
                {file && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    onClick={() => setFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Caption (opsional)</Label>
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Keterangan foto"
              className="h-9"
            />
          </div>
        </div>

        <Button
          onClick={handleAdd}
          disabled={saving || uploading || (inputMode === "url" ? !imageUrl.trim() : !file)}
          size="sm"
          className="gradient-gold text-primary gap-1.5"
        >
          {saving || uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Tambah Foto
        </Button>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
          <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">Belum ada foto untuk paket ini</p>
          <p className="text-xs mt-1">Tambahkan foto untuk ditampilkan di halaman detail paket</p>
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium mb-3 text-muted-foreground">{items.length} foto</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items.map((it) => (
              <div
                key={it.id}
                className="relative group rounded-lg overflow-hidden border border-border bg-muted"
              >
                <img
                  src={it.image_url}
                  alt={it.caption || "foto paket"}
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-start justify-end p-2">
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setToDelete(it)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {it.caption && (
                  <div className="px-2 py-1.5 text-xs truncate bg-background border-t">
                    {it.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <DeleteAlertDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={handleDelete}
        title="Hapus foto?"
        description="Foto akan dihapus permanen dari galeri paket."
      />
    </div>
  );
};

export default PackageGalleryPanel;
