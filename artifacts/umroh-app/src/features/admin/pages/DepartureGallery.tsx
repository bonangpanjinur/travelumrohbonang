import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { supabase } from "@/shared/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { toast } from "sonner";
import { Upload, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";

type Departure = { id: string; departure_date: string; package_id: string; packages?: { title: string } };
type GalleryItem = { id: string; departure_id: string; image_url: string; caption: string | null; created_at: string };

const AdminDepartureGallery = () => {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [toDelete, setToDelete] = useState<GalleryItem | null>(null);

  useEffect(() => {
    apiFetch<{ data: Departure[] }>("/api/admin/departures")
      .then((res) => {
        const data = res.data || [];
        setDepartures(data);
        if (data.length && !selectedId) setSelectedId(data[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadItems();
  }, [selectedId]);

  const loadItems = async () => {
    try {
      const res = await apiFetch<{ data: GalleryItem[] }>(`/api/admin/gallery/departure/${selectedId}`);
      setItems(res.data || []);
    } catch {
      toast.error("Gagal memuat galeri");
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedId) return void toast.error("Pilih file dan keberangkatan");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `departures/${selectedId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("gallery").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("gallery").getPublicUrl(path);
      
      await apiFetch("/api/admin/gallery", {
        method: "POST",
        body: JSON.stringify({
          departure_id: selectedId,
          image_url: pub.publicUrl,
          caption: caption || null,
        }),
      });
      
      toast.success("Foto diupload");
      setFile(null);
      setCaption("");
      loadItems();
    } catch (e: any) {
      toast.error(e.message || "Gagal upload");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await apiFetch(`/api/admin/gallery/${toDelete.id}`, { method: "DELETE" });
      toast.success("Foto dihapus");
      loadItems();
    } catch (e: any) {
      toast.error(e.message);
    }
    setToDelete(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Galeri per Keberangkatan</h1>
        <p className="text-muted-foreground text-sm">Upload foto per batch keberangkatan untuk dilihat jemaah.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pilih Keberangkatan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger><SelectValue placeholder="Pilih keberangkatan..." /></SelectTrigger>
            <SelectContent>
              {departures.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.packages?.title || "Paket"} — {format(new Date(d.departure_date), "dd MMM yyyy", { locale: localeId })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedId && (
            <div className="grid md:grid-cols-3 gap-3 items-end">
              <div className="space-y-1.5 md:col-span-1">
                <Label>File Foto</Label>
                <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <Label>Caption (opsional)</Label>
                <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Keterangan foto" />
              </div>
              <Button onClick={handleUpload} disabled={uploading || !file}>
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Upload
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Foto ({items.length})</CardTitle>
          <CardDescription>Watermark otomatis diterapkan saat ditampilkan ke jemaah.</CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
              Belum ada foto
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {items.map((it) => (
                <div key={it.id} className="relative group rounded-lg overflow-hidden border">
                  <img src={it.image_url} alt={it.caption || "foto"} className="w-full aspect-square object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-end p-2">
                    <Button
                      variant="destructive"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 ml-auto"
                      onClick={() => setToDelete(it)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {it.caption && (
                    <div className="p-2 text-xs truncate bg-background">{it.caption}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteAlertDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={handleDelete}
        title="Hapus foto?"
        description="Foto akan dihapus dari galeri keberangkatan."
      />
    </div>
  );
};

export default AdminDepartureGallery;
