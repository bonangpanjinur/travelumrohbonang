import { useEffect, useState } from "react";
import BookingTable, { type Booking } from "@/features/admin/components/BookingTable";
import BookingFilters from "@/features/admin/components/BookingFilters";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Search, Download, Plus } from "lucide-react";
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

  useEffect(() => {
    setPage(0);
  }, [filter, search, branchFilter]);

  useEffect(() => {
    fetchBookings();
  }, [filter, search, page, branchFilter]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const offset = page * PAGE_SIZE;
      const res = await apiFetch<{ data: any[]; total: number }>(
        `/api/admin/bookings?status=${filter}&search=${search.trim()}&branchId=${branchFilter}&limit=${PAGE_SIZE}&offset=${offset}`
      );
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
      }));
      setBookings(mapped);
      setTotalCount(res.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari kode booking..."
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
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {search ? `Tidak ditemukan booking dengan kode "${search}"` : "Belum ada booking"}
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
                      onClick={() => setPage(Math.max(0, page - 1))}
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
                          onClick={() => setPage(pageNum)}
                          className="cursor-pointer"
                        >
                          {pageNum + 1}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
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
