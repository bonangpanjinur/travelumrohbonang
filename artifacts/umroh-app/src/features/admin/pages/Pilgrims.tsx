import { useEffect, useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/hooks/use-toast";
import { Search, Eye, Users, Calendar, Phone, Mail, CreditCard, Download, Plus, Pencil, Loader2, Upload, AlertCircle, CheckCircle2, FileText, Trash2, ExternalLink } from "lucide-react";
import { exportToCsv } from "@/shared/lib/exportCsv";
import { Badge } from "@/shared/components/ui/badge";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import AdminPagination from "@/features/admin/components/AdminPagination";
import { useAdminPagination } from "@/features/admin/hooks/useAdminPagination";
import { apiFetch } from "@/shared/lib/apiClient";

// ── CSV Import helpers ────────────────────────────────────────────────────────

const CSV_TEMPLATE_HEADERS = [
  "nama", "nik", "jenis_kelamin", "tanggal_lahir",
  "telepon", "email", "no_paspor", "masa_berlaku_paspor",
];

const CSV_TEMPLATE_EXAMPLE = [
  "Siti Rahayu", "3201234567890001", "female", "1980-05-15",
  "08123456789", "siti@email.com", "A1234567", "2029-12-31",
];

function downloadCsvTemplate() {
  const rows = [CSV_TEMPLATE_HEADERS, CSV_TEMPLATE_EXAMPLE];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template-import-jemaah.csv";
  a.click();
  URL.revokeObjectURL(url);
}

interface CsvRow {
  nama: string;
  nik?: string;
  jenis_kelamin?: string;
  tanggal_lahir?: string;
  telepon?: string;
  email?: string;
  no_paspor?: string;
  masa_berlaku_paspor?: string;
  [key: string]: string | undefined;
}

function mapCsvRowToPayload(row: CsvRow) {
  return {
    name:           row["nama"]?.trim() ?? "",
    nik:            row["nik"]?.trim() || null,
    gender:         row["jenis_kelamin"]?.trim() || null,
    birthDate:      row["tanggal_lahir"]?.trim() || null,
    phone:          row["telepon"]?.trim() || null,
    email:          row["email"]?.trim() || null,
    passportNumber: row["no_paspor"]?.trim() || null,
    passportExpiry: row["masa_berlaku_paspor"]?.trim() || null,
  };
}

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

  // ── Dokumen Jemaah (P3-04) ───────────────────────────────────────────────
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [docPilgrim, setDocPilgrim] = useState<Pilgrim | null>(null);
  const [pilgrimDocs, setPilgrimDocs] = useState<any[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [docUploading, setDocUploading] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // CSV Import dialog
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<CsvRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Booking options for dropdown (search-as-you-type — BUG-10)
  const [bookings, setBookings] = useState<BookingOption[]>([]);
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingSearchLoading, setBookingSearchLoading] = useState(false);
  const bookingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Cari booking saat pengguna mengetik ≥ 2 karakter (debounced 350ms)
  useEffect(() => {
    if (bookingDebounceRef.current) clearTimeout(bookingDebounceRef.current);
    const q = bookingSearch.trim();
    if (q.length < 2) {
      setBookings([]);
      return;
    }
    bookingDebounceRef.current = setTimeout(async () => {
      setBookingSearchLoading(true);
      try {
        const result = await apiFetch<{ data: any[] }>(
          `/api/admin/bookings?search=${encodeURIComponent(q)}&limit=20`
        );
        setBookings(
          (result?.data || []).map((b: any) => ({
            id: b.id,
            booking_code: b.bookingCode,
            package_title: b.packageTitle || "-",
          }))
        );
      } catch {
        setBookings([]);
      } finally {
        setBookingSearchLoading(false);
      }
    }, 350);

    return () => { if (bookingDebounceRef.current) clearTimeout(bookingDebounceRef.current); };
  }, [bookingSearch]);

  useEffect(() => {
    fetchPilgrims();
  }, [fetchPilgrims]);

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

  // Hasil booking sudah difilter di backend — tampilkan langsung (BUG-10)
  const filteredBookings = bookings;

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
    // ── Validasi form (BUG-08) ──────────────────────────────────────────────
    if (!form.name.trim()) {
      toast({ title: "Nama wajib diisi", variant: "destructive" });
      return;
    }
    if (form.nik.trim() && !/^\d{16}$/.test(form.nik.trim())) {
      toast({
        title: "NIK tidak valid",
        description: "NIK harus tepat 16 digit angka",
        variant: "destructive",
      });
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast({
        title: "Email tidak valid",
        description: "Format email tidak sesuai, contoh: nama@domain.com",
        variant: "destructive",
      });
      return;
    }
    // Terima format: 08xx, +62xx, 628xx; strip spasi & tanda pisah sebelum validasi
    const rawPhone = form.phone.trim().replace(/[\s\-().]/g, "");
    if (rawPhone && !/^(\+62|62|0)\d{8,13}$/.test(rawPhone)) {
      toast({
        title: "Nomor telepon tidak valid",
        description: "Gunakan format Indonesia, contoh: 0812-3456-7890 atau +6281234567890",
        variant: "destructive",
      });
      return;
    }
    // ───────────────────────────────────────────────────────────────────────
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

  // ── P3-04: Dokumen Jemaah helpers ────────────────────────────────────────
  const openDocDialog = async (pilgrim: Pilgrim) => {
    setDocPilgrim(pilgrim);
    setDocDialogOpen(true);
    setDocLoading(true);
    try {
      const res = await apiFetch<{ data: any[] }>(`/api/admin/pilgrim-documents?pilgrimId=${pilgrim.id}`);
      setPilgrimDocs(res.data || []);
    } catch {
      toast({ title: "Gagal memuat dokumen", variant: "destructive" });
    } finally {
      setDocLoading(false);
    }
  };

  const uploadDocFile = async (file: File, pilgrimId: string, docType: string): Promise<string> => {
    const ext = file.name.split(".").pop() || "bin";
    const filename = `${pilgrimId}-${docType}-${Date.now()}.${ext}`;
    // Gunakan FormData dan upload lewat API server (bukan hardcode Supabase Storage)
    const formData = new FormData();
    formData.append("file", file, filename);
    formData.append("pilgrimId", pilgrimId);
    formData.append("docType", docType);
    const result = await apiFetch<{ url: string }>("/api/admin/pilgrim-documents/upload", {
      method: "POST",
      body: formData,
    });
    return result.url;
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file || !docPilgrim) return;
    setDocUploading(docType);
    try {
      const fileUrl = await uploadDocFile(file, docPilgrim.id, docType);
      await apiFetch("/api/admin/pilgrim-documents", {
        method: "PUT",
        body: JSON.stringify({ pilgrimId: docPilgrim.id, bookingId: docPilgrim.bookingId || null, documentType: docType, fileUrl, status: "submitted" }),
      });
      toast({ title: `Dokumen ${docType} berhasil diupload` });
      const res = await apiFetch<{ data: any[] }>(`/api/admin/pilgrim-documents?pilgrimId=${docPilgrim.id}`);
      setPilgrimDocs(res.data || []);
    } catch (err: any) {
      toast({ title: "Gagal upload dokumen", description: err.message, variant: "destructive" });
    } finally {
      setDocUploading(null);
      e.target.value = "";
    }
  };

  const handleDocVerify = async (docId: string) => {
    try {
      const doc = pilgrimDocs.find((d: any) => d.id === docId);
      if (!doc || !docPilgrim) return;
      await apiFetch("/api/admin/pilgrim-documents", {
        method: "PUT",
        body: JSON.stringify({ pilgrimId: docPilgrim.id, documentType: doc.documentType, fileUrl: doc.fileUrl, status: "verified" }),
      });
      toast({ title: "Dokumen diverifikasi" });
      const res = await apiFetch<{ data: any[] }>(`/api/admin/pilgrim-documents?pilgrimId=${docPilgrim.id}`);
      setPilgrimDocs(res.data || []);
    } catch (err: any) {
      toast({ title: "Gagal verifikasi", description: err.message, variant: "destructive" });
    }
  };

  const handleDocDelete = async (docId: string) => {
    try {
      await apiFetch(`/api/admin/pilgrim-documents/${docId}`, { method: "DELETE" });
      toast({ title: "Dokumen dihapus" });
      setPilgrimDocs((prev) => prev.filter((d: any) => d.id !== docId));
    } catch (err: any) {
      toast({ title: "Gagal menghapus dokumen", description: err.message, variant: "destructive" });
    }
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

  // ── CSV Import handlers ───────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportErrors([]);
    setImportDone(null);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: (result) => {
        const rows = result.data as CsvRow[];
        const errs: string[] = [];
        rows.forEach((row, idx) => {
          if (!row["nama"]?.trim()) errs.push(`Baris ${idx + 2}: kolom 'nama' kosong`);
        });
        setImportRows(rows);
        setImportErrors(errs);
      },
      error: (err) => setImportErrors([`Gagal membaca file: ${err.message}`]),
    });
  };

  const handleImportSubmit = async () => {
    if (importErrors.length > 0 || importRows.length === 0) return;
    setImporting(true);
    try {
      const payload = importRows.map(mapCsvRowToPayload);
      const result = await apiFetch<{ inserted: number }>("/api/admin/pilgrims/bulk", {
        method: "POST",
        body: JSON.stringify({ pilgrims: payload }),
      });
      setImportDone(result.inserted);
      toast({ title: `Berhasil import ${result.inserted} jemaah` });
      fetchPilgrims();
    } catch (err: any) {
      toast({ title: "Import gagal", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setImportRows([]);
    setImportErrors([]);
    setImportDone(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
          <Button variant="outline" onClick={() => { resetImport(); setImportOpen(true); }}>
            <Upload className="w-4 h-4 mr-2" /> Import CSV
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
                          <Button variant="ghost" size="icon" onClick={() => openDocDialog(pilgrim)} title="Kelola Dokumen">
                            <FileText className="w-4 h-4 text-blue-500" />
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

      {/* ── CSV Import Dialog ── */}
      <Dialog open={importOpen} onOpenChange={(o) => { setImportOpen(o); if (!o) resetImport(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Jemaah via CSV</DialogTitle>
          </DialogHeader>

          {importDone !== null ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
              <p className="text-lg font-semibold">Berhasil import {importDone} jemaah</p>
              <Button onClick={() => setImportOpen(false)}>Tutup</Button>
            </div>
          ) : (
            <div className="space-y-5 py-2">
              {/* Instructions */}
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                <p className="font-medium">Petunjuk import:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Download template CSV di bawah ini</li>
                  <li>Isi data jemaah (kolom <code className="text-xs bg-muted px-1 rounded">nama</code> wajib diisi)</li>
                  <li>Upload file CSV yang sudah diisi</li>
                  <li>Periksa preview, lalu klik "Import"</li>
                </ol>
                <Button variant="outline" size="sm" onClick={downloadCsvTemplate} className="mt-2">
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download Template CSV
                </Button>
              </div>

              {/* File Upload */}
              <div>
                <Label>Upload File CSV</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="mt-1 block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-border file:text-sm file:font-medium file:bg-background file:cursor-pointer hover:file:bg-muted cursor-pointer"
                  onChange={handleFileChange}
                />
              </div>

              {/* Errors */}
              {importErrors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                    <AlertCircle className="w-4 h-4" /> {importErrors.length} error ditemukan
                  </div>
                  <ul className="text-xs text-destructive list-disc list-inside space-y-0.5">
                    {importErrors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                    {importErrors.length > 10 && <li>... dan {importErrors.length - 10} error lainnya</li>}
                  </ul>
                </div>
              )}

              {/* Preview */}
              {importRows.length > 0 && importErrors.length === 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">
                    Preview ({importRows.length} baris)
                    {importRows.length > 5 && <span className="text-muted-foreground"> — tampil 5 pertama</span>}
                  </p>
                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama</TableHead>
                          <TableHead>NIK</TableHead>
                          <TableHead>Gender</TableHead>
                          <TableHead>Telepon</TableHead>
                          <TableHead>No. Paspor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importRows.slice(0, 5).map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{row["nama"] || "-"}</TableCell>
                            <TableCell className="font-mono text-xs">{row["nik"] || "-"}</TableCell>
                            <TableCell>{row["jenis_kelamin"] || "-"}</TableCell>
                            <TableCell>{row["telepon"] || "-"}</TableCell>
                            <TableCell className="font-mono text-xs">{row["no_paspor"] || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t">
                <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importing}>Batal</Button>
                <Button
                  onClick={handleImportSubmit}
                  disabled={importing || importRows.length === 0 || importErrors.length > 0}
                >
                  {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Import {importRows.length > 0 ? `${importRows.length} Jemaah` : ""}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                {bookingSearch.trim().length >= 2 && !form.booking_id && (
                  <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    {bookingSearchLoading ? (
                      <div className="flex items-center justify-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" /> Mencari...
                      </div>
                    ) : filteredBookings.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-muted-foreground">Booking tidak ditemukan.</p>
                    ) : (
                      filteredBookings.map((b) => (
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
                      ))
                    )}
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

      {/* ── Dokumen Dialog (P3-04) ── */}
      <Dialog open={docDialogOpen} onOpenChange={(o) => { setDocDialogOpen(o); if (!o) { setDocPilgrim(null); setPilgrimDocs([]); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dokumen — {docPilgrim?.name}</DialogTitle>
          </DialogHeader>
          {docLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {["paspor", "ktp", "foto", "visa", "vaksin"].map((docType) => {
                const doc = pilgrimDocs.find((d: any) => d.documentType === docType);
                const isUp = docUploading === docType;
                return (
                  <div key={docType} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium capitalize text-sm">{docType}</p>
                      {doc ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          doc.status === "verified" ? "bg-green-100 text-green-700"
                          : doc.status === "submitted" ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                        }`}>
                          {doc.status === "verified" ? "✓ Terverifikasi" : doc.status === "submitted" ? "Diserahkan" : doc.status}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Belum ada dokumen</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-3">
                      {doc?.fileUrl && (
                        <>
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" type="button" title="Lihat file">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                          {doc.status !== "verified" && (
                            <Button variant="ghost" size="icon" type="button" title="Verifikasi" onClick={() => handleDocVerify(doc.id)}>
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" type="button" title="Hapus" onClick={() => handleDocDelete(doc.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </>
                      )}
                      <div className="relative">
                        <Button variant="outline" size="sm" type="button" disabled={isUp} className="text-xs h-7 px-2">
                          {isUp ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                          {doc ? "Ganti" : "Upload"}
                        </Button>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={(e) => handleDocUpload(e, docType)}
                          disabled={isUp}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground pt-1">Format: JPG, PNG, PDF. Maksimal 15MB.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPilgrims;
