import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { supabase } from "@/shared/integrations/supabase/client";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { useToast } from "@/shared/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, ChevronDown, ChevronUp, Search, Download, ExternalLink, Copy, Package, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { exportToCsv } from "@/shared/lib/exportCsv";
import { Link } from "react-router-dom";
import PackageCommissions from "@/features/admin/components/PackageCommissions";
import AdminPagination from "@/features/admin/components/AdminPagination";
import { useAdminPagination } from "@/features/admin/hooks/useAdminPagination";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";
import { useDeleteConfirm } from "@/features/admin/hooks/useDeleteConfirm";
import { useFormDraft } from "@/features/admin/hooks/useFormDraft";
import { FormDraftBanner } from "@/features/admin/components/FormDraftBanner";

interface Package {
  id: string;
  title: string;
  slug: string;
  description: string;
  package_type: string;
  duration_days: number;
  minimum_dp: number;
  dp_deadline_days: number;
  full_deadline_days: number;
  is_active: boolean;
  created_at: string;
  category_id: string | null;
  image_url?: string | null;
}

interface Option { id: string; name: string; show_extra_hotels?: boolean | null; is_active?: boolean | null; }

// ── Form shape ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: "",
  slug: "",
  description: "",
  package_type: "",
  duration_days: 9,
  minimum_dp: 0,
  dp_deadline_days: 30,
  full_deadline_days: 7,
  category_id: "",
  image_url: "",
};

type FormData = typeof EMPTY_FORM;

// API returns camelCase (from Drizzle schema); UI works with snake_case.
const mapPackageFromApi = (p: any): Package => ({
  id: p.id,
  title: p.title,
  slug: p.slug,
  description: p.description,
  package_type: p.packageType,
  duration_days: p.durationDays,
  minimum_dp: p.minimumDp,
  dp_deadline_days: p.dpDeadlineDays,
  full_deadline_days: p.fullDeadlineDays,
  is_active: p.isActive,
  created_at: p.createdAt,
  category_id: p.categoryId,
  image_url: p.imageUrl,
});

// ── Component ─────────────────────────────────────────────────────────────────

const AdminPackages = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [expandedCommission, setExpandedCommission] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const { toast } = useToast();
  const { isDeleteOpen, requestDelete, cancelDelete, confirmDelete } = useDeleteConfirm();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const activeCount   = packages.filter(p => p.is_active !== false).length;
  const inactiveCount = packages.filter(p => p.is_active === false).length;

  const filteredPackages = packages.filter((p) => {
    const matchesSearch =
      (p.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.package_type ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && p.is_active !== false) ||
      (statusFilter === "inactive" && p.is_active === false);
    return matchesSearch && matchesStatus;
  });
  const { page, setPage, totalPages, totalCount, paginatedItems, pageSize, resetPage } = useAdminPagination(filteredPackages);
  useEffect(() => { resetPage(); }, [search, statusFilter]);

  const [categories, setCategories] = useState<Option[]>([]);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  // ── Draft auto-save / restore ─────────────────────────────────────────────
  const draftKey = editing ? `admin-packages-edit-${editing.id}` : "admin-packages-new";

  const { hasDraft, restoreDraft, clearDraft, isDirty, markClean } = useFormDraft<FormData>({
    key: draftKey,
    value: form,
    onRestore: useCallback((saved: FormData) => { setForm(saved); }, []),
    isEmpty: (v) => !v.title.trim(),
  });

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchPackages();
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const catRes = await apiFetch<{ data: any[] }>("/api/admin/masterdata/categories");
      setCategories((catRes.data || []).map((c) => ({
        id: c.id,
        name: c.name,
        show_extra_hotels: c.showExtraHotels,
        is_active: c.isActive,
      })));
    } catch (error: any) {
      toast({ title: "Gagal memuat data referensi", description: error.message, variant: "destructive" });
    }
  };

  const fetchPackages = async () => {
    try {
      const { data } = await apiFetch<{ data: any[] }>("/api/admin/packages");
      setPackages((data || []).map(mapPackageFromApi));
    } catch (error: any) {
      toast({ title: "Gagal memuat paket", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Form helpers ──────────────────────────────────────────────────────────

  const buildPayload = () => {
    return {
      title: form.title,
      slug: form.slug || (form.title ?? "").toLowerCase().replace(/\s+/g, "-"),
      description: form.description || null,
      packageType: form.package_type || null,
      durationDays: form.duration_days,
      categoryId: form.category_id || null,
      imageUrl: form.image_url || null,
      minimumDp: form.minimum_dp,
      dpDeadlineDays: form.dp_deadline_days,
      fullDeadlineDays: form.full_deadline_days,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();

    try {
      if (editing) {
        await apiFetch(`/api/admin/packages/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        clearDraft();
        toast({ title: "Paket diupdate!" });
        fetchPackages();
        setIsOpen(false);
        resetForm();
      } else {
        await apiFetch<any>("/api/admin/packages", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        clearDraft();
        toast({ title: "Paket ditambahkan!" });
        fetchPackages();
        setIsOpen(false);
        resetForm();
      }
    } catch (error: any) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = async (pkg: Package) => {
    setEditing(pkg);
    setForm({
      title: pkg.title,
      slug: pkg.slug,
      description: pkg.description || "",
      package_type: pkg.package_type || "",
      duration_days: pkg.duration_days,
      minimum_dp: pkg.minimum_dp || 0,
      dp_deadline_days: pkg.dp_deadline_days || 30,
      full_deadline_days: pkg.full_deadline_days || 7,
      category_id: pkg.category_id || "",
      image_url: pkg.image_url || "",
    });
    markClean();
    setIsOpen(true);
  };

  const executeDelete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/packages/${id}`, { method: "DELETE" });
      toast({ title: "Paket dihapus" });
      fetchPackages();
    } catch (error: any) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    clearDraft();
  };

  // ── P3-07: Bulk Status ─────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.length === paginatedItems.length && paginatedItems.length > 0
      ? [] : paginatedItems.map((p) => p.id));
  };
  const handleBulkStatus = async (isActive: boolean) => {
    if (selectedIds.length === 0) return;
    try {
      await apiFetch("/api/admin/packages/bulk-status", {
        method: "PATCH",
        body: JSON.stringify({ ids: selectedIds, isActive }),
      });
      toast({ title: `${selectedIds.length} paket ${isActive ? "diaktifkan" : "dinonaktifkan"}` });
      setSelectedIds([]);
      fetchPackages();
    } catch (err: any) {
      toast({ title: "Gagal mengubah status", description: err.message, variant: "destructive" });
    }
  };

  // ── P3-08: Clone ───────────────────────────────────────────────────────────
  const handleClone = async (pkg: Package) => {
    try {
      const res = await apiFetch<{ id: string; title: string; slug: string }>(
        `/api/admin/packages/${pkg.id}/clone`,
        { method: "POST" }
      );
      toast({ title: `Paket "${res.title}" berhasil diduplikat` });
      fetchPackages();
    } catch (err: any) {
      toast({ title: "Gagal menduplikat paket", description: err.message, variant: "destructive" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `package-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cms-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('cms-images')
        .getPublicUrl(filePath);

      setForm(f => ({ ...f, image_url: publicUrl }));
      toast({ title: "Foto berhasil diunggah!" });
    } catch (error: any) {
      toast({ title: "Gagal mengunggah foto", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <DeleteAlertDialog open={isDeleteOpen} onOpenChange={cancelDelete} onConfirm={() => confirmDelete(executeDelete)} title="Hapus Paket?" description="Paket yang dihapus tidak dapat dikembalikan." />

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Paket</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kelola semua paket perjalanan (Umroh, Haji, Wisata)</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-primary shrink-0">
              <Plus className="w-4 h-4 mr-2" /> Tambah Paket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editing ? "Edit Paket" : "Tambah Paket Baru"}
                {isDirty && (
                  <span className="flex items-center gap-1.5 text-xs font-normal text-amber-600 dark:text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Belum disimpan
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            {/* Draft recovery banner */}
            {hasDraft && (
              <FormDraftBanner onRestore={restoreDraft} onDiscard={clearDraft} />
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nama Paket *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="mt-1" />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated jika kosong" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Kategori</Label>
                    <Link
                      to="/admin/package-categories"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                      title="Kelola Kategori"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Kelola
                    </Link>
                  </div>
                  <Select value={form.category_id || undefined} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {categories.filter(c => c.id && (c.is_active !== false || c.id === form.category_id)).map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}{c.is_active === false ? " (Nonaktif)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipe Paket</Label>
                  <Input value={form.package_type} onChange={(e) => setForm({ ...form, package_type: e.target.value })} placeholder="VIP, Reguler, Hemat" className="mt-1" />
                </div>
              </div>

              {/* Info: hotel & maskapai moved to departures */}
              <div className="flex items-start gap-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
                <span className="mt-0.5 shrink-0 text-base">ℹ️</span>
                <p>
                  <span className="font-semibold">Hotel dan maskapai diatur di setiap keberangkatan.</span>{" "}
                  Tambahkan keberangkatan di menu <strong>Jadwal Keberangkatan</strong> untuk mengatur hotel, maskapai, dan harga spesifik per tanggal.
                </p>
              </div>

              <div>
                <Label>Durasi (hari)</Label>
                <Input type="number" value={form.duration_days} onChange={(e) => { const v = parseInt(e.target.value); setForm({ ...form, duration_days: Number.isNaN(v) ? form.duration_days : v }); }} className="mt-1" />
              </div>
              <div>
                <Label>Minimal DP (Rp)</Label>
                <Input type="number" value={form.minimum_dp} onChange={(e) => setForm({ ...form, minimum_dp: parseInt(e.target.value) || 0 })} placeholder="0 = tidak ada minimal DP" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Deadline DP (hari)</Label>
                  <Input type="number" value={form.dp_deadline_days} onChange={(e) => setForm({ ...form, dp_deadline_days: parseInt(e.target.value) || 30 })} className="mt-1" />
                </div>
                <div>
                  <Label>Deadline Pelunasan (hari)</Label>
                  <Input type="number" value={form.full_deadline_days} onChange={(e) => setForm({ ...form, full_deadline_days: parseInt(e.target.value) || 7 })} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Foto Paket</Label>
                <div className="mt-1">
                  {!form.image_url ? (
                    <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer relative">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                      />
                      <div className="text-center">
                        <Plus className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Klik untuk upload foto</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group">
                      <img
                        src={form.image_url}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg border border-border"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <div className="relative">
                          <Button type="button" variant="secondary" size="sm">
                            Ganti Foto
                          </Button>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setForm(f => ({ ...f, image_url: "" }))}
                        >
                          Hapus
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                {uploading && <p className="text-xs text-gold animate-pulse mt-2">Sedang mengunggah foto...</p>}
              </div>
              <div>
                <Label>Deskripsi</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" rows={3} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                <Button type="submit" className="gradient-gold text-primary">Simpan</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Paket", value: packages.length, icon: Package, color: "text-primary", bg: "bg-primary/8" },
          { label: "Aktif",       value: activeCount,     icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Nonaktif",    value: inactiveCount,   icon: XCircle,      color: "text-muted-foreground", bg: "bg-muted/50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border border-border p-4 flex items-center gap-3 ${bg}`}>
            <div className={`rounded-lg p-2 bg-background/60 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar: filter tabs + search + export ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter tabs */}
        <div className="flex rounded-lg border border-border bg-muted/30 p-0.5 gap-0.5">
          {(["all", "active", "inactive"] as const).map((f) => {
            const labels = { all: "Semua", active: "Aktif", inactive: "Nonaktif" };
            return (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  statusFilter === f
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {labels[f]}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Cari nama / tipe..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              ✕
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const headers = ["Nama Paket", "Tipe", "Durasi (Hari)", "Min DP", "Status", "Slug"];
            const rows = filteredPackages.map(p => [
              p.title, p.package_type || "-", String(p.duration_days),
              String(p.minimum_dp || 0), p.is_active !== false ? "Aktif" : "Nonaktif", p.slug
            ]);
            exportToCsv("packages", headers, rows);
          }}>
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
          <span className="text-sm font-medium text-primary">{selectedIds.length} paket dipilih</span>
          <div className="flex gap-2 ml-2">
            <Button size="sm" variant="outline" onClick={() => handleBulkStatus(true)}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Aktifkan
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkStatus(false)}>
              <XCircle className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /> Nonaktifkan
            </Button>
          </div>
          <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground" onClick={() => setSelectedIds([])}>
            Batalkan
          </Button>
        </div>
      )}

      {/* ── Table / empty states ── */}
      {loading ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-border last:border-0 animate-pulse">
              <div className="w-4 h-4 bg-muted rounded" />
              <div className="w-12 h-12 bg-muted rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/5" />
              </div>
              <div className="h-6 w-14 bg-muted rounded-full" />
              <div className="flex gap-1">{[...Array(4)].map((_, j) => <div key={j} className="w-8 h-8 bg-muted rounded" />)}</div>
            </div>
          ))}
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center mb-4">
            <Package className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground mb-1">
            {search ? "Paket tidak ditemukan" : statusFilter !== "all" ? "Tidak ada paket di kategori ini" : "Belum ada paket"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? `Tidak ada hasil untuk "${search}"` : "Mulai dengan menambahkan paket pertama Anda"}
          </p>
          {!search && statusFilter === "all" && (
            <Button className="gradient-gold text-primary" onClick={() => setIsOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Tambah Paket
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-10 pl-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === paginatedItems.length && paginatedItems.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-border cursor-pointer"
                      title="Pilih semua"
                    />
                  </TableHead>
                  <TableHead className="font-semibold">Paket</TableHead>
                  <TableHead className="font-semibold">Tipe & Durasi</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold pr-4">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((pkg) => (
                  <React.Fragment key={pkg.id}>
                    <TableRow className="hover:bg-muted/20 transition-colors group">
                      <TableCell className="pl-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(pkg.id)}
                          onChange={() => toggleSelect(pkg.id)}
                          className="rounded border-border cursor-pointer"
                        />
                      </TableCell>

                      {/* Thumbnail + title */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-muted border border-border">
                            {pkg.image_url ? (
                              <img src={pkg.image_url} alt={pkg.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-5 h-5 text-muted-foreground/50" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-sm leading-tight">{pkg.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{pkg.slug}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Type + duration */}
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {pkg.package_type ? (
                            <Badge variant="secondary" className="w-fit text-xs capitalize">{pkg.package_type}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                          <span className="text-xs text-muted-foreground">{pkg.duration_days} hari</span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          pkg.is_active !== false
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${pkg.is_active !== false ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
                          {pkg.is_active !== false ? "Aktif" : "Nonaktif"}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="pr-4">
                        <div className="flex justify-end items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8"
                            title="Panel Komisi"
                            onClick={() => setExpandedCommission(expandedCommission === pkg.id ? null : pkg.id)}
                          >
                            {expandedCommission === pkg.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                          {/* FASE 3.3: Link to departures filtered by this package */}
                          <Link to={`/admin/departures?packageId=${pkg.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Lihat Keberangkatan">
                              <Calendar className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Link to={`/paket/${pkg.slug}`} target="_blank">
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Lihat di Frontend">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Duplikat" onClick={() => handleClone(pkg)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => handleEdit(pkg)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-destructive/10" title="Hapus" onClick={() => requestDelete(pkg.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Commission panel */}
                    {expandedCommission === pkg.id && (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-muted/30 p-4 border-t border-border">
                          <PackageCommissions packageId={pkg.id} packageTitle={pkg.title} />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
          <AdminPagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};

export default AdminPackages;
