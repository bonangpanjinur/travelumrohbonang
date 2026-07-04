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
import { useToast } from "@/shared/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, ChevronDown, ChevronUp, Hotel, X, Search, Download, ExternalLink } from "lucide-react";
import { exportToCsv } from "@/shared/lib/exportCsv";
import { Link } from "react-router-dom";
import PackageCommissions from "@/features/admin/components/PackageCommissions";
import AdminPagination from "@/features/admin/components/AdminPagination";
import { useAdminPagination } from "@/features/admin/hooks/useAdminPagination";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";
import { useDeleteConfirm } from "@/features/admin/hooks/useDeleteConfirm";
import { useFormDraft } from "@/features/admin/hooks/useFormDraft";
import { FormDraftBanner } from "@/features/admin/components/FormDraftBanner";
import { ConfirmDiscardDialog } from "@/features/admin/components/ConfirmDiscardDialog";

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
  hotel_makkah_id: string | null;
  hotel_madinah_id: string | null;
  airline_id: string | null;
  airport_id: string | null;
  image_url?: string | null;
}

interface Option { id: string; name: string; show_extra_hotels?: boolean | null; is_active?: boolean | null; }
interface HotelOption extends Option { city: string | null; }

interface ExtraHotel {
  id?: string;
  hotel_id: string;
  label: string;
  sort_order: number;
}

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
  hotel_makkah_id: "",
  hotel_madinah_id: "",
  airline_id: "",
  airport_id: "",
  image_url: "",
};

type FormData = typeof EMPTY_FORM;

// Draft combines the main form + the extra-hotels list
type PackageDraft = FormData & { __extraHotels: ExtraHotel[] };

// ── Component ─────────────────────────────────────────────────────────────────

const AdminPackages = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [expandedCommission, setExpandedCommission] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const { isDeleteOpen, requestDelete, cancelDelete, confirmDelete } = useDeleteConfirm();

  const filteredPackages = packages.filter((p) =>
    (p.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (p.package_type ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const { page, setPage, totalPages, totalCount, paginatedItems, pageSize, resetPage } = useAdminPagination(filteredPackages);
  useEffect(() => { resetPage(); }, [search]);

  const [categories, setCategories] = useState<Option[]>([]);
  const [hotels, setHotels] = useState<HotelOption[]>([]);
  const [airlines, setAirlines] = useState<Option[]>([]);
  const [airports, setAirports] = useState<(Option & { code: string | null })[]>([]);
  const [extraHotels, setExtraHotels] = useState<ExtraHotel[]>([]);

  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  // ── Draft auto-save / restore ─────────────────────────────────────────────
  // Key switches between "new" and "edit-{id}" so each package gets its own draft.
  const draftKey = editing ? `admin-packages-edit-${editing.id}` : "admin-packages-new";

  // Merge form + extra hotels into one object to persist them together.
  const draftValue: PackageDraft = { ...form, __extraHotels: extraHotels };

  const handleDraftRestore = useCallback((saved: PackageDraft) => {
    const { __extraHotels, ...savedForm } = saved;
    setForm(savedForm as FormData);
    setExtraHotels(__extraHotels || []);
  }, []);

  const { hasDraft, restoreDraft, clearDraft, isDirty, markClean } = useFormDraft<PackageDraft>({
    key: draftKey,
    value: draftValue,
    onRestore: handleDraftRestore,
    isEmpty: (v) => !v.title.trim(),
  });

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchPackages();
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    const [catRes, hotelRes, airlineRes, airportRes] = await Promise.all([
      apiFetch<{ data: Option[] }>("/api/admin/masterdata/categories"),
      apiFetch<{ data: HotelOption[] }>("/api/admin/masterdata/hotels"),
      apiFetch<{ data: Option[] }>("/api/admin/masterdata/airlines"),
      apiFetch<{ data: (Option & { code: string | null })[] }>("/api/admin/masterdata/airports"),
    ]);
    setCategories(catRes.data || []);
    setHotels(hotelRes.data || []);
    setAirlines(airlineRes.data || []);
    setAirports(airportRes.data || []);
  };

  const fetchPackages = async () => {
    const { data } = await apiFetch<{ data: Package[] }>("/api/admin/packages");
    setPackages(data || []);
    setLoading(false);
  };

  const fetchExtraHotels = async (packageId: string) => {
    const { data } = await apiFetch<{ data: ExtraHotel[] }>(`/api/admin/packages/${packageId}/extra-hotels`);
    setExtraHotels(data || []);
  };

  // Check if selected category needs extra hotels (driven by admin setting, not name matching)
  const selectedCategory = categories.find(c => c.id === form.category_id);
  const showExtraHotels = selectedCategory?.show_extra_hotels ?? false;

  const makkahHotels = hotels.filter(h => h.city === "Makkah");
  const madinahHotels = hotels.filter(h => h.city === "Madinah");

  // ── Form helpers ──────────────────────────────────────────────────────────

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      title: form.title,
      slug: form.slug || (form.title ?? "").toLowerCase().replace(/\s+/g, "-"),
      description: form.description || null,
      package_type: form.package_type || null,
      duration_days: form.duration_days,
      category_id: form.category_id || null,
      hotel_makkah_id: form.hotel_makkah_id || null,
      hotel_madinah_id: form.hotel_madinah_id || null,
      airline_id: form.airline_id || null,
      airport_id: form.airport_id || null,
      image_url: form.image_url || null,
    };
    if (form.minimum_dp !== 0) payload.minimum_dp = form.minimum_dp;
    if (form.dp_deadline_days !== 30) payload.dp_deadline_days = form.dp_deadline_days;
    if (form.full_deadline_days !== 7) payload.full_deadline_days = form.full_deadline_days;
    return payload;
  };

  const saveExtraHotels = async (packageId: string) => {
    await apiFetch(`/api/admin/packages/${packageId}/extra-hotels`, {
      method: "POST",
      body: JSON.stringify({
        hotels: extraHotels.map((eh, i) => ({
          hotel_id: eh.hotel_id,
          label: eh.label || null,
          sort_order: i,
        })),
      }),
    });
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
        await saveExtraHotels(editing.id);
        clearDraft();
        toast({ title: "Paket diupdate!" });
        fetchPackages();
        setIsOpen(false);
        resetForm();
      } else {
        const data = await apiFetch<any>("/api/admin/packages", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (data?.id) await saveExtraHotels(data.id);
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
      hotel_makkah_id: pkg.hotel_makkah_id || "",
      hotel_madinah_id: pkg.hotel_madinah_id || "",
      airline_id: pkg.airline_id || "",
      airport_id: pkg.airport_id || "",
      image_url: pkg.image_url || "",
    });
    await fetchExtraHotels(pkg.id);
    // Capture the freshly-loaded DB values as the clean baseline AFTER all
    // async data (extraHotels) is in state — so the dirty dot only lights up
    // when the admin actually edits something, not just from opening the form.
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
    setExtraHotels([]);
    setForm(EMPTY_FORM);
    clearDraft();
  };

  const addExtraHotel = () => {
    setExtraHotels([...extraHotels, { hotel_id: "", label: "", sort_order: extraHotels.length }]);
  };

  const updateExtraHotel = (index: number, field: keyof ExtraHotel, value: string) => {
    const updated = [...extraHotels];
    (updated[index] as any)[field] = value;
    if (field === "hotel_id" && value) {
      const hotel = hotels.find(h => h.id === value);
      if (hotel && !updated[index].label) {
        updated[index].label = `Hotel ${hotel.city || "Tambahan"}`;
      }
    }
    setExtraHotels(updated);
  };

  const removeExtraHotel = (index: number) => {
    setExtraHotels(extraHotels.filter((_, i) => i !== index));
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
    <div>
      <DeleteAlertDialog open={isDeleteOpen} onOpenChange={cancelDelete} onConfirm={() => confirmDelete(executeDelete)} title="Hapus Paket?" description="Paket yang dihapus tidak dapat dikembalikan." />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Paket</h1>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => {
            const headers = ["Nama Paket", "Tipe", "Durasi (Hari)", "Min DP", "Status", "Slug"];
            const rows = filteredPackages.map(p => [
              p.title, p.package_type || "-", String(p.duration_days),
              String(p.minimum_dp || 0), p.is_active ? "Aktif" : "Nonaktif", p.slug
            ]);
            exportToCsv("packages", headers, rows);
          }}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari paket..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-64" />
          </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-primary">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Hotel Makkah</Label>
                  <Select value={form.hotel_makkah_id || undefined} onValueChange={(v) => setForm({ ...form, hotel_makkah_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Hotel" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {makkahHotels.filter(h => h.id).map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Hotel Madinah</Label>
                  <Select value={form.hotel_madinah_id || undefined} onValueChange={(v) => setForm({ ...form, hotel_madinah_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Hotel" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {madinahHotels.filter(h => h.id).map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Extra Hotels — shown when category is Plus or Haji */}
              {showExtraHotels && (
                <div className="border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hotel className="w-4 h-4 text-gold" />
                      <Label className="font-semibold">Hotel Tambahan</Label>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addExtraHotel}>
                      <Plus className="w-3 h-3 mr-1" /> Tambah
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tambahkan hotel di kota tujuan lain (misal: Istanbul, Cappadocia, Mina, dll)
                  </p>
                  {extraHotels.map((eh, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Select value={eh.hotel_id || undefined} onValueChange={(v) => updateExtraHotel(index, "hotel_id", v)}>
                          <SelectTrigger className="text-sm"><SelectValue placeholder="Pilih Hotel" /></SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            {hotels.filter(h => h.id).map(h => (
                              <SelectItem key={h.id} value={h.id}>{h.name} - {h.city}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Input
                          value={eh.label}
                          onChange={(e) => updateExtraHotel(index, "label", e.target.value)}
                          placeholder="Label (misal: Hotel Istanbul)"
                          className="text-sm"
                        />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeExtraHotel(index)} className="shrink-0">
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Maskapai</Label>
                  <Select value={form.airline_id || undefined} onValueChange={(v) => setForm({ ...form, airline_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Maskapai" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {airlines.filter(a => a.id).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Bandara</Label>
                  <Select value={form.airport_id || undefined} onValueChange={(v) => setForm({ ...form, airport_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Bandara" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {airports.filter(a => a.id).map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.code})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Durasi (hari)</Label>
                <Input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: parseInt(e.target.value) })} className="mt-1" />
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
                        className="absolute inset-0 opacity-0 cursor-pointer"
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
                            className="absolute inset-0 opacity-0 cursor-pointer"
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
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">{search ? "Tidak ditemukan paket" : "Belum ada paket"}</div>
      ) : (
        <>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Paket</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Durasi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map((pkg) => (
                <React.Fragment key={pkg.id}>
                  <TableRow>
                    <TableCell className="font-semibold">{pkg.title}</TableCell>
                    <TableCell>{pkg.package_type || "-"}</TableCell>
                    <TableCell>{pkg.duration_days} hari</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${pkg.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {pkg.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setExpandedCommission(expandedCommission === pkg.id ? null : pkg.id)} title="Komisi">
                          {expandedCommission === pkg.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                        <Link to={`/paket/${pkg.slug}`} target="_blank">
                          <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(pkg)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => requestDelete(pkg.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedCommission === pkg.id && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-muted/50 p-4">
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
