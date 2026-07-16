import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { useToast } from "@/shared/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, Image, Calendar, Search as SearchIcon, ChevronUp, BarChart3, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";
import { id as idLocale } from "date-fns/locale";
import { safeFormatDate } from "@/lib/utils";
import RichTextEditor from "@/shared/components/ui/rich-text-editor";

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

// ── SEO Analysis Helpers ──────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

function countSentences(text: string): number {
  return text.replace(/<[^>]*>/g, " ").split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
}

function avgSentenceLength(text: string): number {
  const words = countWords(text);
  const sentences = countSentences(text);
  return sentences > 0 ? words / sentences : 0;
}

function readabilityScore(content: string): { score: number; label: string; color: string } {
  const words = countWords(content);
  if (words < 50) return { score: 0, label: "Terlalu pendek", color: "text-destructive" };
  const avgSent = avgSentenceLength(content);
  // Simple readability: lower avg sentence length = easier
  let score = 100 - Math.max(0, (avgSent - 10) * 5);
  score = Math.min(100, Math.max(0, score));
  const label = score >= 70 ? "Mudah dibaca" : score >= 40 ? "Cukup" : "Sulit dibaca";
  const color = score >= 70 ? "text-success" : score >= 40 ? "text-amber-500" : "text-destructive";
  return { score: Math.round(score), label, color };
}

function keywordDensity(content: string, keyword: string): number {
  if (!keyword) return 0;
  const plainText = content.replace(/<[^>]*>/g, " ").toLowerCase();
  const kw = keyword.toLowerCase();
  const words = plainText.split(/\s+/).filter(Boolean);
  const matches = words.filter((w) => w.includes(kw)).length;
  return words.length > 0 ? Math.round((matches / words.length) * 1000) / 10 : 0;
}

interface SEOAnalysisProps {
  title: string;
  seoTitle: string;
  seoDescription: string;
  content: string;
  slug: string;
}

const SEOAnalysisPanel = ({ title, seoTitle, seoDescription, content, slug }: SEOAnalysisProps) => {
  const [focusKeyword, setFocusKeyword] = useState("");

  const wordCount = useMemo(() => countWords(content), [content]);
  const readability = useMemo(() => readabilityScore(content), [content]);
  const density = useMemo(() => keywordDensity(content, focusKeyword), [content, focusKeyword]);

  const displayTitle = seoTitle || title;
  const titleLen = displayTitle.length;
  const descLen = seoDescription.length;

  const checks = [
    { label: "Jumlah kata artikel", ok: wordCount >= 300, detail: `${wordCount} kata (min. 300)` },
    { label: "SEO Title panjang ideal", ok: titleLen >= 30 && titleLen <= 60, detail: `${titleLen} karakter (ideal 30–60)` },
    { label: "Meta description ada", ok: descLen >= 50, detail: descLen > 0 ? `${descLen} karakter (ideal 50–160)` : "Belum diisi" },
    { label: "Slug URL ada", ok: !!slug, detail: slug ? `/${slug}` : "Belum ada slug" },
    {
      label: "Keyword density wajar",
      ok: !focusKeyword || (density >= 0.5 && density <= 3),
      detail: focusKeyword ? `${density}% (ideal 0.5%–3%)` : "Masukkan focus keyword",
    },
  ];

  const passedCount = checks.filter((c) => c.ok).length;

  return (
    <div className="space-y-4">
      {/* Score Summary */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-primary text-primary font-bold text-lg">
          {passedCount}/{checks.length}
        </div>
        <div>
          <p className="text-sm font-medium">SEO Score</p>
          <Progress value={(passedCount / checks.length) * 100} className="w-32 h-2 mt-1" />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {checks.map((c) => (
          <div key={c.label} className="flex items-start gap-2 text-sm">
            <span className={c.ok ? "text-success mt-0.5" : "text-destructive mt-0.5"}>{c.ok ? "✅" : "❌"}</span>
            <div>
              <span className="font-medium">{c.label}</span>
              <span className="text-muted-foreground ml-1.5 text-xs">{c.detail}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Readability */}
      <div className="border rounded-lg p-3 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Keterbacaan</p>
        <div className="flex items-center gap-3">
          <Progress value={readability.score} className="flex-1 h-2" />
          <span className={`text-sm font-medium ${readability.color}`}>{readability.score}% — {readability.label}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {wordCount} kata · {countSentences(content)} kalimat · Rata-rata {Math.round(avgSentenceLength(content))} kata/kalimat
        </p>
      </div>

      {/* Focus Keyword */}
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Focus Keyword</Label>
        <Input
          className="mt-1 text-sm"
          placeholder="cth: paket umroh murah"
          value={focusKeyword}
          onChange={(e) => setFocusKeyword(e.target.value)}
        />
        {focusKeyword && (
          <p className="text-xs text-muted-foreground mt-1">
            Kepadatan keyword: <strong className={density >= 0.5 && density <= 3 ? "text-success" : "text-destructive"}>{density}%</strong>
          </p>
        )}
      </div>

      {/* Google Snippet Preview */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Preview Google Snippet</p>
        <div className="border rounded-lg p-3 bg-white dark:bg-zinc-900 space-y-0.5">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Globe className="w-3 h-3" />
            <span>umrohplus.com › blog › {slug || "slug-artikel"}</span>
          </div>
          <p className="text-blue-600 dark:text-blue-400 font-medium text-base leading-snug line-clamp-1">
            {displayTitle || "Judul Artikel"}
          </p>
          <p className="text-sm text-muted-foreground leading-snug line-clamp-2">
            {seoDescription || "Masukkan SEO description agar muncul di hasil pencarian Google..."}
          </p>
        </div>
        <div className="flex gap-3 mt-1">
          <p className={`text-[10px] ${titleLen > 60 ? "text-destructive" : "text-muted-foreground"}`}>
            Title: {titleLen}/60 karakter
          </p>
          <p className={`text-[10px] ${descLen > 160 ? "text-destructive" : "text-muted-foreground"}`}>
            Desc: {descLen}/160 karakter
          </p>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const AdminBlog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showSEO, setShowSEO] = useState(false);

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

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    const { data } = await apiFetch<{ data: BlogPost[] }>("/api/admin/content/blog-posts");
    setPosts(data || []);
    setLoading(false);
  };

  const handleImageUpload = async (_e: React.ChangeEvent<HTMLInputElement>) => {
    // Upload via storage endpoint if available
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = form.slug || form.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const payload = { ...form, slug, published_at: form.is_published ? new Date().toISOString() : null };

    try {
      if (editing) {
        await apiFetch(`/api/admin/content/blog-posts/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast({ title: "Artikel diupdate!" });
      } else {
        await apiFetch("/api/admin/content/blog-posts", { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Artikel ditambahkan!" });
      }
      fetchPosts();
      setIsOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (post: BlogPost) => {
    setEditing(post);
    setForm({
      title: post.title, slug: post.slug, excerpt: post.excerpt || "",
      content: post.content || "", image_url: post.image_url || "",
      category: post.category || "", author: post.author || "",
      seo_title: post.seo_title || "", seo_description: post.seo_description || "",
      is_published: post.is_published,
    });
    setIsOpen(true);
  };

  const executeDelete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/content/blog-posts/${id}`, { method: "DELETE" });
      toast({ title: "Artikel dihapus" });
      fetchPosts();
    } catch (error: any) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
    }
  };

  const togglePublish = async (post: BlogPost) => {
    try {
      await apiFetch(`/api/admin/content/blog-posts/${post.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_published: !post.is_published, published_at: !post.is_published ? new Date().toISOString() : null }),
      });
      fetchPosts();
    } catch {
      toast({ title: "Gagal mengubah status", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ title: "", slug: "", excerpt: "", content: "", image_url: "", category: "", author: "", seo_title: "", seo_description: "", is_published: false });
    setShowSEO(false);
  };

  return (
    <div>
      <DeleteAlertDialog
        open={!!deleteTargetId}
        onOpenChange={() => setDeleteTargetId(null)}
        onConfirm={() => { if (deleteTargetId) { executeDelete(deleteTargetId); setDeleteTargetId(null); } }}
        title="Hapus Artikel?"
      />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Blog / Artikel</h1>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-primary">
              <Plus className="w-4 h-4 mr-2" /> Tambah Artikel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Artikel" : "Tambah Artikel Baru"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <Tabs defaultValue="content">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="content" className="flex-1">✏️ Konten</TabsTrigger>
                  <TabsTrigger value="seo" className="flex-1">
                    <BarChart3 className="w-3.5 h-3.5 mr-1.5" /> SEO Tools
                  </TabsTrigger>
                </TabsList>

                {/* CONTENT TAB */}
                <TabsContent value="content" className="space-y-4 mt-0">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <Label>Judul Artikel *</Label>
                        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="mt-1" />
                      </div>
                      <div>
                        <Label>Slug (URL)</Label>
                        <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated jika kosong" className="mt-1" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Kategori</Label>
                          <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Tips Umroh, dll" className="mt-1" />
                        </div>
                        <div>
                          <Label>Penulis</Label>
                          <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Nama penulis" className="mt-1" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label>Gambar Utama</Label>
                        <div className="mt-1 space-y-2">
                          {form.image_url && <img src={form.image_url} alt="Preview" className="w-full h-36 object-cover rounded-lg" />}
                          <div className="flex gap-2">
                            <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="URL gambar" className="flex-1" />
                            <Button type="button" variant="outline" asChild disabled={uploading}>
                              <label className="cursor-pointer">
                                <Image className="w-4 h-4 mr-1" />{uploading ? "..." : "Upload"}
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                              </label>
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label>Excerpt / Ringkasan</Label>
                        <Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="mt-1" rows={3} placeholder="Ringkasan singkat artikel" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Konten Artikel</Label>
                    <div className="mt-1">
                      <RichTextEditor content={form.content} onChange={(content) => setForm({ ...form, content })} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t pt-4">
                    <Switch checked={form.is_published} onCheckedChange={(checked) => setForm({ ...form, is_published: checked })} />
                    <Label>Publikasikan artikel</Label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                    <Button type="submit" className="gradient-gold text-primary">Simpan</Button>
                  </div>
                </TabsContent>

                {/* SEO TOOLS TAB */}
                <TabsContent value="seo" className="mt-0">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label>SEO Title</Label>
                        <Input
                          value={form.seo_title}
                          onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                          placeholder="Title untuk mesin pencari"
                          className="mt-1"
                        />
                        <p className={`text-xs mt-1 ${form.seo_title.length > 60 ? "text-destructive" : "text-muted-foreground"}`}>
                          {form.seo_title.length}/60 karakter
                        </p>
                      </div>
                      <div>
                        <Label>SEO Description (Meta)</Label>
                        <Textarea
                          value={form.seo_description}
                          onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                          placeholder="Deskripsi untuk mesin pencari (50–160 karakter)"
                          className="mt-1"
                          rows={3}
                        />
                        <p className={`text-xs mt-1 ${form.seo_description.length > 160 ? "text-destructive" : "text-muted-foreground"}`}>
                          {form.seo_description.length}/160 karakter
                        </p>
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" className="gradient-gold text-primary">Simpan Artikel</Button>
                      </div>
                    </div>
                    <div className="border-l pl-6">
                      <p className="text-sm font-semibold mb-4 flex items-center gap-2">
                        <SearchIcon className="w-4 h-4 text-primary" /> Analisis SEO
                      </p>
                      <SEOAnalysisPanel
                        title={form.title}
                        seoTitle={form.seo_title}
                        seoDescription={form.seo_description}
                        content={form.content}
                        slug={form.slug || form.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
                  <TableCell>
                    <div className="font-semibold max-w-xs truncate">{post.title}</div>
                    {post.seo_title && <div className="text-xs text-muted-foreground truncate max-w-xs">{post.seo_title}</div>}
                  </TableCell>
                  <TableCell>{post.category ? <Badge variant="outline">{post.category}</Badge> : "-"}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {safeFormatDate(post.created_at, "d MMM yy", { locale: idLocale })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Switch checked={post.is_published} onCheckedChange={() => togglePublish(post)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link to={`/blog/${post.slug}`} target="_blank">
                        <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                      </Link>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(post)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTargetId(post.id)}>
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
