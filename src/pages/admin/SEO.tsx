import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Save, ExternalLink, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import DeleteAlertDialog from "@/components/admin/DeleteAlertDialog";

interface SeoOverride {
  id: string;
  path: string;
  title: string | null;
  description: string | null;
  og_image: string | null;
  canonical_override: string | null;
  noindex: boolean;
  keywords: string | null;
}


interface SeoDefaults {
  default_title_suffix: string;
  default_description: string;
  default_og_image: string;
  gsc_verification: string;
  bing_verification: string;
}

const DEFAULTS_BLANK: SeoDefaults = {
  default_title_suffix: "",
  default_description: "",
  default_og_image: "",
  gsc_verification: "",
  bing_verification: "",
};

const AdminSEO = () => {
  const [defaults, setDefaults] = useState<SeoDefaults>(DEFAULTS_BLANK);
  const [overrides, setOverrides] = useState<SeoOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [editing, setEditing] = useState<SeoOverride | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sitemapInfo, setSitemapInfo] = useState<{ count: number; lastFetched: string } | null>(null);

  const loadAll = async () => {
    setLoading(true);
    const [defRes, ovRes] = await Promise.all([
      supabase.from("site_settings").select("value").eq("key", "seo").maybeSingle(),
      supabase.from("seo_overrides").select("*").order("path"),
    ]);

    if (defRes.data?.value && typeof defRes.data.value === "object") {
      setDefaults({ ...DEFAULTS_BLANK, ...(defRes.data.value as Partial<SeoDefaults>) });
    }
    setOverrides((ovRes.data as SeoOverride[]) ?? []);
    setLoading(false);
  };

  const loadSitemap = async () => {
    try {
      const res = await fetch("/sitemap.xml");
      const text = await res.text();
      const count = (text.match(/<url>/g) ?? []).length;
      setSitemapInfo({ count, lastFetched: new Date().toLocaleString("id-ID") });
    } catch {
      setSitemapInfo({ count: 0, lastFetched: "Tidak tersedia" });
    }
  };

  useEffect(() => {
    loadAll();
    loadSitemap();
  }, []);

  const saveDefaults = async () => {
    setSavingDefaults(true);
    const { error } = await supabase
      .from("site_settings")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert([{ key: "seo", category: "general", value: defaults as any }], { onConflict: "key" });
    setSavingDefaults(false);
    if (error) toast.error(error.message);
    else toast.success("Default SEO disimpan");
  };

  const saveOverride = async () => {
    if (!editing) return;
    if (!editing.path.startsWith("/")) {
      toast.error("Path harus diawali '/'");
      return;
    }
    const payload = {
      path: editing.path.trim(),
      title: editing.title?.trim() || null,
      description: editing.description?.trim() || null,
      og_image: editing.og_image?.trim() || null,
      canonical_override: editing.canonical_override?.trim() || null,
      noindex: editing.noindex,
      keywords: editing.keywords?.trim() || null,
    };

    const { error } = editing.id
      ? await supabase.from("seo_overrides").update(payload).eq("id", editing.id)
      : await supabase.from("seo_overrides").insert(payload);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("SEO override disimpan");
    setOpen(false);
    setEditing(null);
    loadAll();
  };

  const deleteOverride = async (id: string) => {
    const { error } = await supabase.from("seo_overrides").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Override dihapus");
      loadAll();
    }
  };

  const newOverride = () => {
    setEditing({
      id: "",
      path: "/",
      title: "",
      description: "",
      og_image: "",
      canonical_override: "",
      noindex: false,
      keywords: "",
    });
    setOpen(true);
  };

  const filtered = overrides.filter(
    (o) =>
      o.path.toLowerCase().includes(search.toLowerCase()) ||
      (o.title ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Pengaturan SEO</h1>
        <p className="text-muted-foreground">Kelola meta tag, OG image, sitemap, dan override per halaman.</p>
      </div>

      <Tabs defaultValue="defaults" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full md:w-auto">
          <TabsTrigger value="defaults">Default</TabsTrigger>
          <TabsTrigger value="overrides">Override Halaman</TabsTrigger>
          <TabsTrigger value="sitemap">Sitemap & Robots</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>

        {/* DEFAULTS */}
        <TabsContent value="defaults">
          <Card>
            <CardHeader>
              <CardTitle>Meta Defaults</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Title Suffix (opsional)</Label>
                  <Input
                    value={defaults.default_title_suffix}
                    onChange={(e) => setDefaults({ ...defaults, default_title_suffix: e.target.value })}
                    placeholder="| Travel Umroh Bonang"
                  />
                </div>
                <div>
                  <Label>Default OG Image URL</Label>
                  <Input
                    value={defaults.default_og_image}
                    onChange={(e) => setDefaults({ ...defaults, default_og_image: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div>
                <Label>Default Meta Description</Label>
                <Textarea
                  value={defaults.default_description}
                  onChange={(e) => setDefaults({ ...defaults, default_description: e.target.value })}
                  rows={3}
                  maxLength={160}
                />
                <p className="text-xs text-muted-foreground mt-1">{defaults.default_description.length}/160</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Google Search Console Token</Label>
                  <Input
                    value={defaults.gsc_verification}
                    onChange={(e) => setDefaults({ ...defaults, gsc_verification: e.target.value })}
                    placeholder="google-site-verification token"
                  />
                </div>
                <div>
                  <Label>Bing Webmaster Token</Label>
                  <Input
                    value={defaults.bing_verification}
                    onChange={(e) => setDefaults({ ...defaults, bing_verification: e.target.value })}
                    placeholder="msvalidate.01 token"
                  />
                </div>
              </div>
              <Button onClick={saveDefaults} disabled={savingDefaults}>
                <Save className="h-4 w-4 mr-2" />
                {savingDefaults ? "Menyimpan..." : "Simpan Default"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OVERRIDES */}
        <TabsContent value="overrides">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle>Override per Halaman</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari path..."
                    className="pl-8 w-48"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button onClick={newOverride}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Memuat...</p>
              ) : filtered.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Belum ada override. Tambahkan untuk menimpa meta tag di halaman tertentu.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Path</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Index</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-xs">{o.path}</TableCell>
                          <TableCell className="max-w-xs truncate">{o.title || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell>
                            {o.noindex ? <Badge variant="destructive">noindex</Badge> : <Badge variant="secondary">index</Badge>}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditing(o);
                                setOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteId(o.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SITEMAP */}
        <TabsContent value="sitemap">
          <Card>
            <CardHeader>
              <CardTitle>Sitemap & Robots</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Sitemap URL</p>
                  <a
                    href="/sitemap.xml"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    /sitemap.xml <ExternalLink className="h-3 w-3" />
                  </a>
                  <p className="text-sm mt-2">
                    Jumlah URL: <strong>{sitemapInfo?.count ?? "..."}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">Dicek: {sitemapInfo?.lastFetched ?? "..."}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Robots.txt</p>
                  <a
                    href="/robots.txt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    /robots.txt <ExternalLink className="h-3 w-3" />
                  </a>
                  <p className="text-xs text-muted-foreground mt-2">
                    Sitemap diregenerasi otomatis saat build & dev (lihat <code>scripts/generate-sitemap.ts</code>).
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={loadSitemap}>
                Refresh Info
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TOOLS */}
        <TabsContent value="tools">
          <Card>
            <CardHeader>
              <CardTitle>SEO Tools Eksternal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <a
                href="https://search.google.com/search-console"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" /> Google Search Console
              </a>
              <a
                href="https://www.bing.com/webmasters/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" /> Bing Webmaster Tools
              </a>
              <a
                href="https://search.google.com/test/rich-results"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" /> Rich Results Test
              </a>
              <a
                href="https://pagespeed.web.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" /> PageSpeed Insights
              </a>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit" : "Tambah"} SEO Override</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Path *</Label>
                <Input
                  value={editing.path}
                  onChange={(e) => setEditing({ ...editing, path: e.target.value })}
                  placeholder="/paket atau /blog/judul-post"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Path lengkap mulai dari <code>/</code>. Override hanya berlaku pada path yang persis sama.
                </p>
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground mt-1">{(editing.title ?? "").length}/60</p>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={3}
                  maxLength={160}
                />
                <p className="text-xs text-muted-foreground mt-1">{(editing.description ?? "").length}/160</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>OG Image URL</Label>
                  <Input
                    value={editing.og_image ?? ""}
                    onChange={(e) => setEditing({ ...editing, og_image: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Canonical Override</Label>
                  <Input
                    value={editing.canonical_override ?? ""}
                    onChange={(e) => setEditing({ ...editing, canonical_override: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Keywords (pisah koma)</Label>
                <Input
                  value={editing.keywords ?? ""}
                  onChange={(e) => setEditing({ ...editing, keywords: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing.noindex}
                  onCheckedChange={(v) => setEditing({ ...editing, noindex: v })}
                />
                <Label>Noindex (sembunyikan dari mesin pencari)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={saveOverride}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteAlertDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        title="Hapus override?"
        description="Override SEO ini akan dihapus permanen."
        onConfirm={() => {
          if (deleteId) deleteOverride(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
};

export default AdminSEO;
