import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FileText, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import RichTextEditor from "@/components/ui/rich-text-editor";

interface Page {
  id: string;
  slug: string;
  title: string | null;
  content: string | null;
  seo_title: string | null;
  seo_description: string | null;
  is_active: boolean;
  created_at: string;
}

const AdminPages = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Page | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    slug: "",
    title: "",
    content: "",
    seo_title: "",
    seo_description: "",
    is_active: true,
  });

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    const { data } = await supabase
      .from("pages")
      .select("*")
      .order("created_at", { ascending: false });
    setPages((data as Page[]) || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const slug = form.slug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    if (editing) {
      const { error } = await supabase
        .from("pages")
        .update({
          slug,
          title: form.title || null,
          content: form.content || null,
          seo_title: form.seo_title || null,
          seo_description: form.seo_description || null,
          is_active: form.is_active,
        })
        .eq("id", editing.id);

      if (error) {
        toast({ title: "Gagal mengupdate", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Halaman diupdate!" });
        fetchPages();
        setIsOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase.from("pages").insert({
        slug,
        title: form.title || null,
        content: form.content || null,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
        is_active: form.is_active,
      });

      if (error) {
        toast({ title: "Gagal membuat halaman", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Halaman ditambahkan!" });
        fetchPages();
        setIsOpen(false);
        resetForm();
      }
    }
  };

  const handleEdit = (page: Page) => {
    setEditing(page);
    setForm({
      slug: page.slug,
      title: page.title || "",
      content: page.content || "",
      seo_title: page.seo_title || "",
      seo_description: page.seo_description || "",
      is_active: page.is_active,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus halaman ini?")) return;

    const { error } = await supabase.from("pages").delete().eq("id", id);
    if (error) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Halaman dihapus" });
      fetchPages();
    }
  };

  const handleToggleActive = async (page: Page) => {
    const { error } = await supabase
      .from("pages")
      .update({ is_active: !page.is_active })
      .eq("id", page.id);

    if (!error) {
      fetchPages();
      toast({ title: page.is_active ? "Halaman dinonaktifkan" : "Halaman diaktifkan" });
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      slug: "",
      title: "",
      content: "",
      seo_title: "",
      seo_description: "",
      is_active: true,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-gold" />
          Halaman CMS
        </h1>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-primary">
              <Plus className="w-4 h-4 mr-2" /> Tambah Halaman
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Halaman" : "Tambah Halaman Baru"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Slug (URL) *</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="contoh: faq, syarat-ketentuan"
                    required
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Akan menjadi: /{form.slug || "slug"}
                  </p>
                </div>
                <div>
                  <Label>Judul Halaman</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Judul yang ditampilkan"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Konten</Label>
                <div className="mt-1">
                  <RichTextEditor
                    content={form.content}
                    onChange={(content) => setForm({ ...form, content })}
                    placeholder="Tulis konten halaman di sini..."
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">SEO Settings</h3>
                <div className="space-y-3">
                  <div>
                    <Label>SEO Title</Label>
                    <Input
                      value={form.seo_title}
                      onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                      placeholder="Judul untuk mesin pencari"
                      className="mt-1"
                      maxLength={60}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {form.seo_title.length}/60 karakter
                    </p>
                  </div>
                  <div>
                    <Label>SEO Description</Label>
                    <textarea
                      value={form.seo_description}
                      onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                      placeholder="Deskripsi untuk mesin pencari"
                      className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      rows={2}
                      maxLength={160}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {form.seo_description.length}/160 karakter
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
                <Label>Aktifkan halaman</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                <Button type="submit" className="gradient-gold text-primary">Simpan</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Belum ada halaman. Buat halaman pertama Anda!</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Halaman</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>SEO</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-semibold">{page.title || "(Tanpa Judul)"}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">/{page.slug}</code>
                  </TableCell>
                  <TableCell>
                    {page.seo_title ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                        Not Set
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={page.is_active}
                      onCheckedChange={() => handleToggleActive(page)}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(page.created_at), "d MMM yyyy", { locale: localeId })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(page)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(page.id)}>
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

export default AdminPages;
