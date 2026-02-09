import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Image as ImageIcon, Upload, Loader2, GripVertical, Settings } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "umroh",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch gallery images
    const { data: galleryData } = await supabase
      .from("gallery")
      .select("*")
      .order("sort_order", { ascending: true });

    if (galleryData) {
      setImages(galleryData);
    }

    // Fetch background pattern setting
    const { data: settingsData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "background_pattern")
      .single();

    if (settingsData?.value) {
      setBackgroundPattern(settingsData.value);
    }

    setLoading(false);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        if (!file.type.startsWith("image/")) {
          toast({
            title: "File tidak valid",
            description: `${file.name} bukan file gambar`,
            variant: "destructive",
          });
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "File terlalu besar",
            description: `${file.name} melebihi 5MB`,
            variant: "destructive",
          });
          continue;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("gallery")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("gallery")
          .getPublicUrl(fileName);

        // Insert into gallery table
        const { error: insertError } = await supabase.from("gallery").insert({
          image_url: publicUrl,
          title: form.title || null,
          description: form.description || null,
          category: form.category,
          sort_order: images.length + i,
        });

        if (insertError) {
          console.error("Insert error:", insertError);
        }
      }

      toast({
        title: "Upload berhasil",
        description: `${files.length} gambar berhasil diupload`,
      });

      fetchData();
      setIsOpen(false);
      setForm({ title: "", description: "", category: "umroh" });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Gagal upload",
        description: "Terjadi kesalahan saat upload gambar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (id: string, imageUrl: string) => {
    if (!confirm("Yakin ingin menghapus gambar ini?")) return;

    // Extract filename from URL
    const fileName = imageUrl.split("/").pop();

    // Delete from storage
    if (fileName) {
      await supabase.storage.from("gallery").remove([fileName]);
    }

    // Delete from database
    const { error } = await supabase.from("gallery").delete().eq("id", id);

    if (error) {
      toast({
        title: "Gagal menghapus",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Gambar dihapus" });
      fetchData();
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("gallery")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (!error) {
      fetchData();
      toast({ title: currentStatus ? "Gambar dinonaktifkan" : "Gambar diaktifkan" });
    }
  };

  const handleSaveBackgroundPattern = async () => {
    setSavingPattern(true);

    const { error } = await supabase
      .from("settings")
      .upsert({ key: "background_pattern", value: backgroundPattern }, { onConflict: "key" });

    if (error) {
      toast({
        title: "Gagal menyimpan",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Background pattern disimpan" });
    }

    setSavingPattern(false);
  };

  const backgroundPatterns = [
    { value: "islamic", label: "Islamic Pattern", preview: "islamic-pattern" },
    { value: "dots", label: "Dots Pattern", preview: "bg-dots-pattern" },
    { value: "grid", label: "Grid Pattern", preview: "bg-grid-pattern" },
    { value: "none", label: "Tanpa Pattern", preview: "" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <ImageIcon className="w-6 h-6 text-gold" />
          Galeri
        </h1>
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
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Judul gambar"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Deskripsi (opsional)</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Deskripsi gambar"
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div>
                <Label>Kategori</Label>
                <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-1 h-24 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Mengupload...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Klik untuk memilih gambar (bisa pilih beberapa)
                      </span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
                  backgroundPattern === pattern.value
                    ? "border-gold bg-gold/10"
                    : "border-border hover:border-gold/50"
                }`}
                onClick={() => setBackgroundPattern(pattern.value)}
              >
                <div
                  className={`w-24 h-16 rounded bg-primary ${pattern.preview}`}
                />
                <p className="text-sm text-center mt-2 font-medium">{pattern.label}</p>
              </div>
            ))}
          </div>
          <Button
            onClick={handleSaveBackgroundPattern}
            className="mt-4 gradient-gold text-primary"
            disabled={savingPattern}
          >
            {savingPattern ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Simpan Pattern"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Gallery Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Belum ada gambar. Upload gambar pertama Anda!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className={`relative group rounded-xl overflow-hidden border-2 ${
                image.is_active ? "border-transparent" : "border-destructive/50 opacity-50"
              }`}
            >
              <div className="aspect-square">
                <img
                  src={image.image_url}
                  alt={image.title || "Gallery image"}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Overlay actions */}
              <div className="absolute inset-0 bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => handleToggleActive(image.id, image.is_active)}
                >
                  <Switch checked={image.is_active} />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => handleDelete(image.id, image.image_url)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Info */}
              {image.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/80 to-transparent p-2">
                  <p className="text-primary-foreground text-xs font-medium truncate">{image.title}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminGallery;
