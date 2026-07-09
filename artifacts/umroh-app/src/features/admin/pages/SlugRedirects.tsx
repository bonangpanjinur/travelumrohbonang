import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";

interface Redirect {
  id: string;
  tenant_site_id: string | null;
  resource_type: "package" | "blog" | "page";
  old_slug: string;
  new_slug: string;
  created_at: string;
}

interface TenantOption {
  id: string;
  siteName: string;
  subdomain: string;
}

const SCOPE_GLOBAL = "__global__";

const AdminSlugRedirects = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Redirect[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    tenant_site_id: SCOPE_GLOBAL,
    resource_type: "package" as Redirect["resource_type"],
    old_slug: "",
    new_slug: "",
  });

  const fetchAll = async () => {
    try {
      const [{ data: r }, t] = await Promise.all([
        apiFetch<{ data: Redirect[] }>("/api/admin/redirects"),
        apiFetch<TenantOption[]>("/api/admin/tenant"),
      ]);
      setRows(r || []);
      setTenants(t || []);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      tenantSiteId: form.tenant_site_id === SCOPE_GLOBAL ? null : form.tenant_site_id,
      resourceType: form.resource_type,
      oldSlug: form.old_slug.trim(),
      newSlug: form.new_slug.trim(),
    };
    try {
      await apiFetch("/api/admin/redirects", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast({ title: "Redirect ditambahkan" });
      setOpen(false);
      setForm({ tenant_site_id: SCOPE_GLOBAL, resource_type: "package", old_slug: "", new_slug: "" });
      fetchAll();
    } catch (error: any) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    }
  };

  const executeDelete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/redirects/${id}`, { method: "DELETE" });
      toast({ title: "Redirect dihapus" });
      fetchAll();
    } catch (error: any) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
    }
  };

  const tenantLabel = (id: string | null) => {
    if (!id) return "Global";
    const t = tenants.find((x) => x.id === id);
    return t ? `${t.siteName} (${t.subdomain})` : "—";
  };

  const resourceLabel: Record<Redirect["resource_type"], string> = {
    package: "Paket",
    blog: "Blog",
    page: "Halaman",
  };

  return (
    <div>
      <DeleteAlertDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) executeDelete(deleteId);
          setDeleteId(null);
        }}
      />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Slug Redirects (301)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Petakan slug lama ke slug baru agar tautan lama tidak putus dan kekuatan SEO tetap terjaga.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-primary">
              <Plus className="w-4 h-4 mr-2" /> Tambah
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Redirect</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Scope</Label>
                <Select value={form.tenant_site_id} onValueChange={(v) => setForm({ ...form, tenant_site_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SCOPE_GLOBAL}>Global (semua domain)</SelectItem>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.siteName} ({t.subdomain})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Jenis Konten</Label>
                <Select value={form.resource_type} onValueChange={(v) => setForm({ ...form, resource_type: v as Redirect["resource_type"] })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="package">Paket</SelectItem>
                    <SelectItem value="blog">Blog</SelectItem>
                    <SelectItem value="page">Halaman</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Slug Lama</Label>
                  <Input required value={form.old_slug} onChange={(e) => setForm({ ...form, old_slug: e.target.value })} placeholder="umroh-promo-2024" className="mt-1" />
                </div>
                <div>
                  <Label>Slug Baru</Label>
                  <Input required value={form.new_slug} onChange={(e) => setForm({ ...form, new_slug: e.target.value })} placeholder="umroh-promo-2026" className="mt-1" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                <Button type="submit" className="gradient-gold text-primary">Simpan</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold" /></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Belum ada redirect.</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scope</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Slug Lama → Baru</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{tenantLabel(r.tenant_site_id || null)}</TableCell>
                  <TableCell>{resourceLabel[r.resource_type]}</TableCell>
                  <TableCell className="font-mono text-sm">
                    <span className="text-muted-foreground line-through">{r.old_slug}</span>
                    <ArrowRight className="inline w-3 h-3 mx-2" />
                    <span className="text-foreground">{r.new_slug}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
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

export default AdminSlugRedirects;
