import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useToast } from "@/shared/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Calendar, Users, DollarSign, Search,
  Images, FileDown, Copy, ArrowRight, Plane, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import AdminPagination from "@/features/admin/components/AdminPagination";
import { useAdminPagination } from "@/features/admin/hooks/useAdminPagination";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";
import { Dialog as GalleryDialog, DialogContent as GalleryDialogContent, DialogHeader as GalleryDialogHeader, DialogTitle as GalleryDialogTitle } from "@/shared/components/ui/dialog";
import DepartureGalleryPanel from "@/features/admin/components/DepartureGalleryPanel";
import { useDeleteConfirm } from "@/features/admin/hooks/useDeleteConfirm";

interface Package { id: string; title: string }
interface Muthawif { id: string; name: string }
interface DeparturePrice { id: string; room_type: string; price: number }
interface Departure {
  id: string;
  package_id: string;
  departure_date: string;
  return_date: string | null;
  quota: number;
  remaining_quota: number;
  status: string;
  muthawif_id: string | null;
  package: Package | null;
  prices: DeparturePrice[];
}

const ROOM_TYPES = ["quad", "triple", "double", "single"];
const ROOM_LABELS: Record<string, string> = { quad: "Quad", triple: "Triple", double: "Double", single: "Single" };

const quotaPercent = (remaining: number, total: number) =>
  total > 0 ? Math.round(((total - remaining) / total) * 100) : 0;

const safeFormatDate = (value: string | null | undefined, pattern: string) => {
  if (!value) return "-";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "-" : format(d, pattern, { locale: localeId });
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);

/** Filter prices: valid room type and price > 0 */
const validPrices = (prices: DeparturePrice[]) =>
  prices.filter((p) => ROOM_TYPES.includes(p.room_type) && p.price > 0);

const StatusBadge = ({ dep }: { dep: Departure }) => {
  const isFull = dep.remaining_quota === 0 || dep.status === "penuh";
  const isAlmostFull = !isFull && dep.quota > 0 && dep.remaining_quota / dep.quota <= 0.2;
  const isClosed = dep.status === "closed";

  if (isFull) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
      Penuh
    </span>
  );
  if (isAlmostFull) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
      Hampir Penuh
    </span>
  );
  if (isClosed) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
      Ditutup
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
      Tersedia
    </span>
  );
};

const QuotaBar = ({ dep }: { dep: Departure }) => {
  const pct = quotaPercent(dep.remaining_quota, dep.quota);
  const booked = dep.quota - dep.remaining_quota;
  const isFull = dep.remaining_quota === 0;
  const isAlmostFull = !isFull && dep.quota > 0 && dep.remaining_quota / dep.quota <= 0.2;
  const barColor = isFull ? "bg-red-500" : isAlmostFull ? "bg-amber-400" : "bg-emerald-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-muted-foreground font-medium">
          <Users className="w-3.5 h-3.5" />
          {booked} / {dep.quota} terisi
        </span>
        <span className={`font-semibold text-xs ${isFull ? "text-red-600" : isAlmostFull ? "text-amber-600" : "text-emerald-600"}`}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        {dep.remaining_quota > 0 ? `Sisa ${dep.remaining_quota} kursi` : "Semua kursi terisi"}
      </p>
    </div>
  );
};

const AdminDepartures = () => {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [muthawifs, setMuthawifs] = useState<Muthawif[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Departure | null>(null);
  const [search, setSearch] = useState("");
  const [galleryDep, setGalleryDep] = useState<Departure | null>(null);
  const { toast } = useToast();
  const { isDeleteOpen, requestDelete, cancelDelete, confirmDelete } = useDeleteConfirm();

  const [form, setForm] = useState<{
    package_id: string; departure_date: string; return_date: string;
    quota: number; status: string; muthawif_id: string; prices: Record<string, number>;
  }>({
    package_id: "", departure_date: "", return_date: "",
    quota: 45, status: "active", muthawif_id: "",
    prices: Object.fromEntries(ROOM_TYPES.map((t) => [t, 0])),
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [departuresRes, packagesRes, muthawifRes] = await Promise.all([
        apiFetch<{ data: Departure[] }>("/api/admin/departures"),
        apiFetch<{ data: Package[] }>("/api/packages?active=true"),
        apiFetch<{ data: Muthawif[] }>("/api/admin/masterdata/muthawifs"),
      ]);
      setDepartures(departuresRes.data || []);
      setPackages(packagesRes.data || []);
      setMuthawifs(muthawifRes.data || []);
    } catch (err: any) {
      toast({ title: "Gagal memuat data keberangkatan", description: err?.message ?? "Periksa koneksi atau coba lagi.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.return_date && form.departure_date && new Date(form.return_date) <= new Date(form.departure_date)) {
      toast({ title: "Tanggal pulang tidak valid", description: "Tanggal pulang harus setelah tanggal berangkat.", variant: "destructive" });
      return;
    }
    try {
      if (editing) {
        await apiFetch(`/api/admin/departures/${editing.id}`, { method: "PATCH", body: JSON.stringify(form) });
        toast({ title: "Keberangkatan diupdate!" });
      } else {
        await apiFetch("/api/admin/departures", { method: "POST", body: JSON.stringify(form) });
        toast({ title: "Keberangkatan ditambahkan!" });
      }
      fetchData();
      setIsOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (dep: Departure) => {
    setEditing(dep);
    const priceMap: Record<string, number> = Object.fromEntries(ROOM_TYPES.map((t) => [t, 0]));
    (dep.prices ?? []).forEach((p) => { if (ROOM_TYPES.includes(p.room_type)) priceMap[p.room_type] = p.price; });
    setForm({ package_id: dep.package_id, departure_date: dep.departure_date, return_date: dep.return_date || "", quota: dep.quota, status: dep.status || "active", muthawif_id: dep.muthawif_id || "", prices: priceMap });
    setIsOpen(true);
  };

  const executeDelete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/departures/${id}`, { method: "DELETE" });
      toast({ title: "Keberangkatan dihapus" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ package_id: "", departure_date: "", return_date: "", quota: 45, status: "active", muthawif_id: "", prices: Object.fromEntries(ROOM_TYPES.map((t) => [t, 0])) });
  };

  const filteredDepartures = departures.filter((d) =>
    (d.package?.title || "").toLowerCase().includes(search.toLowerCase())
  );
  const { page, setPage, totalPages, totalCount, paginatedItems, pageSize, resetPage } = useAdminPagination(filteredDepartures, 9);
  useEffect(() => { resetPage(); }, [search]);

  return (
    <div className="space-y-6">
      <DeleteAlertDialog open={isDeleteOpen} onOpenChange={cancelDelete} onConfirm={() => confirmDelete(executeDelete)} title="Hapus Keberangkatan?" description="Keberangkatan dan harga terkait akan dihapus permanen." />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Jadwal Keberangkatan</h1>
          {!loading && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalCount} jadwal terdaftar
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari paket..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-56 h-9"
            />
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-gold text-primary h-9 gap-2">
                <Plus className="w-4 h-4" /> Tambah Keberangkatan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Keberangkatan" : "Tambah Keberangkatan Baru"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Paket *</Label>
                  <Select value={form.package_id} onValueChange={(val) => setForm({ ...form, package_id: val })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih paket" /></SelectTrigger>
                    <SelectContent>
                      {packages.map((pkg) => (<SelectItem key={pkg.id} value={pkg.id}>{pkg.title}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tanggal Berangkat *</Label>
                    <Input type="date" value={form.departure_date} onChange={(e) => setForm({ ...form, departure_date: e.target.value })} required className="mt-1" />
                  </div>
                  <div>
                    <Label>Tanggal Pulang</Label>
                    <Input type="date" value={form.return_date} min={form.departure_date || undefined} onChange={(e) => setForm({ ...form, return_date: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Kuota</Label>
                    <Input type="number" value={form.quota} onChange={(e) => { const v = parseInt(e.target.value); setForm({ ...form, quota: Number.isNaN(v) ? form.quota : v }); }} className="mt-1" />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Aktif</SelectItem>
                        <SelectItem value="closed">Ditutup</SelectItem>
                        <SelectItem value="penuh">Penuh</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Muthawif</Label>
                  <Select value={form.muthawif_id} onValueChange={(val) => setForm({ ...form, muthawif_id: val })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih muthawif (opsional)" /></SelectTrigger>
                    <SelectContent>
                      {muthawifs.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="border-t pt-4">
                  <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                    <DollarSign className="w-4 h-4" /> Harga per Tipe Kamar
                  </Label>
                  <div className="space-y-3">
                    {ROOM_TYPES.map((type) => (
                      <div key={type} className="flex items-center gap-3">
                        <Label className="w-20 capitalize">{ROOM_LABELS[type]}</Label>
                        <Input
                          type="number"
                          value={form.prices[type]}
                          onChange={(e) => setForm({ ...form, prices: { ...form.prices, [type]: parseInt(e.target.value) || 0 } })}
                          placeholder="0"
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                  <Button type="submit" className="gradient-gold text-primary">Simpan</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3 animate-pulse">
              <div className="h-5 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-2 bg-muted rounded" />
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="h-8 bg-muted rounded" />
                <div className="h-8 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredDepartures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground border border-dashed border-border rounded-xl bg-muted/30">
          <Plane className="w-10 h-10 mb-3 opacity-30" />
          <p className="font-medium">{search ? `Tidak ditemukan jadwal untuk "${search}"` : "Belum ada jadwal keberangkatan"}</p>
          {!search && <p className="text-sm mt-1">Klik "Tambah Keberangkatan" untuk memulai</p>}
        </div>
      ) : (
        <>
          {/* Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedItems.map((dep) => {
              const prices = validPrices(dep.prices);
              const lowestPrice = prices.length > 0 ? Math.min(...prices.map((p) => p.price)) : null;

              return (
                <div key={dep.id} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
                  {/* Card Header */}
                  <div className="px-5 pt-5 pb-4 border-b border-border/60">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm leading-tight truncate" title={dep.package?.title || "-"}>
                          {dep.package?.title || "-"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground text-xs">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>{safeFormatDate(dep.departure_date, "d MMM yyyy")}</span>
                          {dep.return_date && (
                            <>
                              <ArrowRight className="w-3 h-3 shrink-0" />
                              <span>{safeFormatDate(dep.return_date, "d MMM yyyy")}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <StatusBadge dep={dep} />
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="px-5 py-4 space-y-4">
                    {/* Quota */}
                    <QuotaBar dep={dep} />

                    {/* Prices */}
                    {prices.length > 0 ? (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" /> Harga per Kamar
                        </p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {prices.map((p) => (
                            <div key={p.id} className="flex items-baseline justify-between text-xs">
                              <span className="text-muted-foreground">{ROOM_LABELS[p.room_type] ?? p.room_type}</span>
                              <span className="font-medium tabular-nums">{formatPrice(p.price)}</span>
                            </div>
                          ))}
                        </div>
                        {lowestPrice !== null && (
                          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/60">
                            Mulai dari <span className="font-semibold text-foreground">{formatPrice(lowestPrice)}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Harga belum diatur</p>
                    )}
                  </div>

                  {/* Card Footer — Actions */}
                  <div className="px-4 py-3 bg-muted/30 border-t border-border/60 flex items-center justify-between">
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Galeri Foto" onClick={() => setGalleryDep(dep)}
                      >
                        <Images className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Duplikat Keberangkatan"
                        onClick={async () => {
                          try {
                            await apiFetch(`/api/admin/departures/${dep.id}/clone`, { method: "POST" });
                            toast({ title: "Keberangkatan berhasil diduplikat" });
                            fetchData();
                          } catch (err: any) {
                            toast({ title: "Gagal menduplikat", description: err?.message, variant: "destructive" });
                          }
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Unduh Manifest PDF"
                        onClick={() => window.open(`/api/admin/departures/${dep.id}/manifest.pdf`, "_blank")}
                      >
                        <FileDown className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
                        onClick={() => handleEdit(dep)}
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => requestDelete(dep.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <AdminPagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onPageChange={setPage} />
        </>
      )}

      {/* Gallery Dialog */}
      <GalleryDialog open={!!galleryDep} onOpenChange={(o) => !o && setGalleryDep(null)}>
        <GalleryDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <GalleryDialogHeader>
            <GalleryDialogTitle>Galeri Foto — {galleryDep?.package?.title}</GalleryDialogTitle>
          </GalleryDialogHeader>
          {galleryDep && (
            <DepartureGalleryPanel
              departureId={galleryDep.id}
              departureLabel={safeFormatDate(galleryDep.departure_date, "d MMMM yyyy")}
            />
          )}
        </GalleryDialogContent>
      </GalleryDialog>
    </div>
  );
};

export default AdminDepartures;
