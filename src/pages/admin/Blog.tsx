import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, Image, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import DeleteAlertDialog from "@/components/admin/DeleteAlertDialog";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import RichTextEditor from "@/components/ui/rich-text-editor";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image_url: string;
  category: string;
  author: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  seo_title: string;
  seo_description: string;
}

const AdminBlog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    image_url: "",
    category: "",
    author: "",
    seo_title: "",
    seo_description: "",
    is_published: false,
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    setPosts((data || []) as BlogPost[]);
    setLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("blog")
      .upload(fileName, file);

    if (uploadError) {
      toast({ title: "Gagal upload", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: publicData } = supabase.storage.from("blog").getPublicUrl(fileName);
    setForm({ ...form, image_url: publicData.publicUrl });
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const slug = form.slug || form.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const payload = {
      ...form,
      slug,
      published_at: form.is_published ? new Date().toISOString() : null,
    };

    if (editing) {
      const { error } = await supabase
        .from("blog_posts")
        .update(payload)
        .eq("id", editing.id);

      if (error) {
        toast({ title: "Gagal mengupdate", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Artikel diupdate!" });
        fetchPosts();
        setIsOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase.from("blog_posts").insert(payload);

      if (error) {
        toast({ title: "Gagal membuat artikel", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Artikel ditambahkan!" });
        fetchPosts();
        setIsOpen(false);
        resetForm();
      }
    }
  };

  const handleEdit = (post: BlogPost) => {
    setEditing(post);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content || "",
      image_url: post.image_url || "",
      category: post.category || "",
      author: post.author || "",
      seo_title: post.seo_title || "",
      seo_description: post.seo_description || "",
      is_published: post.is_published,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeleteTargetId(id);
  };

  const executeDelete = async (id: string) => {
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Artikel dihapus" });
      fetchPosts();
    }
  };

  const togglePublish = async (post: BlogPost) => {
    const { error } = await supabase
      .from("blog_posts")
      .update({
        is_published: !post.is_published,
        published_at: !post.is_published ? new Date().toISOString() : null,
      })
      .eq("id", post.id);

    if (error) {
      toast({ title: "Gagal mengubah status", variant: "destructive" });
    } else {
      fetchPosts();
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      image_url: "",
      category: "",
      author: "",
      seo_title: "",
      seo_description: "",
      is_published: false,
    });
  };

  return (
    <div>
      <DeleteAlertDialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)} onConfirm={() => { if (deleteTargetId) executeDelete(deleteTargetId); setDeleteTargetId(null); }} title="Hapus Artikel?" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Blog / Artikel</h1>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-primary">
              <Plus className="w-4 h-4 mr-2" /> Tambah Artikel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Artikel" : "Tambah Artikel Baru"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label>Judul Artikel *</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Slug (URL)</Label>
                    <Input
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      placeholder="auto-generated jika kosong"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Kategori</Label>
                    <Input
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      placeholder="Tips Umroh, Panduan, dll"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Penulis</Label>
                    <Input
                      value={form.author}
                      onChange={(e) => setForm({ ...form, author: e.target.value })}
                      placeholder="Nama penulis"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Gambar Utama</Label>
                    <div className="mt-1 space-y-2">
                      {form.image_url && (
                        <img src={form.image_url} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                      )}
                      <div className="flex gap-2">
                        <Input
                          value={form.image_url}
                          onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                          placeholder="URL gambar"
                          className="flex-1"
                        />
                        <Button type="button" variant="outline" asChild disabled={uploading}>
                          <label className="cursor-pointer">
                            <Image className="w-4 h-4 mr-1" />
                            {uploading ? "..." : "Upload"}
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                          </label>
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label>Excerpt / Ringkasan</Label>
                    <Textarea
                      value={form.excerpt}
                      onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                      className="mt-1"
                      rows={3}
                      placeholder="Ringkasan singkat artikel"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Konten Artikel</Label>
                <div className="mt-1">
                  <RichTextEditor
                    content={form.content}
                    onChange={(content) => setForm({ ...form, content })}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">SEO Settings</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>SEO Title</Label>
                    <Input
                      value={form.seo_title}
                      onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                      placeholder="Title untuk mesin pencari"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>SEO Description</Label>
                    <Textarea
                      value={form.seo_description}
                      onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                      placeholder="Deskripsi untuk mesin pencari"
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t pt-4">
                <Switch
                  checked={form.is_published}
                  onCheckedChange={(checked) => setForm({ ...form, is_published: checked })}
                />
                <Label>Publikasikan artikel</Label>
              </div>

              <div className="flex justify-end gap-2">
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
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Belum ada artikel</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gambar</TableHead>
                <TableHead>Judul</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    {post.image_url ? (
                      <img src={post.image_url} alt={post.title} className="w-16 h-12 object-cover rounded" />
                    ) : (
                      <div className="w-16 h-12 bg-muted rounded flex items-center justify-center">
                        <Image className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold max-w-xs truncate">{post.title}</TableCell>
                  <TableCell>{post.category || "-"}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(post.created_at), "d MMM yy", { locale: idLocale })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={post.is_published}
                      onCheckedChange={() => togglePublish(post)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link to={`/blog/${post.slug}`} target="_blank">
                        <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                      </Link>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(post)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)}>
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

export default AdminBlog;
