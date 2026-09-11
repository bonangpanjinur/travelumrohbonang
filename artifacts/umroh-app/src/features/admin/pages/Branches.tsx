import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { useToast } from "@/shared/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Download, Upload, FileSpreadsheet } from "lucide-react";
import Papa from "papaparse";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";
import AdminPagination from "@/features/admin/components/AdminPagination";
import { useAdminPagination } from "@/features/admin/hooks/useAdminPagination";

interface Branch {
  id: string;
  code: string | null;
  name: string;
  slug: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: string | null;
  image_url: string | null;
  map_url: string | null;
  description: string | null;
  is_active: boolean;
}

const empty = {
  code: "",
  name: "",
  slug: "",
  address: "",
  phone: "",
  email: "",
  city: "",
  region: "",
  postal_code: "",
  country: "ID",
  latitude: "",
  longitude: "",
  opening_hours: "",
  image_url: "",
  map_url: "",
  description: "",
};

const AdminBranches = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const { toast } = useToast();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const { page, setPage, totalPages, totalCount, paginatedItems, pageSize } = useAdminPagination(branches);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const data = await apiFetch<any[]>("/api/admin/branches");
      setBranches((data || []).map((b) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        slug: b.slug,
        address: b.address,
        phone: b.phone,
        email: b.email,
        city: b.city,
        region: b.region,
        postal_code: b.postalCode,
        country: b.country,
        latitude: b.latitude,
        longitude: b.longitude,
        opening_hours: b.openingHours,
        image_url: b.imageUrl,
        map_url: b.mapUrl,
        description: b.description,
        is_active: b.isActive,
      })));
    } catch (e) {
      console.error(e);
      toast({ title: "Gagal memuat data cabang", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      code: form.code.trim().toUpperCase() || null,
      name: form.name,
      slug: form.slug || null,
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      city: form.city || null,
      region: form.region || null,
      postalCode: form.postal_code || null,
      country: form.country || "ID",
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      openingHours: form.opening_hours || null,
      imageUrl: form.image_url || null,
      mapUrl: form.map_url || null,
      description: form.description || null,
    };
    try {
      if (editing) {
        await apiFetch(`/api/admin/branches/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast({ title: "Cabang diupdate!" });
      } else {
        await apiFetch("/api/admin/branches", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast({ title: "Cabang ditambahkan!" });
      }
      fetchBranches();
      setIsOpen(false);
      resetForm();
    } catch (e: any) {
      toast({ title: "Gagal menyimpan", description: e.message, variant: "destructive" });
    }
  };

  const handleEdit = (b: Branch) => {
    setEditing(b);
    setForm({
      code: b.code || "",
      name: b.name || "",
      slug: b.slug || "",
      address: b.address || "",
      phone: b.phone || "",
      email: b.email || "",
      city: b.city || "",
      region: b.region || "",
      postal_code: b.postal_code || "",
      country: b.country || "ID",
      latitude: b.latitude != null ? String(b.latitude) : "",
      longitude: b.longitude != null ? String(b.longitude) : "",
      opening_hours: b.opening_hours || "",
      image_url: b.image_url || "",
      map_url: b.map_url || "",
      description: b.description || "",
    });
    setIsOpen(true);
  };

  const executeDelete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/branches/${id}`, { method: "DELETE" });
      toast({ title: "Cabang dihapus" });
      fetchBranches();
    } catch (e: any) {
      toast({ title: "Gagal menghapus", description: e.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ ...empty });
  };

  const downloadBranchTemplate = () => {
    const headers = ["kode", "nama", "slug", "alamat", "telepon", "email", "kota", "provinsi", "kode_pos", "negara", "latitude", "longitude", "jam_operasional", "url_gambar", "url_google_maps", "deskripsi"];
    const sample = ["", "Cabang Jakarta", "jakarta", "Jl. Contoh No. 1", "021123456", "jakarta@contoh.id", "Jakarta", "DKI Jakarta", "10110", "ID", "-6.2", "106.8", "Mo-Sa 09:00-17:00", "", "", "Deskripsi cabang"];
    const blob = new Blob([[headers.join(","), sample.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "template-import-cabang.csv"; anchor.click(); URL.revokeObjectURL(url);
  };

  const handleImportFile = (file: File) => {
    setImportErrors([]);
    Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: true, transformHeader: (header) => header.trim().toLowerCase(), complete: (result) => {
      const rows = result.data.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? "").trim()])));
      const errors = rows.flatMap((row, index) => !row.nama ? [`Baris ${index + 2}: kolom nama wajib diisi`] : []);
      setImportRows(rows.filter((row) => Object.values(row).some(Boolean)));
      setImportErrors(errors);
    }, error: (error) => setImportErrors([`File tidak dapat dibaca: ${error.message}`]) });
  };

  const executeImport = async () => {
    if (!importRows.length || importErrors.length) return;
    setImporting(true);
    try {
      for (const row of importRows) {
        await apiFetch("/api/admin/branches", { method: "POST", body: JSON.stringify({
          code: row.kode || null, name: row.nama, slug: row.slug || null, address: row.alamat || null,
          phone: row.telepon || null, email: row.email || null, city: row.kota || null, region: row.provinsi || null,
          postalCode: row.kode_pos || null, country: row.negara || "ID", latitude: row.latitude ? Number(row.latitude) : null,
          longitude: row.longitude ? Number(row.longitude) : null, openingHours: row.jam_operasional || null,
          imageUrl: row.url_gambar || null, mapUrl: row.url_google_maps || null, description: row.deskripsi || null,
        }) });
      }
      toast({ title: `${importRows.length} cabang berhasil diimport` });
      setImportOpen(false); setImportRows([]); fetchBranches();
    } catch (error: any) {
      toast({ title: "Import berhenti", description: error.message, variant: "destructive" });
    } finally { setImporting(false); }
  };

  return (
    <div>
      <DeleteAlertDialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)} onConfirm={() => { if (deleteTargetId) executeDelete(deleteTargetId); setDeleteTargetId(null); }} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Cabang</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={downloadBranchTemplate}><Download className="w-4 h-4 mr-2" /> Template CSV</Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-2" /> Import CSV</Button>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-primary"><Plus className="w-4 h-4 mr-2" /> Tambah</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Cabang" : "Tambah Cabang"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Kode Cabang</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, "-") })} placeholder="VINS" className="mt-1 font-mono" />
                </div>
                <div>
                  <Label>Nama Cabang *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" />
                </div>
                <div>
                  <Label>Slug (SEO URL)</Label>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="jakarta-pusat" className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Alamat (jalan)</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Kota</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Provinsi</Label>
                  <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Kode Pos</Label>
                  <Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Negara (ISO)</Label>
                  <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="ID" className="mt-1" />
                </div>
                <div>
                  <Label>Latitude</Label>
                  <Input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="-6.2088" className="mt-1" />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="106.8456" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Telepon</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Jam Operasional (format schema.org)</Label>
                <Input value={form.opening_hours} onChange={(e) => setForm({ ...form, opening_hours: e.target.value })} placeholder="Mo-Sa 09:00-17:00" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>URL Gambar</Label>
                  <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>URL Google Maps</Label>
                  <Input value={form.map_url} onChange={(e) => setForm({ ...form, map_url: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Deskripsi singkat</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" rows={3} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                <Button type="submit" className="gradient-gold text-primary">Simpan</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={importOpen} onOpenChange={(open) => { setImportOpen(open); if (!open) { setImportRows([]); setImportErrors([]); } }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Import Data Cabang</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center"><FileSpreadsheet className="mx-auto h-8 w-8 text-primary" /><p className="mt-2 text-sm font-medium">Upload CSV sesuai format Cabang</p><p className="mt-1 text-xs text-muted-foreground">Kolom wajib: <b>nama</b>. Kode cabang boleh kosong dan akan dibuat otomatis.</p><input id="branch-import-file" type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) handleImportFile(file); event.currentTarget.value = ""; }} /><Button variant="outline" className="mt-3" onClick={() => document.getElementById("branch-import-file")?.click()}><Upload className="mr-2 h-4 w-4" /> Pilih File CSV</Button><Button variant="link" className="mt-3" onClick={downloadBranchTemplate}>Download template</Button></div>
              {importErrors.length > 0 && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{importErrors.map((error) => <div key={error}>{error}</div>)}</div>}
              {importRows.length > 0 && <div><p className="mb-2 text-sm font-semibold">Preview {importRows.length} baris</p><div className="max-h-64 overflow-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Nama</TableHead><TableHead>Kode</TableHead><TableHead>Kota</TableHead><TableHead>Provinsi</TableHead><TableHead>Telepon</TableHead></TableRow></TableHeader><TableBody>{importRows.slice(0, 100).map((row, index) => <TableRow key={`${row.nama}-${index}`}><TableCell>{index + 1}</TableCell><TableCell>{row.nama}</TableCell><TableCell>{row.kode || "Otomatis"}</TableCell><TableCell>{row.kota || "-"}</TableCell><TableCell>{row.provinsi || "-"}</TableCell><TableCell>{row.telepon || "-"}</TableCell></TableRow>)}</TableBody></Table></div></div>}
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setImportOpen(false)}>Batal</Button><Button className="gradient-gold text-primary" disabled={!importRows.length || importErrors.length > 0 || importing} onClick={executeImport}>{importing ? "Mengimport..." : `Import ${importRows.length || ""} Cabang`}</Button></div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div></div>
      ) : branches.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Belum ada cabang</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama Cabang</TableHead>
                <TableHead>Kota</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.code || "-"}</TableCell>
                  <TableCell className="font-semibold">{b.name}</TableCell>
                  <TableCell>{b.city || "-"}</TableCell>
                  <TableCell>{b.phone || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{b.slug || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(b)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTargetId(b.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <AdminPagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
};

export default AdminBranches;
