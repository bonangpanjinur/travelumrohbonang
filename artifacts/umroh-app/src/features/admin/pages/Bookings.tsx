import { useEffect, useState } from "react";
import BookingTable, { type Booking } from "@/features/admin/components/BookingTable";
import BookingFilters from "@/features/admin/components/BookingFilters";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Search, Download, Plus, FileSpreadsheet, X, AlertCircle, RefreshCw, CheckSquare2, Filter } from "lucide-react";

interface PackageOption { id: string; title: string; }
import { exportToCsv } from "@/shared/lib/exportCsv";
import AdminBookingDialog from "@/features/admin/components/AdminBookingDialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/components/ui/pagination";
import { apiFetch } from "@/shared/lib/apiClient";
import { useToast } from "@/shared/hooks/use-toast";

const PAGE_SIZE = 20;

const AdminBookings = () => {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("__all__");
  const [packageFilter, setPackageFilter] = useState("__all__");
  const [departureFilter, setDepartureFilter] = useState("__all_dep__");
  const [departureOptions, setDepartureOptions] = useState<Array<{ id: string; packageTitle: string | null; departureDate: string }>>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [packageOptions, setPackageOptions] = useState<PackageOption[]>([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const handleBulkStatus = async (status: "confirmed" | "cancelled") => {
    if (selectedIds.length === 0) return;
    try {
      const res = await apiFetch<{ updated: number }>("/api/admin/bookings/bulk-status", {
        method: "PATCH",
        body: JSON.stringify({ ids: selectedIds, status }),
      });
      toast({ title: `${res.updated} booking berhasil diupdate ke "${status}"` });
      setSelectedIds([]);
      fetchBookings(0);
    } catch (err: any) {
      toast({ title: "Gagal bulk action", description: err.message, variant: "destructive" });
    }
  };

  const hasActiveFilters =
    filter !== "all" || search !== "" || branchFilter !== "__all__" || packageFilter !== "__all__" || startDate !== "" || endDate !== "" || departureFilter !== "__all_dep__";

  const resetFilters = () => {
    setFilter("all");
    setSearch("");
    setBranchFilter("__all__");
    setPackageFilter("__all__");
    setDepartureFilter("__all_dep__");
    setStartDate("");
    setEndDate("");
  };

  useEffect(() => {
    apiFetch<any[]>("/api/admin/branches").then((data) => {
        setBranches(data || []);
    }).catch(e => {
        console.error("Gagal memuat daftar cabang:", e);
        toast({
          title: "Gagal memuat cabang",
          description: "Filter cabang mungkin tidak lengkap. Coba muat ulang halaman.",
          variant: "destructive",
        });
    });
    apiFetch<{ data: PackageOption[] }>("/api/admin/packages").then((res) => {
      setPackageOptions((res.data || []).map((p: any) => ({ id: p.id, title: p.title })));
    }).catch(() => { /* filter paket opsional */ });
    apiFetch<{ data: Array<{ id: string; packageTitle?: string; package?: { title: string }; departureDate: string }> }>("/api/admin/departures")
      .then((res) => setDepartureOptions((res.data || []).map((d) => ({
        id: d.id,
        packageTitle: d.package?.title ?? d.packageTitle ?? null,
        departureDate: d.departureDate,
      }))))
      .catch(() => { /* filter keberangkatan opsional */ });
  }, []);

  // Filter berubah → reset ke halaman pertama dan fetch ulang.
  // Halaman hanya di-fetch lewat handlePageChange — tidak ada page-effect
  // terpisah agar tidak terjadi double-fetch saat halaman berganti.
  useEffect(() => {
    setPage(0);
    fetchBookings(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search, branchFilter, packageFilter, departureFilter, startDate, endDate]);

  const fetchBookings = async (pageOverride?: number) => {
    const currentPage = pageOverride ?? page;
    setLoading(true);
    setApiError(null);
    try {
      const offset = currentPage * PAGE_SIZE;
      const isoStart = startDate ? new Date(startDate).toISOString().slice(0, 10) : "";
      const isoEnd = endDate ? new Date(endDate).toISOString().slice(0, 10) : "";
      let url = `/api/admin/bookings?status=${filter}&search=${encodeURIComponent(search.trim())}&branchId=${branchFilter}&packageId=${packageFilter}&limit=${PAGE_SIZE}&offset=${offset}`;
      if (departureFilter !== "__all_dep__") url += `&departureId=${departureFilter}`;
      if (isoStart) url += `&startDate=${isoStart}`;
      if (isoEnd) url += `&endDate=${isoEnd}`;
      const res = await apiFetch<{ data: any[]; total: number }>(url);
      const mapped: Booking[] = (res.data || []).map((b) => ({
        id: b.id,
        bookingCode: b.bookingCode,
        totalPrice: Number(b.totalPrice) || 0,
        status: b.status,
        createdAt: b.createdAt,
        packageId: b.packageId,
        picType: b.picType,
        picId: b.picId,
        branchId: b.branchId,
        package: b.packageTitle ? { title: b.packageTitle } : null,
        departureId: b.departureId ?? null,
        departure: b.departureDate ? { departureDate: b.departureDate } : null,
        profile: (b.pemesanName || b.userName || b.userEmail)
          ? { name: b.pemesanName || b.userName || "-", email: b.pemesanEmail || b.userEmail || "" }
          : null,
        branch: b.branchName ? { name: b.branchName } : null,
        isGroupBooking: b.isGroupBooking ?? false,
        groupName: b.groupName ?? null,
        picName: b.picName ?? null,
        picPhone: b.picPhone ?? null,
        pilgrimsCount: b.pilgrimsCount ?? null,
        paymentStatus: b.paymentStatus ?? null,
        pemesanPhone: b.pemesanPhone ?? null,
        firstJamaahName: b.firstJamaahName ?? null,
      }));
      setBookings(mapped);
      setTotalCount(res.total || 0);
    } catch (e: any) {
      console.error(e);
      setApiError(e?.message || "Terjadi kesalahan saat memuat data booking.");
      setBookings([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchBookings(newPage);
  };

  return (
    <div className="space-y-4">
      {/* ── Baris 1: Judul + Aksi ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Booking</h1>
          {!loading && !apiError && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalCount > 0 ? `${totalCount} booking ditemukan` : "Belum ada data booking"}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button className="gradient-gold text-primary" onClick={() => setBookingOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Tambah Booking
          </Button>
          <Button variant="outline" onClick={() => {
            const headers = ["Kode Booking", "Nama", "Email", "Paket", "Total Harga", "Status", "Tanggal"];
            const rows = bookings.map(b => [
              b.bookingCode, b.profile?.name || "-", b.profile?.email || "-",
              b.package?.title || "-", String(b.totalPrice),
              b.status || "draft", b.createdAt ? new Date(b.createdAt).toISOString().slice(0, 10) : ""
            ]);
            exportToCsv("bookings", headers, rows);
          }}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => {
            const params = new URLSearchParams({ status: filter, search: search.trim(), branchId: branchFilter, packageId: packageFilter });
            if (startDate) params.set("startDate", startDate);
            if (endDate) params.set("endDate", endDate);
            window.open(`/api/admin/bookings/export.xlsx?${params}`, "_blank");
          }}>
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
          </Button>
        </div>
      </div>

      {/* ── Baris 2: Pencarian + Status Filter + Toggle Filter Lanjutan ────── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari kode booking, nama, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <BookingFilters filter={filter} onFilterChange={setFilter} />
        <Button
          variant={showFilters ? "default" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0 gap-2"
        >
          <Filter className="w-4 h-4" />
          Filter Lanjutan
          {(branchFilter !== "__all__" || packageFilter !== "__all__" || startDate || endDate) && (
            <span className="ml-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 leading-none">
              {[branchFilter !== "__all__", packageFilter !== "__all__", !!startDate || !!endDate].filter(Boolean).length}
            </span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="icon" onClick={resetFilters} title="Reset semua filter" className="shrink-0 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* ── Filter Lanjutan (collapsible) ──────────────────────────────────── */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-muted/40 border border-border rounded-lg">
          {/* Cabang */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Cabang</label>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Semua Cabang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Semua Cabang</SelectItem>
                <SelectItem value="__none__">Tanpa Cabang</SelectItem>
                {branches.map((br) => (
                  <SelectItem key={br.id} value={br.id}>{br.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paket */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Paket</label>
            <Select value={packageFilter} onValueChange={setPackageFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Semua Paket" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Semua Paket</SelectItem>
                {packageOptions.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>{pkg.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Keberangkatan */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Keberangkatan</label>
            <Select value={departureFilter} onValueChange={setDepartureFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Semua Keberangkatan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all_dep__">Semua Keberangkatan</SelectItem>
                {departureOptions.map((dep) => (
                  <SelectItem key={dep.id} value={dep.id}>
                    {dep.packageTitle ?? "Paket"} — {dep.departureDate
                      ? new Date(dep.departureDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                      : "-"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tanggal Berangkat Dari */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tgl Berangkat Dari</label>
            <div className="relative">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              {startDate && (
                <button
                  onClick={() => setStartDate("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tanggal Berangkat Sampai */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tgl Berangkat Sampai</label>
            <div className="relative">
              <Input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
              {endDate && (
                <button
                  onClick={() => setEndDate("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Action Bar ─────────────────────────────────────────────────── */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <CheckSquare2 className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-medium">{selectedIds.length} booking dipilih</span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => handleBulkStatus("confirmed")}
              className="px-3 py-1.5 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Konfirmasi Semua
            </button>
            <button
              onClick={() => handleBulkStatus("cancelled")}
              className="px-3 py-1.5 text-xs font-medium rounded bg-destructive text-white hover:bg-destructive/90 transition-colors"
            >
              Batalkan Semua
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs font-medium rounded border hover:bg-muted transition-colors"
            >
              Batal Pilih
            </button>
          </div>
        </div>
      )}

      {/* ── Konten Utama ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : apiError ? (
        <div className="text-center py-16 space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive/60" />
          <div>
            <p className="font-medium text-destructive">Gagal memuat data booking</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{apiError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchBookings(0)}>
            <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
          </Button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-muted-foreground">
            {hasActiveFilters
              ? "Tidak ada booking yang cocok dengan filter yang dipilih."
              : "Belum ada data booking."}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <X className="w-4 h-4 mr-2" /> Reset Filter
            </Button>
          )}
        </div>
      ) : (
        <>
          <BookingTable
            bookings={bookings}
            onRefresh={fetchBookings}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />

          {totalPages > 1 && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Menampilkan {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} dari {totalCount} booking
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(Math.max(0, page - 1))}
                      className={page === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i;
                    } else if (page < 3) {
                      pageNum = i;
                    } else if (page > totalPages - 4) {
                      pageNum = totalPages - 5 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          isActive={pageNum === page}
                          onClick={() => handlePageChange(pageNum)}
                          className="cursor-pointer"
                        >
                          {pageNum + 1}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(Math.min(totalPages - 1, page + 1))}
                      className={page >= totalPages - 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

      <AdminBookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        onSuccess={() => fetchBookings(0)}
      />
    </div>
  );
};

export default AdminBookings;
