import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Globe, ExternalLink, Copy, Info, CheckCircle2, AlertTriangle, Package } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import DeleteAlertDialog from "@/components/admin/DeleteAlertDialog";
import TenantPackageManager from "@/components/admin/TenantPackageManager";

interface TenantSite {
  id: string;
  owner_id: string;
  branch_id: string | null;
  agent_id: string | null;
  subdomain: string;
  custom_domain: string | null;
  site_name: string;
  tagline: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  hero_image_url: string;
  hero_title: string;
  hero_subtitle: string;
  about_text: string;
  whatsapp_number: string;
  phone: string;
  email: string;
  address: string;
  instagram_url: string;
  facebook_url: string;
  is_active: boolean;
  template: string;
  created_at: string;
}

const emptyForm: Partial<TenantSite> = {
  subdomain: "",
  site_name: "",
  tagline: "",
  logo_url: "",
  primary_color: "#166534",
  secondary_color: "#d4af37",
  hero_image_url: "",
  hero_title: "",
  hero_subtitle: "",
  about_text: "",
  whatsapp_number: "",
  phone: "",
  email: "",
  address: "",
  instagram_url: "",
  facebook_url: "",
  is_active: true,
  template: "classic",
  branch_id: null,
  agent_id: null,
};

const DnsRecordRow = ({ type, name, value }: { type: string; name: string; value: string }) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Disalin ke clipboard");
  };
  return (
    <div className="flex items-center gap-2 text-xs bg-background rounded px-3 py-2 border border-border">
      <Badge variant="outline" className="shrink-0 text-[10px]">{type}</Badge>
      <code className="font-mono shrink-0">{name}</code>
      <span className="text-muted-foreground">→</span>
      <code className="font-mono flex-1 truncate">{value}</code>
      <button onClick={() => copyToClipboard(value)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors" title="Copy">
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

const TenantSitesAdmin = () => {
  const { user } = useAuth();
  const [sites, setSites] = useState<TenantSite[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<Partial<TenantSite>>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    const [sitesRes, branchesRes, agentsRes] = await Promise.all([
      supabase.from("tenant_sites").select("*").order("created_at", { ascending: false }),
      supabase.from("branches").select("id, name").eq("is_active", true),
      supabase.from("agents").select("id, name").eq("is_active", true),
    ]);
    if (sitesRes.data) setSites(sitesRes.data as TenantSite[]);
    if (branchesRes.data) setBranches(branchesRes.data);
    if (agentsRes.data) setAgents(agentsRes.data);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSave = async () => {
    if (!form.subdomain || !form.site_name) {
      toast.error("Subdomain dan nama situs wajib diisi");
      return;
    }
    setLoading(true);
    try {
      if (editId) {
        const { error } = await supabase.from("tenant_sites").update(form).eq("id", editId);
        if (error) throw error;
        toast.success("Situs berhasil diperbarui");
      } else {
        const { error } = await supabase.from("tenant_sites").insert({ ...form, owner_id: user?.id } as any);
        if (error) throw error;
        toast.success("Situs berhasil dibuat");
      }
      setDialogOpen(false);
      setEditId(null);
      setForm(emptyForm);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (site: TenantSite) => {
    setForm(site);
    setEditId(site.id);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("tenant_sites").delete().eq("id", deleteId);
    if (error) toast.error(error.message);
    else {
      toast.success("Situs berhasil dihapus");
      fetchAll();
    }
    setDeleteId(null);
  };

  const updateField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Multi-Tenant Sites</h1>
          <p className="text-muted-foreground">Kelola website cabang & agen</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Tambah Situs</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Situs" : "Tambah Situs Baru"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Basic Info */}
              <div>
                <Label>Subdomain *</Label>
                <Input value={form.subdomain || ""} onChange={e => updateField("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="cabang-jakarta" />
                <p className="text-xs text-muted-foreground mt-1">cabang-jakarta.yourdomain.com</p>
              </div>
              <div>
                <Label>Nama Situs *</Label>
                <Input value={form.site_name || ""} onChange={e => updateField("site_name", e.target.value)} placeholder="UmrohPlus Jakarta" />
              </div>
              <div>
                <Label>Tagline</Label>
                <Input value={form.tagline || ""} onChange={e => updateField("tagline", e.target.value)} placeholder="Travel & Tours" />
              </div>
              <div>
                <Label>Template</Label>
                <Select value={form.template || "classic"} onValueChange={v => updateField("template", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classic">Classic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Domain Section */}
              <div className="md:col-span-2">
                <Separator className="my-2" />
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Custom Domain
                </Label>
                <p className="text-xs text-muted-foreground mb-3">Hubungkan domain kustom milik tenant (opsional)</p>
              </div>
              <div className="md:col-span-2">
                <Label>Custom Domain</Label>
                <Input 
                  value={form.custom_domain || ""} 
                  onChange={e => updateField("custom_domain", e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, "") || null)} 
                  placeholder="umroh-jakarta.com" 
                />
              </div>
              {form.custom_domain && (
                <div className="md:col-span-2">
                  <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <AlertDescription>
                      <p className="font-semibold text-sm mb-2">Instruksi DNS Setup untuk: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{form.custom_domain}</code></p>
                      <p className="text-xs text-muted-foreground mb-3">Tenant perlu mengkonfigurasi DNS berikut di registrar domain mereka:</p>
                      <div className="space-y-2">
                        <DnsRecordRow type="A" name="@" value="185.158.133.1" />
                        <DnsRecordRow type="A" name="www" value="185.158.133.1" />
                        <DnsRecordRow type="CNAME" name="www" value={form.custom_domain || ""} />
                      </div>
                      <div className="mt-3 p-2 rounded bg-muted/50 text-xs space-y-1">
                        <p className="flex items-start gap-1.5"><Info className="w-3 h-3 mt-0.5 shrink-0" /> Propagasi DNS memakan waktu hingga 72 jam.</p>
                        <p className="flex items-start gap-1.5"><Info className="w-3 h-3 mt-0.5 shrink-0" /> SSL akan otomatis aktif setelah DNS terhubung.</p>
                        <p className="flex items-start gap-1.5"><Info className="w-3 h-3 mt-0.5 shrink-0" /> Pastikan tidak ada A record lain yang konflik.</p>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <div className="md:col-span-2">
                <Separator className="my-2" />
              </div>

              {/* Branch / Agent */}
              <div>
                <Label>Cabang</Label>
                <Select value={form.branch_id || "none"} onValueChange={v => updateField("branch_id", v === "none" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih cabang" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak ada</SelectItem>
                    {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Agen</Label>
                <Select value={form.agent_id || "none"} onValueChange={v => updateField("agent_id", v === "none" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih agen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak ada</SelectItem>
                    {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Colors */}
              <div>
                <Label>Warna Primer</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.primary_color || "#166534"} onChange={e => updateField("primary_color", e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
                  <Input value={form.primary_color || ""} onChange={e => updateField("primary_color", e.target.value)} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>Warna Sekunder</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.secondary_color || "#d4af37"} onChange={e => updateField("secondary_color", e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
                  <Input value={form.secondary_color || ""} onChange={e => updateField("secondary_color", e.target.value)} className="flex-1" />
                </div>
              </div>

              {/* Media */}
              <div className="md:col-span-2">
                <Label>Logo URL</Label>
                <Input value={form.logo_url || ""} onChange={e => updateField("logo_url", e.target.value)} placeholder="https://..." />
              </div>
              <div className="md:col-span-2">
                <Label>Hero Image URL</Label>
                <Input value={form.hero_image_url || ""} onChange={e => updateField("hero_image_url", e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <Label>Hero Title</Label>
                <Input value={form.hero_title || ""} onChange={e => updateField("hero_title", e.target.value)} />
              </div>
              <div>
                <Label>Hero Subtitle</Label>
                <Input value={form.hero_subtitle || ""} onChange={e => updateField("hero_subtitle", e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>Tentang</Label>
                <Textarea value={form.about_text || ""} onChange={e => updateField("about_text", e.target.value)} rows={3} />
              </div>

              {/* Contact */}
              <div>
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp_number || ""} onChange={e => updateField("whatsapp_number", e.target.value)} placeholder="628xxx" />
              </div>
              <div>
                <Label>Telepon</Label>
                <Input value={form.phone || ""} onChange={e => updateField("phone", e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.email || ""} onChange={e => updateField("email", e.target.value)} />
              </div>
              <div>
                <Label>Alamat</Label>
                <Input value={form.address || ""} onChange={e => updateField("address", e.target.value)} />
              </div>
              <div>
                <Label>Instagram URL</Label>
                <Input value={form.instagram_url || ""} onChange={e => updateField("instagram_url", e.target.value)} />
              </div>
              <div>
                <Label>Facebook URL</Label>
                <Input value={form.facebook_url || ""} onChange={e => updateField("facebook_url", e.target.value)} />
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <Switch checked={form.is_active ?? true} onCheckedChange={v => updateField("is_active", v)} />
                <Label>Aktif</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button onClick={handleSave} disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Situs</TableHead>
                <TableHead>Subdomain / Domain</TableHead>
                <TableHead>Cabang/Agen</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada situs tenant</TableCell></TableRow>
              ) : (
                sites.map(site => (
                  <TableRow key={site.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{site.site_name}</p>
                          <p className="text-xs text-muted-foreground">{site.tagline}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{site.subdomain}</code>
                        {site.custom_domain && (
                          <div className="flex items-center gap-1">
                            <Globe className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{site.custom_domain}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {branches.find(b => b.id === site.branch_id)?.name || agents.find(a => a.id === site.agent_id)?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={site.is_active ? "default" : "secondary"}>
                        {site.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => window.open(`/?tenant=${site.subdomain}`, "_blank")}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(site)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(site.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DeleteAlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Situs?"
        description="Situs tenant ini akan dihapus secara permanen."
      />
    </div>
  );
};

export default TenantSitesAdmin;
