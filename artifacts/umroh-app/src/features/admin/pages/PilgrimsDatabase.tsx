import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import { Search, Users, Download, Upload } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import AdminPagination from "@/features/admin/components/AdminPagination";
import { exportToCsv } from "@/shared/lib/exportCsv";
import PilgrimImportDialog from "@/features/admin/components/PilgrimImportDialog";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PilgrimRow {
  id: string;
  bookingId: string;
  name: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  nik: string | null;
  birthDate: string | null;
  nationality: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  roomType: string | null;
  createdAt: string | null;
  bookingCode: string;
  bookingStatus: string | null;
  packageTitle: string | null;
  departureDate: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PAGE_SIZE = 50;

const fmtDate = (d: string | null) => {
  if (!d) return "-";
  try { return format(new Date(d), "dd/MM/yyyy"); } catch { return d; }
};

const genderLabel = (g: string | null) => {
  if (g === "male") return "L";
  if (g === "female") return "P";
  return g ?? "-";
};

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-800 border-yellow-300",
  confirmed:  "bg-blue-100 text-blue-800 border-blue-300",
  completed:  "bg-green-100 text-green-800 border-green-300",
  cancelled:  "bg-red-100 text-red-800 border-red-300",
  processing: "bg-purple-100 text-purple-800 border-purple-300",
};

// ─── Component ────────────────────────────────────────────────────────────────
const AdminPilgrimsDatabase = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(0); }, [debouncedSearch]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-pilgrims-db", debouncedSearch, page],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      return apiFetch<{ data: PilgrimRow[]; total: number }>(
        `/api/admin/pilgrims-db?${params}`
      );
    },
    placeholderData: (prev) => prev,
  });

  const pilgrims = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleExportCsv = () => {
    const headers = [
      "No", "Nama", "L/P", "NIK", "No. Paspor", "Exp. Paspor",
      "Tgl Lahir", "Kewarganeg.", "No. HP", "Kode Booking",
      "Status Booking", "Paket", "Tgl Berangkat", "Tipe Kamar",
    ];
    const rows = pilgrims.map((p, i) => [
      String(page * PAGE_SIZE + i + 1),
      p.name,
      genderLabel(p.gender),
      p.nik ?? "-",
      p.passportNumber ?? "-",
      fmtDate(p.passportExpiry),
      fmtDate(p.birthDate),
      p.nationality ?? "-",
      p.phone ?? "-",
      p.bookingCode,
      p.bookingStatus ?? "-",
      p.packageTitle ?? "-",
      fmtDate(p.departureDate),
      p.roomType ?? "-",
    ]);
    exportToCsv("database-jemaah", headers, rows);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Database Jemaah</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Semua jemaah dari seluruh booking — {total.toLocaleString("id-ID")} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" /> Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={pilgrims.length === 0}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama, NIK, no. paspor, atau no. HP..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isFetching && !isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : pilgrims.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{debouncedSearch ? "Tidak ada jemaah sesuai pencarian." : "Belum ada data jemaah."}</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">No</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="w-8">L/P</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead>No. Paspor</TableHead>
                <TableHead>Exp. Paspor</TableHead>
                <TableHead>No. HP</TableHead>
                <TableHead>Kode Booking</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paket</TableHead>
                <TableHead>Tgl Berangkat</TableHead>
                <TableHead>Kamar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pilgrims.map((p, i) => (
                <TableRow key={p.id}>
                  <TableCell className="text-muted-foreground text-sm">
                    {page * PAGE_SIZE + i + 1}
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{genderLabel(p.gender)}</TableCell>
                  <TableCell className="font-mono text-xs">{p.nik ?? "-"}</TableCell>
                  <TableCell className="font-mono text-sm">{p.passportNumber ?? "-"}</TableCell>
                  <TableCell className="text-sm">{fmtDate(p.passportExpiry)}</TableCell>
                  <TableCell className="text-sm">{p.phone ?? "-"}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {p.bookingCode}
                    </span>
                  </TableCell>
                  <TableCell>
                    {p.bookingStatus ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${STATUS_COLORS[p.bookingStatus] ?? "bg-muted text-muted-foreground"}`}>
                        {p.bookingStatus}
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-sm max-w-[160px] truncate">
                    {p.packageTitle ?? "-"}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {fmtDate(p.departureDate)}
                  </TableCell>
                  <TableCell>
                    {p.roomType ? (
                      <Badge variant="outline" className="text-xs capitalize">{p.roomType}</Badge>
                    ) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <AdminPagination
          page={page}
          totalPages={totalPages}
          totalCount={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}

      {total > 0 && (
        <p className="text-sm text-muted-foreground mt-3">
          Menampilkan {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} dari {total.toLocaleString("id-ID")} jemaah
          {debouncedSearch && ` (dicari: "${debouncedSearch}")`}
        </p>
      )}

      <PilgrimImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-pilgrims-db"] });
        }}
      />
    </div>
  );
};

export default AdminPilgrimsDatabase;
