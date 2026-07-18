import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { Printer, Users, Plane, Calendar, Download, Search, UsersRound, FileText } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import { exportToCsv } from "@/shared/lib/exportCsv";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import AdminPagination from "@/features/admin/components/AdminPagination";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DepartureItem {
  id: string;
  departureDate: string;
  returnDate: string | null;
  quota: number;
  remainingQuota: number;
  status: string | null;
  packageTitle: string | null;
  muthawifId: string | null;
  prices?: unknown[];
}

interface ManifestPilgrim {
  id: string;
  bookingCode: string;
  isGroupBooking: boolean;
  groupName: string | null;
  picName: string | null;
  name: string;
  gender: string | null;
  phone: string | null;
  email: string | null;
  nik: string | null;
  birthDate: string | null;
  nationality: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  roomType: string | null;
  roomNumber: string | null;
  // MN-F02: Check-in status dari LEFT JOIN check_ins
  checkedInAt?: string | null;
  checkInLocation?: string | null;
  docStatus?: {
    paspor: string | null;
    visa: string | null;
    vaksin: string | null;
  };
}

interface ManifestData {
  departure: DepartureItem;
  pilgrims: ManifestPilgrim[];
  total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const genderLabel = (g: string | null) => {
  if (g === "male") return "L";
  if (g === "female") return "P";
  return g ?? "-";
};

const fmtDate = (d: string | null) => {
  if (!d) return "-";
  try { return format(new Date(d), "dd/MM/yyyy"); } catch { return d; }
};

const DOC_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending:   { label: "Pending",   className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  submitted: { label: "Upload",    className: "bg-blue-100 text-blue-800 border-blue-300" },
  verified:  { label: "Verified",  className: "bg-green-100 text-green-800 border-green-300" },
  rejected:  { label: "Rejected",  className: "bg-red-100 text-red-800 border-red-300" },
};

function DocStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground text-xs">-</span>;
  const cfg = DOC_STATUS_LABELS[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const MANIFEST_PAGE_SIZE = 50;

const AdminManifest = () => {
  const [selectedDep, setSelectedDep] = useState<string>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);

  // Debounce search — tunggu 400ms setelah user berhenti mengetik
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset halaman ketika filter atau keberangkatan berubah
  useEffect(() => { setPage(0); }, [selectedDep, debouncedSearch]);

  // Fetch all departures for the dropdown
  const { data: departuresRes, isLoading: loadingDeps } = useQuery({
    queryKey: ["admin-manifest-departures"],
    queryFn: () =>
      apiFetch<{ data: DepartureItem[] }>("/api/admin/departures"),
    select: (r) => r.data,
  });

  // Fetch manifest data — server-side pagination + search (MN-01)
  const { data: manifest, isLoading: loadingManifest, isFetching } = useQuery({
    queryKey: ["admin-manifest-data", selectedDep, debouncedSearch, page],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: String(MANIFEST_PAGE_SIZE),
        offset: String(page * MANIFEST_PAGE_SIZE),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      return apiFetch<ManifestData>(
        `/api/admin/departures/${selectedDep}/manifest-data?${params}`
      );
    },
    enabled: !!selectedDep,
    placeholderData: (prev) => prev, // keep previous page while fetching next
  });

  const departures = departuresRes ?? [];
  const pilgrims = manifest?.pilgrims ?? [];
  const departure = manifest?.departure;
  const total = manifest?.total ?? 0;
  const totalPages = Math.ceil(total / MANIFEST_PAGE_SIZE);

  const handleDepChange = (v: string) => { setSelectedDep(v); setSearch(""); setPage(0); };
  const handleSearchChange = (v: string) => { setSearch(v); };

  const handlePrint = () => window.print();

  const handleExportCsv = () => {
    const headers = [
      "No", "Booking", "Nama", "Gender", "Tgl Lahir", "Kewarganegaraan",
      "No. Paspor", "Exp. Paspor", "No. HP", "Tipe Kamar", "No. Kamar",
      "Rombongan", "NIK",
    ];
    const rows = pilgrims.map((p, i) => [
      String(page * MANIFEST_PAGE_SIZE + i + 1),
      p.bookingCode,
      p.name,
      genderLabel(p.gender),
      fmtDate(p.birthDate),
      p.nationality ?? "-",
      p.passportNumber ?? "-",
      fmtDate(p.passportExpiry),
      p.phone ?? "-",
      p.roomType ?? "-",
      p.roomNumber ?? "-",
      p.groupName ?? (p.isGroupBooking ? "Grup" : "-"),
      p.nik ?? "-",
    ]);
    const depDate = departure?.departureDate
      ? format(new Date(departure.departureDate), "yyyyMMdd")
      : "manifest";
    exportToCsv(`manifest-${depDate}`, headers, rows);
  };

  return (
    <div>
      {/* Header — MN-02: tombol export lebih menonjol */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Manifest Keberangkatan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Format standar maskapai — ekspor CSV atau PDF
          </p>
        </div>
        {selectedDep && total > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/api/admin/departures/${selectedDep}/manifest.pdf`, "_blank")}
            >
              <FileText className="h-4 w-4 mr-2" /> Download PDF
            </Button>
            <Button size="sm" onClick={handlePrint} className="gradient-gold text-primary">
              <Printer className="h-4 w-4 mr-2" /> Cetak Manifest
            </Button>
          </div>
        )}
      </div>

      {/* Departure selector */}
      <div className="mb-6 print:hidden">
        <Select value={selectedDep} onValueChange={handleDepChange}>
          <SelectTrigger className="w-full sm:w-[420px]">
            <SelectValue placeholder="Pilih keberangkatan..." />
          </SelectTrigger>
          <SelectContent>
            {loadingDeps ? (
              <div className="p-2 text-sm text-muted-foreground">Memuat...</div>
            ) : (
              departures.map((dep) => (
                <SelectItem key={dep.id} value={dep.id}>
                  {dep.packageTitle ?? "Paket"} —{" "}
                  {dep.departureDate
                    ? format(new Date(dep.departureDate), "dd MMM yyyy", { locale: localeId })
                    : "-"}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      {selectedDep && departure && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 print:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" /> Tanggal Berangkat
              </div>
              <p className="font-semibold">
                {format(new Date(departure.departureDate), "d MMMM yyyy", { locale: localeId })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" /> Tanggal Kembali
              </div>
              <p className="font-semibold">
                {departure.returnDate
                  ? format(new Date(departure.returnDate), "d MMMM yyyy", { locale: localeId })
                  : "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Users className="h-4 w-4" /> Total Jemaah
              </div>
              <p className="font-semibold">{total} / {departure.quota}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <UsersRound className="h-4 w-4" /> Halaman
              </div>
              <p className="font-semibold">{totalPages > 0 ? `${page + 1} / ${totalPages}` : "-"}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Print header (only visible when printing) */}
      {selectedDep && departure && (
        <div className="hidden print:block mb-4">
          <h2 className="text-xl font-bold">
            MANIFEST PENUMPANG — {departure.packageTitle}
          </h2>
          <p className="text-sm">
            Tgl Berangkat: {departure.departureDate ? format(new Date(departure.departureDate), "dd MMMM yyyy", { locale: localeId }) : "-"} &nbsp;|&nbsp;
            Tgl Kembali: {departure.returnDate ? format(new Date(departure.returnDate), "dd MMMM yyyy", { locale: localeId }) : "-"} &nbsp;|&nbsp;
            Total: {total} Jemaah
          </p>
        </div>
      )}

      {/* Search (server-side — MN-01) */}
      {selectedDep && (
        <div className="relative mb-4 print:hidden">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, no. paspor, kode booking, atau nama rombongan..."
            className="pl-9"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {isFetching && !loadingManifest && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
        </div>
      )}

      {/* Table */}
      {loadingManifest ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : !selectedDep ? (
        <div className="text-center py-16 text-muted-foreground">
          <Plane className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Pilih keberangkatan untuk melihat manifest.</p>
        </div>
      ) : pilgrims.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {total === 0 && !debouncedSearch
            ? "Belum ada jemaah terdaftar untuk keberangkatan ini (hanya booking berstatus paid/confirmed/processing/completed)."
            : "Tidak ada jemaah sesuai pencarian."}
        </div>
      ) : (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">No</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Nama Lengkap</TableHead>
                <TableHead className="w-8">L/P</TableHead>
                <TableHead>Tgl Lahir</TableHead>
                <TableHead>Kewarganeg.</TableHead>
                <TableHead>No. Paspor</TableHead>
                <TableHead>Exp. Paspor</TableHead>
                <TableHead>No. HP</TableHead>
                <TableHead>Kamar</TableHead>
                <TableHead>No. Kamar</TableHead>
                <TableHead className="text-center">Paspor</TableHead>
                <TableHead className="text-center">Visa</TableHead>
                <TableHead className="text-center">Vaksin</TableHead>
                <TableHead className="text-center">Check-in</TableHead>
                <TableHead className="text-center print:hidden">QR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pilgrims.map((row, i) => {
                const origin = typeof window !== "undefined" ? window.location.origin : "";
                const qrPayload = JSON.stringify({
                  v: 1,
                  pid: row.id,
                  dep: selectedDep,
                  bc: row.bookingCode,
                  name: row.name,
                  pp: row.passportNumber ?? null,
                  url: `${origin}/manifest/checkin?pid=${row.id}&dep=${selectedDep}`,
                });
                // Nomor urut global (bukan per halaman)
                const globalIndex = page * MANIFEST_PAGE_SIZE + i + 1;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground text-sm">{globalIndex}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">
                          {row.bookingCode}
                        </span>
                        {row.isGroupBooking && row.groupName && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-gold/40 text-gold px-1 py-0 gap-1 w-fit"
                          >
                            <UsersRound className="w-2.5 h-2.5" />
                            {row.groupName.length > 18
                              ? row.groupName.slice(0, 18) + "…"
                              : row.groupName}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{genderLabel(row.gender)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{fmtDate(row.birthDate)}</TableCell>
                    <TableCell className="text-sm">{row.nationality ?? "-"}</TableCell>
                    <TableCell className="font-mono text-sm">{row.passportNumber ?? "-"}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{fmtDate(row.passportExpiry)}</TableCell>
                    <TableCell className="text-sm">{row.phone ?? "-"}</TableCell>
                    <TableCell>
                      {row.roomType ? (
                        <Badge variant="outline" className="text-xs capitalize">{row.roomType}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-mono">{row.roomNumber ?? "-"}</TableCell>
                    <TableCell className="text-center">
                      <DocStatusBadge status={row.docStatus?.paspor} />
                    </TableCell>
                    <TableCell className="text-center">
                      <DocStatusBadge status={row.docStatus?.visa} />
                    </TableCell>
                    <TableCell className="text-center">
                      <DocStatusBadge status={row.docStatus?.vaksin} />
                    </TableCell>
                    <TableCell className="text-center">
                      {row.checkedInAt ? (
                        <Badge className="bg-green-100 text-green-800 border border-green-300 text-[10px] whitespace-nowrap">
                          ✓ {new Date(row.checkedInAt).toLocaleDateString("id-ID")}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center print:hidden">
                      <div className="inline-flex flex-col items-center gap-1">
                        <QRCodeSVG value={qrPayload} size={64} level="M" includeMargin={false} />
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {row.id.slice(0, 8)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Server-side Pagination (MN-01) */}
      {totalPages > 1 && (
        <div className="print:hidden">
          <AdminPagination
            page={page}
            totalPages={totalPages}
            totalCount={total}
            pageSize={MANIFEST_PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Footer count */}
      {total > 0 && (
        <p className="text-sm text-muted-foreground mt-3 print:hidden">
          Menampilkan {page * MANIFEST_PAGE_SIZE + 1}–{Math.min((page + 1) * MANIFEST_PAGE_SIZE, total)} dari {total} jemaah
          {debouncedSearch && ` (difilter oleh "${debouncedSearch}")`}
        </p>
      )}
    </div>
  );
};

export default AdminManifest;
