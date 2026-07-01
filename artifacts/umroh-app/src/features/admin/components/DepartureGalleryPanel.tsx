import { useEffect, useState } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { toast } from "sonner";
import { Upload, Trash2, Image as ImageIcon, Loader2, X } from "lucide-react";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";

type GalleryItem = {
  id: string;
  departure_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
};

interface Props {
  departureId: string;
  departureLabel: string;
}

const DepartureGalleryPanel = ({ departureId, departureLabel }: Props) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [toDelete, setToDelete] = useState<GalleryItem | null>(null);

  useEffect(() => {
    loadItems();
  }, [departureId]);

  const loadItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("departure_gallery")
      .select("*")
      .eq("departure_id", departureId)
      .order("sort_order", { ascending: true });
    setItems((data as any) || []);
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!file) return void toast.error("Pilih file terlebih dahulu");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `departures/${departureId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("gallery").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("gallery").getPublicUrl(path);
      const { error } = await supabase.from("departure_gallery").insert({
        departure_id: departureId,
        image_url: pub.publicUrl,
        caption: caption || null,
        sort_order: items.length,
      });
      if (error) throw error;
      toast.success("Foto berhasil diupload");
      setFile(null);
      setCaption("");
      loadItems();
    } catch (e: any) {
      toast.error(e.message || "Gagal upload foto");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("departure_gallery").delete().eq("id", toDelete.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Foto dihapus");
      loadItems();
    }
    setToDelete(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground font-medium">{departureLabel}</p>
      </div>

      <div className="bg-muted/40 rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium">Upload Foto Baru</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">File Foto</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-xs h-9"
              />
              {file && (
                <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => setFile(null)}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
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
          <Button onClick={handleUpload} disabled={uploading || !file} size="sm" className="gradient-gold text-primary">
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Upload
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">Belum ada foto untuk keberangkatan ini</p>
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium mb-3 text-muted-foreground">{items.length} foto</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items.map((it) => (
              <div key={it.id} className="relative group rounded-lg overflow-hidden border bg-muted">
                <img
                  src={it.image_url}
                  alt={it.caption || "foto keberangkatan"}
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
                  <div className="px-2 py-1.5 text-xs truncate bg-background border-t">{it.caption}</div>
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
        description="Foto akan dihapus permanen dari galeri keberangkatan."
      />
    </div>
  );
};

export default DepartureGalleryPanel;
