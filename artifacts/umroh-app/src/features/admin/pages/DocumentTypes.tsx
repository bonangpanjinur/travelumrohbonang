/**
 * Konfigurasi Jenis Dokumen Jemaah
 * Admin dapat mengatur dokumen apa saja yang harus/boleh dilengkapi jemaah,
 * termasuk siapa yang perlu, format yang diterima, dan apakah perlu verifikasi.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, GripVertical, ShieldCheck, CheckCircle2,
  FileText, Settings2, Users, Info,
} from "lucide-react";

interface DocTypeItem {
  id: string;
  code: string;
  label: string;
  description: string | null;
  isRequired: boolean;
  appliesTo: string;
  allowedFormats: string;
  maxSizeMb: number;
  needsVerification: boolean;
  hasExpiry: boolean;
  isActive: boolean;
  sortOrder: number;
}

const APPLIES_TO_OPTIONS = [
  { value: "all",     label: "Semua Jemaah" },
  { value: "adult",   label: "Dewasa saja" },
  { value: "child",   label: "Anak-anak saja" },
  { value: "infant",  label: "Bayi saja" },
  { value: "married", label: "Yang menikah" },
  { value: "male",    label: "Laki-laki saja" },
  { value: "female",  label: "Perempuan saja" },
];

const EMPTY_FORM: Partial<DocTypeItem> = {
  code: "", label: "", description: "",
  isRequired: true, appliesTo: "all",
  allowedFormats: "pdf,jpg,png", maxSizeMb: 5,
  needsVerification: true, hasExpiry: false,
};

const DocumentTypes = () => {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<{ open: boolean; editing: DocTypeItem | null }>({ open: false, editing: null });
  const [form, setForm] = useState<Partial<DocTypeItem>>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<DocTypeItem | null>(null);

  // Use ["document-types","all"] key to avoid cache collision with Documents.tsx
  // which uses ["document-types","active"] (activeOnly=true subset).
  const { data: docTypes = [], isLoading } = useQuery<DocTypeItem[]>({
    queryKey: ["document-types", "all"],
    queryFn: () => apiFetch("/api/admin/document-types"),
  });

  // Helper: invalidate both keys so Documents.tsx immediately reflects changes
  const invalidateBoth = () => {
    queryClient.invalidateQueries({ queryKey: ["document-types", "all"] });
    queryClient.invalidateQueries({ queryKey: ["document-types", "active"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<DocTypeItem>) => {
      if (dialog.editing) {
        return apiFetch(`/api/admin/document-types/${dialog.editing.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      } else {
        return apiFetch("/api/admin/document-types", {
          method: "POST",
          body: JSON.stringify(data),
        });
      }
    },
    onSuccess: () => {
      invalidateBoth();
      toast.success(dialog.editing ? "Tipe dokumen diperbarui" : "Tipe dokumen ditambahkan");
      setDialog({ open: false, editing: null });
      setForm(EMPTY_FORM);
    },
    onError: (e: any) => toast.error(e.message || "Gagal menyimpan"),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/document-types/${id}/toggle`, { method: "PATCH" }),
    onSuccess: () => {
      invalidateBoth();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/document-types/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidateBoth();
      toast.success("Tipe dokumen dihapus");
      setDeleteConfirm(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setDialog({ open: true, editing: null });
  };

  const openEdit = (dt: DocTypeItem) => {
    setForm({ ...dt });
    setDialog({ open: true, editing: dt });
  };

  const handleSave = () => {
    if (!form.code?.trim() || !form.label?.trim()) {
      toast.error("Kode dan label wajib diisi");
      return;
    }
    saveMutation.mutate(form);
  };

  const activeCount  = docTypes.filter(d => d.isActive).length;
  const requiredCount = docTypes.filter(d => d.isRequired && d.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Konfigurasi Dokumen</h1>
          <p className="text-muted-foreground">Atur jenis dokumen yang wajib/opsional dilengkapi jemaah</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Dokumen
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><FileText className="w-5 h-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{docTypes.length}</p><p className="text-xs text-muted-foreground">Total Jenis Dokumen</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-2xl font-bold">{activeCount}</p><p className="text-xs text-muted-foreground">Aktif</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><ShieldCheck className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-2xl font-bold">{requiredCount}</p><p className="text-xs text-muted-foreground">Wajib</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Daftar Jenis Dokumen
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Nama Dokumen</TableHead>
                  <TableHead>Berlaku Untuk</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Wajib</TableHead>
                  <TableHead>Verifikasi</TableHead>
                  <TableHead>Kadaluarsa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docTypes.map((dt) => {
                  const appliesToLabel = APPLIES_TO_OPTIONS.find(a => a.value === dt.appliesTo)?.label ?? dt.appliesTo;
                  return (
                    <TableRow key={dt.id} className={!dt.isActive ? "opacity-50" : ""}>
                      <TableCell>
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{dt.label}</p>
                          <p className="text-xs text-muted-foreground font-mono">{dt.code}</p>
                          {dt.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{dt.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="w-3 h-3" />
                          {appliesToLabel}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {dt.allowedFormats.split(",").map(f => (
                            <Badge key={f} variant="outline" className="text-xs uppercase">{f.trim()}</Badge>
                          ))}
                          <span className="text-xs text-muted-foreground">max {dt.maxSizeMb}MB</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {dt.isRequired
                          ? <Badge className="bg-red-100 text-red-700 border-red-200">Wajib</Badge>
                          : <Badge variant="outline">Opsional</Badge>}
                      </TableCell>
                      <TableCell>
                        {dt.needsVerification
                          ? <Badge className="bg-blue-100 text-blue-700 border-blue-200">Perlu</Badge>
                          : <Badge variant="outline">Otomatis</Badge>}
                      </TableCell>
                      <TableCell>
                        {dt.hasExpiry
                          ? <Badge className="bg-amber-100 text-amber-700 border-amber-200">Ada</Badge>
                          : <span className="text-xs text-muted-foreground">–</span>}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={dt.isActive}
                          onCheckedChange={() => toggleMutation.mutate(dt.id)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(dt)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm(dt)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {docTypes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>Belum ada tipe dokumen. Klik "Tambah Dokumen" untuk mulai.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Catatan info */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-4 flex gap-3 items-start">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <p className="font-medium">Cara kerja konfigurasi dokumen:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>Dokumen yang <strong>aktif</strong> akan muncul di checklist setiap jemaah baru</li>
              <li>Dokumen <strong>opsional</strong> bisa diupload tapi tidak menghitung progress %</li>
              <li>Nonaktifkan dokumen untuk menyembunyikannya tanpa menghapus data yang sudah ada</li>
              <li>Kolom "Berlaku Untuk" menentukan segmen jemaah yang perlu dokumen ini</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialog.open} onOpenChange={(o) => { if (!o) { setDialog({ open: false, editing: null }); setForm(EMPTY_FORM); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog.editing ? "Edit Jenis Dokumen" : "Tambah Jenis Dokumen"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kode <span className="text-destructive">*</span></Label>
                <Input placeholder="paspor" value={form.code || ""} onChange={e => setForm(f => ({ ...f, code: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
                  disabled={!!dialog.editing} />
                <p className="text-xs text-muted-foreground">Huruf kecil, tidak bisa diubah</p>
              </div>
              <div className="space-y-1.5">
                <Label>Nama Tampil <span className="text-destructive">*</span></Label>
                <Input placeholder="Paspor" value={form.label || ""} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Deskripsi / Panduan Upload</Label>
              <Textarea placeholder="Contoh: Halaman data diri + foto paspor (min. 6 bulan berlaku dari tanggal keberangkatan)"
                rows={2} value={form.description || ""}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Berlaku Untuk</Label>
                <Select value={form.appliesTo || "all"} onValueChange={v => setForm(f => ({ ...f, appliesTo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APPLIES_TO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Maks Ukuran File (MB)</Label>
                <Input type="number" min={1} max={50} value={form.maxSizeMb ?? 5}
                  onChange={e => setForm(f => ({ ...f, maxSizeMb: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Format File Diterima</Label>
              <Input placeholder="pdf,jpg,png" value={form.allowedFormats || ""}
                onChange={e => setForm(f => ({ ...f, allowedFormats: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Pisahkan dengan koma, tanpa titik, e.g. "pdf,jpg,png"</p>
            </div>

            <div className="space-y-3 border rounded-lg p-3">
              <p className="text-sm font-medium">Opsi</p>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Wajib</p>
                    <p className="text-xs text-muted-foreground">Menghitung progress kelengkapan dokumen</p>
                  </div>
                  <Switch checked={form.isRequired ?? true} onCheckedChange={v => setForm(f => ({ ...f, isRequired: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Perlu Verifikasi Admin</p>
                    <p className="text-xs text-muted-foreground">Admin harus approve sebelum dianggap lengkap</p>
                  </div>
                  <Switch checked={form.needsVerification ?? true} onCheckedChange={v => setForm(f => ({ ...f, needsVerification: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Punya Tanggal Kadaluarsa</p>
                    <p className="text-xs text-muted-foreground">Jemaah diminta isi tanggal berlaku (paspor, visa, KTP)</p>
                  </div>
                  <Switch checked={form.hasExpiry ?? false} onCheckedChange={v => setForm(f => ({ ...f, hasExpiry: v }))} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialog({ open: false, editing: null }); setForm(EMPTY_FORM); }}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan..." : dialog.editing ? "Simpan Perubahan" : "Tambah Dokumen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Jenis Dokumen</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Yakin ingin menghapus <strong>"{deleteConfirm?.label}"</strong>?<br />
            Data dokumen jemaah yang sudah ada tidak akan ikut terhapus.<br />
            Pertimbangkan untuk <strong>menonaktifkan</strong> saja jika tidak ingin dokumen ini muncul di checklist baru.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending}
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}>
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentTypes;
