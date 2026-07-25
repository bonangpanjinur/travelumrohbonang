import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { supabase } from "@/shared/integrations/supabase/client";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Image as ImageIcon, Loader2, X, Link2, Upload } from "lucide-react";
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

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='14' fill='%239ca3af'%3EGambar tidak tersedia%3C/text%3E%3C/svg%3E";

const PackageGalleryPanel = ({ packageId, packageTitle }: Props) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [toDelete, setToDelete] = useState<GalleryItem | null>(null);
  const [inputMode, setInputMode] = useState<"url" | "file">("url");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  /** Upload all selected files to Supabase Storage and save each to DB */
  const handleUploadFiles = async () => {
    if (files.length === 0) return;
    setUploading(true);
    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Mengupload ${i + 1}/${files.length}…`);
      try {
        const ext = file.name.split(".").pop();
        const path = `packages/${packageId}/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("gallery")
          .upload(path, file);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage
          .from("gallery")
          .getPublicUrl(path);
        await apiFetch("/api/admin/gallery/package", {
          method: "POST",
          body: JSON.stringify({
            package_id: packageId,
            image_url: pub.publicUrl,
            caption: caption.trim() || null,
            sort_order: items.length + i,
          }),
        });
        successCount++;
      } catch (e: any) {
        toast.error(`Gagal upload "${file.name}": ${e.message ?? "error"}`);
      }
    }
    setUploading(false);
    setUploadProgress("");
    if (successCount > 0) {
      toast.success(
        successCount === files.length
          ? `${successCount} foto berhasil diupload`
          : `${successCount} dari ${files.length} foto berhasil diupload`,
      );
      setFiles([]);
      setCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadItems();
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
    if (inputMode === "file") {
      await handleUploadFiles();
    } else {
      await saveItem(imageUrl);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await apiFetch(`/api/admin/gallery/package/${toDelete.id}`, {
        method: "DELETE",
      });
      toast.success("Foto dihapus");
      loadItems();
    } catch (e: any) {
      toast.error(e.message);
    }
    setToDelete(null);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
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

        {inputMode === "url" ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
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
        ) : (
          <div className="space-y-3">
            {/* File picker */}
            <div className="space-y-1">
              <Label className="text-xs">
                File Foto{" "}
                <span className="text-muted-foreground font-normal">
                  (bisa pilih lebih dari 1)
                </span>
              </Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  setFiles((prev) => [...prev, ...picked]);
                }}
                className="text-xs h-9"
              />
            </div>

            {/* Selected file chips */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 bg-background border border-border rounded-full px-3 py-1 text-xs"
                  >
                    {f.name}
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Caption (shared for all files in batch) */}
            <div className="space-y-1">
              <Label className="text-xs">Caption (opsional, berlaku untuk semua foto)</Label>
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Keterangan foto"
                className="h-9"
              />
            </div>
          </div>
        )}

        <Button
          onClick={handleAdd}
          disabled={
            saving ||
            uploading ||
            (inputMode === "url" ? !imageUrl.trim() : files.length === 0)
          }
          size="sm"
          className="gradient-gold text-primary gap-1.5"
        >
          {saving || uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {uploadProgress || "Menyimpan…"}
            </>
          ) : (
            <>
              {inputMode === "file" ? (
                <Upload className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {inputMode === "file" && files.length > 1
                ? `Upload ${files.length} Foto`
                : "Tambah Foto"}
            </>
          )}
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
          <p className="text-xs mt-1">
            Tambahkan foto untuk ditampilkan di halaman detail paket
          </p>
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium mb-3 text-muted-foreground">
            {items.length} foto
          </p>
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
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PLACEHOLDER;
                  }}
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
