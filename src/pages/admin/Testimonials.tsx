import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, MessageSquare, Star, Upload, Loader2, User } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Testimonial {
  id: string;
  name: string;
  location: string | null;
  package_name: string | null;
  photo_url: string | null;
  rating: number;
  content: string;
  travel_date: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const AdminTestimonials = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    location: "",
    package_name: "",
    photo_url: "",
    rating: 5,
    content: "",
    travel_date: "",
    is_active: true,
  });

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    const { data } = await supabase
      .from("testimonials")
      .select("*")
      .order("sort_order", { ascending: true });
    setTestimonials(data || []);
    setLoading(false);
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "File tidak valid",
        description: "Silakan pilih file gambar",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File terlalu besar",
        description: "Ukuran maksimal 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("testimonials")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("testimonials")
        .getPublicUrl(fileName);

      setForm({ ...form, photo_url: publicUrl });
      toast({ title: "Foto berhasil diupload" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Gagal upload foto",
        description: "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: form.name,
      location: form.location || null,
      package_name: form.package_name || null,
      photo_url: form.photo_url || null,
      rating: form.rating,
      content: form.content,
      travel_date: form.travel_date || null,
      is_active: form.is_active,
    };

    if (editing) {
      const { error } = await supabase
        .from("testimonials")
        .update(payload)
        .eq("id", editing.id);

      if (error) {
        toast({ title: "Gagal mengupdate", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Testimoni diupdate!" });
        fetchTestimonials();
        setIsOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase.from("testimonials").insert({
        ...payload,
        sort_order: testimonials.length,
      });

      if (error) {
        toast({ title: "Gagal menambahkan", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Testimoni ditambahkan!" });
        fetchTestimonials();
        setIsOpen(false);
        resetForm();
      }
    }
  };

  const handleEdit = (testimonial: Testimonial) => {
    setEditing(testimonial);
    setForm({
      name: testimonial.name,
      location: testimonial.location || "",
      package_name: testimonial.package_name || "",
      photo_url: testimonial.photo_url || "",
      rating: testimonial.rating,
      content: testimonial.content,
      travel_date: testimonial.travel_date || "",
      is_active: testimonial.is_active,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus testimoni ini?")) return;

    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Testimoni dihapus" });
      fetchTestimonials();
    }
  };

  const handleToggleActive = async (testimonial: Testimonial) => {
    const { error } = await supabase
      .from("testimonials")
      .update({ is_active: !testimonial.is_active })
      .eq("id", testimonial.id);

    if (!error) {
      fetchTestimonials();
      toast({ title: testimonial.is_active ? "Testimoni dinonaktifkan" : "Testimoni diaktifkan" });
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      name: "",
      location: "",
      package_name: "",
      photo_url: "",
      rating: 5,
      content: "",
      travel_date: "",
      is_active: true,
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? "text-gold fill-gold" : "text-muted-foreground"}`}
      />
    ));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-gold" />
          Testimoni Jamaah
        </h1>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-primary">
              <Plus className="w-4 h-4 mr-2" /> Tambah Testimoni
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Testimoni" : "Tambah Testimoni Baru"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Photo Upload */}
              <div className="flex flex-col items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <Avatar className="w-24 h-24 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <AvatarImage src={form.photo_url} />
                  <AvatarFallback className="bg-muted">
                    {uploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <User className="w-8 h-8" />}
                  </AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Mengupload..." : "Upload Foto"}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nama Jamaah *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nama lengkap"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Asal Kota</Label>
                  <Input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Jakarta"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nama Paket</Label>
                  <Input
                    value={form.package_name}
                    onChange={(e) => setForm({ ...form, package_name: e.target.value })}
                    placeholder="Umroh Reguler"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Tanggal Perjalanan</Label>
                  <Input
                    type="date"
                    value={form.travel_date}
                    onChange={(e) => setForm({ ...form, travel_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Rating</Label>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setForm({ ...form, rating: star })}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= form.rating ? "text-gold fill-gold" : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Testimoni *</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Tulis testimoni jamaah..."
                  required
                  className="mt-1"
                  rows={4}
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
                <Label>Tampilkan di website</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" className="gradient-gold text-primary">
                  Simpan
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
        </div>
      ) : testimonials.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Belum ada testimoni. Tambahkan testimoni pertama!</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jamaah</TableHead>
                <TableHead>Testimoni</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testimonials.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={item.photo_url || undefined} />
                        <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.location} {item.package_name && `• ${item.package_name}`}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate text-sm">{item.content}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex">{renderStars(item.rating)}</div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={() => handleToggleActive(item)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
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
    </div>
  );
};

export default AdminTestimonials;
