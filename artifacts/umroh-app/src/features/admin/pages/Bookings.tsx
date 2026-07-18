import { useEffect, useState } from "react";
import BookingTable, { type Booking } from "@/features/admin/components/BookingTable";
import BookingFilters from "@/features/admin/components/BookingFilters";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Search, Download, Plus, FileSpreadsheet, X, AlertCircle, RefreshCw } from "lucide-react";
import { exportToCsv } from "@/shared/lib/exportCsv";
import AdminCreateBookingDialog from "@/features/admin/components/AdminCreateBookingDialog";
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
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);

  const hasActiveFilters =
    filter !== "all" || search !== "" || branchFilter !== "__all__" || startDate !== "" || endDate !== "";

  const resetFilters = () => {
    setFilter("all");
    setSearch("");
    setBranchFilter("__all__");
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
  }, []);

  // Filter berubah → reset ke halaman pertama dan fetch ulang (satu effect, satu API call)
  useEffect(() => {
    setPage(0);
    fetchBookings(0);
  }, [filter, search, branchFilter, startDate, endDate]);

  // Halaman berubah oleh klik pagination → fetch halaman tersebut
  useEffect(() => {
    if (page > 0) fetchBookings(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // pageOverride: gunakan ketika page state belum ter-update (e.g. langsung setelah setPage)
  const fetchBookings = async (pageOverride?: number) => {
    const currentPage = pageOverride ?? page;
    setLoading(true);
    setApiError(null);
    try {
      const offset = currentPage * PAGE_SIZE;
      // Pastikan tanggal selalu dalam format ISO yyyy-mm-dd (HTML date input sudah ISO, tapi defensive)
      const isoStart = startDate ? new Date(startDate).toISOString().slice(0, 10) : "";
      const isoEnd = endDate ? new Date(endDate).toISOString().slice(0, 10) : "";
      let url = `/api/admin/bookings?status=${filter}&search=${encodeURIComponent(search.trim())}&branchId=${branchFilter}&limit=${PAGE_SIZE}&offset=${offset}`;
      if (isoStart) url += `&startDate=${isoStart}`;
      if (isoEnd) url += `&endDate=${isoEnd}`;
      const res = await apiFetch<{ data: any[]; total: number }>(url);
      const mapped: Booking[] = (res.data || []).map((b) => ({
        id: b.id,
        booking_code: b.bookingCode,
        total_price: Number(b.totalPrice) || 0,
        status: b.status,
        created_at: b.createdAt,
        package_id: b.packageId,
        pic_type: b.picType,
        pic_id: b.picId,
        branch_id: b.branchId,
        package: b.packageTitle ? { title: b.packageTitle } : null,
        departure: b.departureDate ? { departure_date: b.departureDate } : null,
        profile: b.userName || b.userEmail ? { name: b.userName, email: b.userEmail } : null,
        branch: b.branchName ? { name: b.branchName } : null,
        // Group booking fields
        is_group_booking: b.isGroupBooking ?? false,
        group_name: b.groupName ?? null,
        pic_name: b.picName ?? null,
        pic_phone: b.picPhone ?? null,
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

  /** Ganti halaman tanpa double-fetch: set state DAN fetch sekaligus */
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchBookings(newPage);
  };

  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-display font-bold">Booking</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button className="gradient-gold text-primary" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Tambah Booking
          </Button>
          <Button variant="outline" onClick={() => {
            const headers = ["Kode Booking", "Nama", "Email", "Paket", "Total Harga", "Status", "Tanggal"];
            const rows = bookings.map(b => [
              b.booking_code, b.profile?.name || "-", b.profile?.email || "-",
              b.package?.title || "-", String(b.total_price),
              b.status || "draft", b.created_at ? new Date(b.created_at).toISOString().slice(0, 10) : ""
            ]);
            exportToCsv("bookings", headers, rows);
          }}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => {
            const params = new URLSearchParams({ status: filter, search: search.trim(), branchId: branchFilter });
            if (startDate) params.set("startDate", startDate);
            if (endDate) params.set("endDate", endDate);
            window.open(`/api/admin/bookings/export.xlsx?${params}`, "_blank");
          }}>
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground px-1">Tgl Berangkat Dari</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-36 text-sm"
              />
            </div>
            <span className="text-muted-foreground text-sm mt-4">–</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground px-1">Sampai</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-36 text-sm"
              />
            </div>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="icon"
                className="mt-4 h-8 w-8 shrink-0"
                title="Hapus filter tanggal"
                onClick={() => { setStartDate(""); setEndDate(""); }}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari kode, nama, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
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
          <BookingFilters filter={filter} onFilterChange={setFilter} />
        </div>
      </div>

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
            expandedId={expandedId}
            onToggleExpand={handleToggleExpand}
            onRefresh={fetchBookings}
          />

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Menampilkan {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalCount)} dari {totalCount}
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

      <AdminCreateBookingDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={fetchBookings}
      />
    </div>
  );
};

export default AdminBookings;
