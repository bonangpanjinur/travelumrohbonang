import { useEffect, useState, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/hooks/use-toast";
import { Search, Eye, Users, Calendar, Phone, Mail, CreditCard, Download, Plus, Pencil, Loader2 } from "lucide-react";
import { exportToCsv } from "@/shared/lib/exportCsv";
import { Badge } from "@/shared/components/ui/badge";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import AdminPagination from "@/features/admin/components/AdminPagination";
import { useAdminPagination } from "@/features/admin/hooks/useAdminPagination";
import { apiFetch } from "@/shared/lib/apiClient";
import { supabase } from "@/shared/integrations/supabase/client";

interface Pilgrim {
  id: string;
  name: string;
  nik: string | null;
  phone: string | null;
  email: string | null;
  gender: string | null;
  birthDate: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  bookingId: string | null;
  createdAt: string;
  booking?: {
    id: string;
    bookingCode: string;
    status: string;
    totalPrice: number;
    packageTitle?: string | null;
    departureDate?: string | null;
  } | null;
}

interface BookingOption {
  id: string;
  booking_code: string;
  package_title: string;
}

const EMPTY_FORM = {
  name: "",
  nik: "",
  phone: "",
  email: "",
  gender: "",
  birth_date: "",
  passport_number: "",
  passport_expiry: "",
  booking_id: "",
};

type FormState = typeof EMPTY_FORM;

const AdminPilgrims = () => {
  const [pilgrims, setPilgrims] = useState<Pilgrim[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPilgrim, setSelectedPilgrim] = useState<Pilgrim | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { toast } = useToast();

  // Form dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Booking options for dropdown
  const [bookings, setBookings] = useState<BookingOption[]>([]);
  const [bookingSearch, setBookingSearch] = useState("");

  const fetchPilgrims = useCallback(async () => {
    try {
      const data = await apiFetch<Pilgrim[]>("/api/admin/pilgrims");
      setPilgrims(data || []);
    } catch (err: any) {
      toast({ title: "Gagal memuat data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchBookings = useCallback(async () => {
    try {
      const data = await apiFetch<any[]>("/api/admin/bookings");
      setBookings(
        (data || []).map((b: any) => ({
          id: b.id,
          booking_code: b.bookingCode,
          package_title: b.packageTitle || "-",
        }))
      );
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchPilgrims();
    fetchBookings();
  }, [fetchPilgrims, fetchBookings]);

  const filteredPilgrims = pilgrims.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.name ?? "").toLowerCase().includes(q) ||
      (p.nik ?? "").toLowerCase().includes(q) ||
      (p.passportNumber ?? "").toLowerCase().includes(q) ||
      (p.phone ?? "").toLowerCase().includes(q) ||
      (p.email ?? "").toLowerCase().includes(q) ||
      (p.booking?.bookingCode ?? "").toLowerCase().includes(q)
    );
  });

  const { page, setPage, totalPages, totalCount, paginatedItems, pageSize, resetPage } =
    useAdminPagination(filteredPilgrims);
  useEffect(() => { resetPage(); }, [search]);

  const filteredBookings = bookings.filter(
    (b) =>
      b.booking_code.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.package_title.toLowerCase().includes(bookingSearch.toLowerCase())
  );

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setBookingSearch("");
    setFormOpen(true);
  };

  const openEdit = (pilgrim: Pilgrim) => {
    setEditingId(pilgrim.id);
    setForm({
      name: pilgrim.name ?? "",
      nik: pilgrim.nik ?? "",
      phone: pilgrim.phone ?? "",
      email: pilgrim.email ?? "",
      gender: pilgrim.gender ?? "",
      birth_date: pilgrim.birthDate ?? "",
      passport_number: pilgrim.passportNumber ?? "",
      passport_expiry: pilgrim.passportExpiry ?? "",
      booking_id: pilgrim.bookingId ?? "",
    });
    setBookingSearch(pilgrim.booking?.bookingCode ?? "");
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Nama wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      nik: form.nik.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      gender: form.gender || null,
      birthDate: form.birth_date || null,
      passportNumber: form.passport_number.trim() || null,
      passportExpiry: form.passport_expiry || null,
      bookingId: form.booking_id || null,
    };

    try {
      if (editingId) {
        await apiFetch(`/api/admin/pilgrims/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/admin/pilgrims", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      toast({ title: editingId ? "Jemaah berhasil diperbarui" : "Jemaah berhasil ditambahkan" });
      setFormOpen(false);
      fetchPilgrims();
    } catch (err: any) {
      toast({ title: "Gagal menyimpan", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const showDetail = (pilgrim: Pilgrim) => {
    setSelectedPilgrim(pilgrim);
    setDetailOpen(true);
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "confirmed": return "bg-success/10 text-success border-success/20";
      case "pending": return "bg-warning/10 text-warning border-warning/20";
      case "cancelled": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const field = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Daftar Jemaah</h1>
          <p className="text-muted-foreground">Total {filteredPilgrims.length} jemaah ditemukan</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" /> Tambah Jemaah
          </Button>
          <Button variant="outline" onClick={() => {
            const headers = ["Nama", "Gender", "NIK", "No. Paspor", "Telepon", "Email", "Kode Booking", "Paket"];
            const rows = filteredPilgrims.map(p => [
              p.name, p.gender === "male" ? "L" : p.gender === "female" ? "P" : "-",
              p.nik || "-", p.passportNumber || "-", p.phone || "-", p.email || "-",
              p.booking?.bookingCode || "-", p.booking?.packageTitle || "-"
            ]);
            exportToCsv("jemaah", headers, rows);
          }}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, NIK, paspor, booking..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : filteredPilgrims.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-4">
            {search ? "Tidak ada jemaah yang cocok dengan pencarian" : "Belum ada data jemaah"}
          </p>
          {!search && (
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" /> Tambah Jemaah Pertama
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Jemaah</TableHead>
                    <TableHead>NIK / Paspor</TableHead>
                    <TableHead>Kontak</TableHead>
                    <TableHead>Kode Booking</TableHead>
                    <TableHead>Paket</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((pilgrim) => (
                    <TableRow key={pilgrim.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold">{pilgrim.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {pilgrim.gender === "male" ? "Laki-laki" : pilgrim.gender === "female" ? "Perempuan" : "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>NIK: {pilgrim.nik || "-"}</p>
                          <p>Paspor: {pilgrim.passportNumber || "-"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{pilgrim.phone || "-"}</p>
                          <p className="text-muted-foreground">{pilgrim.email || "-"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {pilgrim.booking?.bookingCode || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{pilgrim.booking?.packageTitle || "-"}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(pilgrim.booking?.status)}>
                          {pilgrim.booking?.status || "draft"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(pilgrim)} title="Edit">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => showDetail(pilgrim)} title="Detail">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <AdminPagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onPageChange={setPage} />
        </>
      )}

      {/* ── Form Dialog: Tambah / Edit Jemaah ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Jemaah" : "Tambah Jemaah"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Informasi Pribadi */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Informasi Pribadi</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Nama Lengkap <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="Sesuai KTP / Paspor"
                    value={form.name}
                    onChange={(e) => field("name", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Jenis Kelamin</Label>
                  <Select value={form.gender} onValueChange={(v) => field("gender", v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Pilih..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Laki-laki</SelectItem>
                      <SelectItem value="female">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tanggal Lahir</Label>
                  <Input
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => field("birth_date", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>No. Telepon</Label>
                  <Input
                    placeholder="08xx-xxxx-xxxx"
                    value={form.phone}
                    onChange={(e) => field("phone", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="email@contoh.com"
                    value={form.email}
                    onChange={(e) => field("email", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Dokumen */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Dokumen</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>NIK</Label>
                  <Input
                    placeholder="16 digit NIK"
                    maxLength={16}
                    value={form.nik}
                    onChange={(e) => field("nik", e.target.value)}
                    className="mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label>No. Paspor</Label>
                  <Input
                    placeholder="A1234567"
                    value={form.passport_number}
                    onChange={(e) => field("passport_number", e.target.value)}
                    className="mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label>Masa Berlaku Paspor</Label>
                  <Input
                    type="date"
                    value={form.passport_expiry}
                    onChange={(e) => field("passport_expiry", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Link ke Booking */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Hubungkan ke Booking (opsional)</p>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari kode booking atau nama paket..."
                    value={bookingSearch}
                    onChange={(e) => {
                      setBookingSearch(e.target.value);
                      // clear selection if user clears the search
                      if (!e.target.value) field("booking_id", "");
                    }}
                    className="pl-10"
                  />
                </div>
                {bookingSearch && filteredBookings.length > 0 && !form.booking_id && (
                  <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    {filteredBookings.slice(0, 20).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          field("booking_id", b.id);
                          setBookingSearch(b.booking_code);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center justify-between gap-2 border-b last:border-0"
                      >
                        <span className="font-mono font-semibold">{b.booking_code}</span>
                        <span className="text-muted-foreground truncate">{b.package_title}</span>
                      </button>
                    ))}
                  </div>
                )}
                {form.booking_id && (
                  <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5">
                    <span className="text-sm">
                      Terhubung ke booking: <span className="font-mono font-semibold">{bookingSearch}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => { field("booking_id", ""); setBookingSearch(""); }}
                      className="text-xs text-muted-foreground hover:text-destructive ml-2"
                    >
                      Lepas
                    </button>
                  </div>
                )}
                {!form.booking_id && !bookingSearch && (
                  <p className="text-xs text-muted-foreground">Jemaah bisa ditambahkan tanpa booking terlebih dahulu.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? "Simpan Perubahan" : "Tambah Jemaah"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Jemaah</DialogTitle>
          </DialogHeader>
          {selectedPilgrim && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-3">INFORMASI PRIBADI</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">{selectedPilgrim.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedPilgrim.gender === "male" ? "Laki-laki" : selectedPilgrim.gender === "female" ? "Perempuan" : "Tidak disebutkan"}
                      </p>
                    </div>
                  </div>
                  {selectedPilgrim.birthDate && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <p>{format(new Date(selectedPilgrim.birthDate), "dd MMMM yyyy", { locale: idLocale })}</p>
                    </div>
                  )}
                  {selectedPilgrim.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                      <p>{selectedPilgrim.phone}</p>
                    </div>
                  )}
                  {selectedPilgrim.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <p>{selectedPilgrim.email}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-3">DOKUMEN</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">NIK</p>
                      <p className="font-mono">{selectedPilgrim.nik || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">No. Paspor</p>
                      <p className="font-mono">{selectedPilgrim.passportNumber || "-"}</p>
                    </div>
                  </div>
                  {selectedPilgrim.passportExpiry && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Masa Berlaku Paspor</p>
                        <p>{format(new Date(selectedPilgrim.passportExpiry), "dd MMMM yyyy", { locale: idLocale })}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedPilgrim.booking && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-3">INFORMASI BOOKING</h4>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kode Booking</span>
                      <span className="font-mono font-semibold">{selectedPilgrim.booking.bookingCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paket</span>
                      <span>{selectedPilgrim.booking.packageTitle || "-"}</span>
                    </div>
                    {selectedPilgrim.booking.departureDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Keberangkatan</span>
                        <span>{format(new Date(selectedPilgrim.booking.departureDate), "dd MMM yyyy", { locale: idLocale })}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge className={getStatusColor(selectedPilgrim.booking.status)}>
                        {selectedPilgrim.booking.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-muted-foreground">Total Harga</span>
                      <span className="font-semibold">
                        Rp {selectedPilgrim.booking.totalPrice?.toLocaleString("id-ID") || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => {
                  setDetailOpen(false);
                  openEdit(selectedPilgrim);
                }}>
                  <Pencil className="w-4 h-4 mr-2" /> Edit Jemaah
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPilgrims;
