import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Eye, CheckCircle, XCircle, Image, DollarSign, FileText, Download, ZoomIn, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { exportToCsv } from "@/lib/exportCsv";
import EmptyState from "@/components/ui/empty-state";
import ErrorAlert from "@/components/ui/error-alert";
import AdminPagination from "@/components/admin/AdminPagination";
import { useAdminPagination } from "@/hooks/useAdminPagination";
import ConfirmAlertDialog from "@/components/admin/ConfirmAlertDialog";

interface Payment {
  id: string;
  amount: number;
  status: string;
  proof_url: string | null;
  payment_method: string | null;
  payment_type: string | null;
  paid_at: string | null;
  created_at: string;
  booking: {
    id: string;
    booking_code: string;
    status: string;
    total_price: number;
    user_id: string;
  } | null;
}

const AdminPayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();
  const [verifyTarget, setVerifyTarget] = useState<{ payment: Payment; approve: boolean } | null>(null);

  const filteredPayments = payments.filter((p) => {
    const matchSearch = !search || p.booking?.booking_code?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const { page, setPage, totalPages, totalCount, paginatedItems, pageSize, resetPage } = useAdminPagination(filteredPayments);

  useEffect(() => { resetPage(); }, [search, statusFilter]);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("payments")
        .select(`*, booking:bookings(id, booking_code, status, total_price, user_id)`)
        .order("created_at", { ascending: false });
      if (fetchError) throw fetchError;
      setPayments((data as unknown as Payment[]) || []);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data pembayaran");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (payment: Payment, approve: boolean) => {
    setVerifyTarget({ payment, approve });
  };

  const executeVerify = async () => {
    if (!verifyTarget) return;
    const { payment, approve } = verifyTarget;
    setVerifyTarget(null);
    try {
      const { error: paymentError } = await supabase
        .from("payments")
        .update({
          status: approve ? "paid" : "failed",
          verified_at: new Date().toISOString(),
          paid_at: approve ? new Date().toISOString() : null,
        })
        .eq("id", payment.id);
      if (paymentError) throw paymentError;
      if (payment.booking) {
        await supabase.from("bookings").update({ status: approve ? "paid" : "cancelled" }).eq("id", payment.booking.id);
      }
      toast({ title: approve ? "Pembayaran disetujui!" : "Pembayaran ditolak", variant: approve ? "default" : "destructive" });
      fetchPayments();
    } catch (err: any) {
      toast({ title: "Gagal memproses", description: err.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge className="bg-warning/10 text-warning border-warning/20">Menunggu</Badge>;
      case "paid": return <Badge className="bg-success/10 text-success border-success/20">Terverifikasi</Badge>;
      case "failed": return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Ditolak</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentTypeLabel = (type: string | null) => {
    switch (type) {
      case "dp": return "DP";
      case "full": return "Pelunasan";
      default: return "Pembayaran";
    }
  };

  const handleZoom = () => setZoomLevel((prev) => (prev >= 2 ? 1 : prev + 0.5));

  return (
    <div>
      <ConfirmAlertDialog open={!!verifyTarget} onOpenChange={() => setVerifyTarget(null)} onConfirm={executeVerify} title={verifyTarget?.approve ? "Setujui Pembayaran?" : "Tolak Pembayaran?"} description={verifyTarget?.approve ? "Pembayaran akan disetujui dan status booking diupdate." : "Pembayaran akan ditolak."} confirmLabel={verifyTarget?.approve ? "Setujui" : "Tolak"} variant={verifyTarget?.approve ? "default" : "destructive"} />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-display font-bold">Verifikasi Pembayaran</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button variant="outline" onClick={() => {
            const headers = ["Kode Booking", "Tipe", "Jumlah", "Metode", "Status", "Tanggal"];
            const rows = filteredPayments.map(p => [
              p.booking?.booking_code || "-",
              p.payment_type === "dp" ? "DP" : "Pelunasan",
              String(p.amount),
              p.payment_method || "-",
              p.status || "pending",
              p.created_at?.slice(0, 10) || ""
            ]);
            exportToCsv("payments", headers, rows);
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
          <div className="flex gap-2">
            {["all", "pending", "paid", "failed"].map((s) => (
              <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)}>
                {s === "all" ? "Semua" : s === "pending" ? "Menunggu" : s === "paid" ? "Terverifikasi" : "Ditolak"}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={imageOpen} onOpenChange={(open) => { setImageOpen(open); setZoomLevel(1); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gold" />
              Bukti Pembayaran - {selectedPayment?.booking?.booking_code}
            </DialogTitle>
          </DialogHeader>
          {selectedPayment?.proof_url && (
            <div className="space-y-4">
              <div className="relative overflow-auto max-h-[60vh] bg-muted rounded-lg">
                <img src={selectedPayment.proof_url} alt="Bukti pembayaran" className="w-full transition-transform duration-200 cursor-zoom-in" style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top left" }} onClick={handleZoom} />
                <Button variant="secondary" size="sm" className="absolute top-2 right-2" onClick={handleZoom}>
                  <ZoomIn className="w-4 h-4 mr-1" />{Math.round(zoomLevel * 100)}%
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div><div className="text-xs text-muted-foreground">Tipe</div><div className="font-semibold">{getPaymentTypeLabel(selectedPayment.payment_type)}</div></div>
                <div><div className="text-xs text-muted-foreground">Metode</div><div className="font-semibold capitalize">{selectedPayment.payment_method || "-"}</div></div>
                <div><div className="text-xs text-muted-foreground">Tanggal Upload</div><div className="font-semibold">{format(new Date(selectedPayment.created_at), "d MMM yyyy HH:mm", { locale: localeId })}</div></div>
                <div><div className="text-xs text-muted-foreground">Jumlah</div><div className="text-xl font-bold text-gold">Rp {selectedPayment.amount.toLocaleString("id-ID")}</div></div>
              </div>
              {selectedPayment.status === "pending" && (
                <div className="flex justify-end gap-3">
                  <Button variant="outline" asChild>
                    <a href={selectedPayment.proof_url} download target="_blank" rel="noopener noreferrer"><Download className="w-4 h-4 mr-2" /> Download</a>
                  </Button>
                  <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => { handleVerify(selectedPayment, false); setImageOpen(false); }}>
                    <XCircle className="w-4 h-4 mr-2" /> Tolak
                  </Button>
                  <Button className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => { handleVerify(selectedPayment, true); setImageOpen(false); }}>
                    <CheckCircle className="w-4 h-4 mr-2" /> Setujui
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorAlert message={error} onRetry={fetchPayments} />
      ) : filteredPayments.length === 0 ? (
        <EmptyState icon={DollarSign} title="Belum Ada Pembayaran" description="Pembayaran dari jemaah akan muncul di sini untuk diverifikasi" />
      ) : (
        <>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto min-w-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode Booking</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Metode</TableHead>
                    <TableHead>Bukti</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono font-semibold">{payment.booking?.booking_code || "-"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{getPaymentTypeLabel(payment.payment_type)}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1"><DollarSign className="w-4 h-4 text-muted-foreground" /><span className="font-semibold">Rp {payment.amount.toLocaleString("id-ID")}</span></div>
                      </TableCell>
                      <TableCell className="capitalize">{payment.payment_method || "-"}</TableCell>
                      <TableCell>
                        {payment.proof_url ? (
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedPayment(payment); setImageOpen(true); }} className="text-info hover:text-info/80">
                            <Image className="w-4 h-4 mr-1" /> Lihat
                          </Button>
                        ) : <span className="text-muted-foreground text-sm">Tidak ada</span>}
                      </TableCell>
                      <TableCell className="text-sm">{format(new Date(payment.created_at), "d MMM yyyy HH:mm", { locale: localeId })}</TableCell>
                      <TableCell>{getStatusBadge(payment.status || "pending")}</TableCell>
                      <TableCell className="text-right">
                        {payment.status === "pending" && (
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80 hover:bg-destructive/10" onClick={() => handleVerify(payment, false)} title="Tolak"><XCircle className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-success hover:text-success/80 hover:bg-success/10" onClick={() => handleVerify(payment, true)} title="Setujui"><CheckCircle className="w-4 h-4" /></Button>
                          </div>
                        )}
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
    </div>
  );
};

export default AdminPayments;
