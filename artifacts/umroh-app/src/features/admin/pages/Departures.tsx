import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useToast } from "@/shared/hooks/use-toast";
import { Plus, Pencil, Trash2, Calendar, Users, DollarSign, Search, Images, FileDown } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import AdminPagination from "@/features/admin/components/AdminPagination";
import { useAdminPagination } from "@/features/admin/hooks/useAdminPagination";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";
import { Dialog as GalleryDialog, DialogContent as GalleryDialogContent, DialogHeader as GalleryDialogHeader, DialogTitle as GalleryDialogTitle } from "@/shared/components/ui/dialog";
import DepartureGalleryPanel from "@/features/admin/components/DepartureGalleryPanel";
import { useDeleteConfirm } from "@/features/admin/hooks/useDeleteConfirm";

interface Package {
  id: string;
  title: string;
}

interface Muthawif {
  id: string;
  name: string;
}

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

interface DeparturePrice {
  id: string;
  room_type: string;
  price: number;
}

const ROOM_TYPES = ["quad", "triple", "double"];

const safeFormatDate = (value: string | null | undefined, pattern: string) => {
  if (!value) return "-";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "-" : format(d, pattern, { locale: localeId });
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

  const [form, setForm] = useState({
    package_id: "",
    departure_date: "",
    return_date: "",
    quota: 45,
    status: "active",
    muthawif_id: "",
    prices: {
      quad: 0,
      triple: 0,
      double: 0,
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

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
    } catch {
      toast({ title: "Gagal memuat data", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editing) {
        await apiFetch(`/api/admin/departures/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
        toast({ title: "Keberangkatan diupdate!" });
      } else {
        await apiFetch("/api/admin/departures", {
          method: "POST",
          body: JSON.stringify(form),
        });
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
    const priceMap = { quad: 0, triple: 0, double: 0 };
    dep.prices.forEach((p) => {
      priceMap[p.room_type as keyof typeof priceMap] = p.price;
    });

    setForm({
      package_id: dep.package_id,
      departure_date: dep.departure_date,
      return_date: dep.return_date || "",
      quota: dep.quota,
      status: dep.status || "active",
      muthawif_id: dep.muthawif_id || "",
      prices: priceMap,
    });
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

  const filteredDepartures = departures.filter((d) =>
    (d.package?.title || "").toLowerCase().includes(search.toLowerCase())
  );
  const { page, setPage, totalPages, totalCount, paginatedItems, pageSize, resetPage } = useAdminPagination(filteredDepartures);
  useEffect(() => { resetPage(); }, [search]);

  const resetForm = () => {
    setEditing(null);
    setForm({
      package_id: "",
      departure_date: "",
      return_date: "",
      quota: 45,
      status: "active",
      muthawif_id: "",
      prices: { quad: 0, triple: 0, double: 0 },
    });
  };

  const formatPrice = (price: number) => `Rp ${price.toLocaleString("id-ID")}`;

  return (
    <div>
      <DeleteAlertDialog open={isDeleteOpen} onOpenChange={cancelDelete} onConfirm={() => confirmDelete(executeDelete)} title="Hapus Keberangkatan?" description="Keberangkatan dan harga terkait akan dihapus." />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Keberangkatan</h1>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari paket..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-64" />
          </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-primary">
              <Plus className="w-4 h-4 mr-2" /> Tambah Keberangkatan
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
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih paket" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>{pkg.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tanggal Berangkat *</Label>
                  <Input
                    type="date"
                    value={form.departure_date}
                    onChange={(e) => setForm({ ...form, departure_date: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Tanggal Pulang</Label>
                  <Input
                    type="date"
                    value={form.return_date}
                    onChange={(e) => setForm({ ...form, return_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kuota</Label>
                  <Input
                    type="number"
                    value={form.quota}
                    onChange={(e) => { const v = parseInt(e.target.value); setForm({ ...form, quota: Number.isNaN(v) ? form.quota : v }); }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="closed">Ditutup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Muthawif</Label>
                <Select value={form.muthawif_id} onValueChange={(val) => setForm({ ...form, muthawif_id: val })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih muthawif (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {muthawifs.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
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
                      <Label className="w-20 capitalize">{type}</Label>
                      <Input
                        type="number"
                        value={form.prices[type as keyof typeof form.prices]}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            prices: { ...form.prices, [type]: parseInt(e.target.value) || 0 },
                          })
                        }
                        placeholder="Harga"
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

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
        </div>
      ) : filteredDepartures.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">{search ? "Tidak ditemukan keberangkatan" : "Belum ada keberangkatan"}</div>
      ) : (
        <>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paket</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Kuota</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map((dep) => (
                <TableRow key={dep.id}>
                  <TableCell className="font-semibold">{dep.package?.title || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {safeFormatDate(dep.departure_date, "d MMM yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      {dep.remaining_quota}/{dep.quota}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm space-y-1">
                      {dep.prices.map((p) => (
                        <div key={p.id} className="flex gap-2">
                          <span className="capitalize text-muted-foreground w-12">{p.room_type}:</span>
                          <span>{formatPrice(p.price)}</span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      dep.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}>
                      {dep.status === "active" ? "Aktif" : "Ditutup"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" title="Galeri Foto" onClick={() => setGalleryDep(dep)}>
                        <Images className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Manifest Jemaah (PDF)"
                        onClick={() => {
                          const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
                          window.open(`${API_BASE}/api/admin/departures/${dep.id}/manifest.pdf`, "_blank");
                        }}
                      >
                        <FileDown className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(dep)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => requestDelete(dep.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <AdminPagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onPageChange={setPage} />
        </>
      )}

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
