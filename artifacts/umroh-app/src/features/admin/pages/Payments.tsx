import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { useToast } from "@/shared/hooks/use-toast";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CheckCircle, XCircle, Image, DollarSign, FileText, Download, ZoomIn, Search, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import LoadingSpinner from "@/shared/components/ui/loading-spinner";
import { useProofUrl } from "@/features/booking/hooks/useProofUrl";
import { exportToCsv } from "@/shared/lib/exportCsv";
import EmptyState from "@/shared/components/ui/empty-state";
import ErrorAlert from "@/shared/components/ui/error-alert";
import AdminPagination from "@/features/admin/components/AdminPagination";
import { useAdminPagination } from "@/features/admin/hooks/useAdminPagination";
import ConfirmAlertDialog from "@/features/admin/components/ConfirmAlertDialog";
import { apiFetch } from "@/shared/lib/apiClient";

interface Payment {
  id: string;
  amount: number;
  status: string;
  proofUrl: string | null;
  paymentMethod: string | null;
  paymentType: string | null;
  paidAt: string | null;
  createdAt: string;
  booking: {
    id: string;
    bookingCode: string;
    status: string;
    totalPrice: number;
    userId: string;
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
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { url: proofViewUrl, loading: proofLoading, error: proofError, reload: reloadProof } = useProofUrl(
    selectedPayment?.proofUrl ?? null,
    imageOpen,
    "admin/payments"
  );

  // Normalize legacy status values to new canonical names for filtering
  const normalizeStatus = (status: string) => {
    if (status === "paid") return "verified";
    if (status === "failed") return "rejected";
    return status;
  };

  const filteredPayments = payments.filter((p) => {
    const matchSearch = !search || p.booking?.bookingCode?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || normalizeStatus(p.status) === statusFilter;
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
      const data = await apiFetch<Payment[]>("/api/admin/payments/all");
      setPayments(data || []);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data pembayaran");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (payment: Payment) => setVerifyTarget({ payment, approve: true });

  const handleReject = (payment: Payment) => {
    setRejectTarget(payment);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const executeVerify = async () => {
    if (!verifyTarget) return;
    const { payment } = verifyTarget;
    setVerifyTarget(null);
    try {
      await apiFetch(`/api/admin/payments/verify/${payment.id}`, { method: "PATCH" });
      toast({ title: "Pembayaran disetujui!", description: "Status booking telah diupdate otomatis." });
      fetchPayments();
    } catch (err: any) {
      toast({ title: "Gagal menyetujui", description: err.message, variant: "destructive" });
    }
  };

  const executeReject = async () => {
    if (!rejectTarget) return;
    const target = rejectTarget;
    setRejectDialogOpen(false);
    setRejectTarget(null);
    try {
      await apiFetch(`/api/admin/payments/reject/${target.id}`, {
        method: "PATCH",
        body: JSON.stringify({ reason: rejectReason || undefined }),
      });
      toast({ title: "Pembayaran ditolak", description: "Jamaah akan mendapat notifikasi.", variant: "destructive" });
      fetchPayments();
    } catch (err: any) {
      toast({ title: "Gagal menolak", description: err.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":  return <Badge className="bg-warning/10 text-warning border-warning/20">Menunggu</Badge>;
      case "verified": return <Badge className="bg-success/10 text-success border-success/20">Terverifikasi</Badge>;
      case "rejected": return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Ditolak</Badge>;
      // legacy values kept for backwards compatibility
      case "paid":     return <Badge className="bg-success/10 text-success border-success/20">Terverifikasi</Badge>;
      case "failed":   return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Ditolak</Badge>;
      default:         return <Badge variant="outline">{status}</Badge>;
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

  // Determine if a payment is "actionable" (pending or legacy statuses that need triage)
  const isPending = (status: string) => status === "pending";

  return (
    <div>
      {/* Confirm approve dialog */}
      <ConfirmAlertDialog
        open={!!verifyTarget}
        onOpenChange={() => setVerifyTarget(null)}
        onConfirm={executeVerify}
        title="Setujui Pembayaran?"
        description="Pembayaran akan diverifikasi, status booking diupdate otomatis, dan jamaah mendapat notifikasi."
        confirmLabel="Setujui"
        variant="default"
      />

      {/* Reject dialog with reason input */}
      <Dialog open={rejectDialogOpen} onOpenChange={(o) => { setRejectDialogOpen(o); if (!o) setRejectTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" /> Tolak Pembayaran
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Booking: <span className="font-mono font-semibold">{rejectTarget?.booking?.bookingCode}</span>
              {" · "}Rp {rejectTarget?.amount?.toLocaleString("id-ID")}
            </p>
            <div className="space-y-2">
              <Label>Alasan penolakan <span className="text-muted-foreground">(opsional)</span></Label>
              <Textarea
                placeholder="Contoh: Bukti tidak jelas, nominal tidak sesuai, rekening berbeda..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={executeReject}>
              <XCircle className="w-4 h-4 mr-2" /> Tolak Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-display font-bold">Verifikasi Pembayaran</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button variant="outline" onClick={() => {
            const headers = ["Kode Booking", "Tipe", "Jumlah", "Metode", "Status", "Tanggal"];
            const rows = filteredPayments.map(p => [
              p.booking?.bookingCode || "-",
              p.paymentType === "dp" ? "DP" : "Pelunasan",
              String(p.amount),
              p.paymentMethod || "-",
              p.status || "pending",
              p.createdAt?.slice(0, 10) || ""
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
            {[
              { key: "all", label: "Semua" },
              { key: "pending", label: "Menunggu" },
              { key: "verified", label: "Terverifikasi" },
              { key: "rejected", label: "Ditolak" },
            ].map(({ key, label }) => (
              <Button key={key} variant={statusFilter === key ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(key)}>
                {label}
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
              Bukti Pembayaran - {selectedPayment?.booking?.bookingCode}
            </DialogTitle>
          </DialogHeader>
          {selectedPayment?.proofUrl && (
            <div className="space-y-4">
              <div className="relative overflow-auto max-h-[60vh] bg-muted rounded-lg">
                {proofLoading ? (
                  <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Memuat bukti…</div>
                ) : proofError ? (
                  <div className="p-8 flex flex-col items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="w-5 h-5" /> {proofError}
                    <Button variant="outline" size="sm" onClick={reloadProof}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Coba lagi</Button>
                  </div>
                ) : proofViewUrl ? (
                  <img src={proofViewUrl} alt="Bukti pembayaran" className="w-full transition-transform duration-200 cursor-zoom-in" style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top left" }} onClick={handleZoom} />
                ) : null}
                <Button variant="secondary" size="sm" className="absolute top-2 right-2" onClick={handleZoom} disabled={!proofViewUrl}>
                  <ZoomIn className="w-4 h-4 mr-1" />{Math.round(zoomLevel * 100)}%
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div><div className="text-xs text-muted-foreground">Tipe</div><div className="font-semibold">{getPaymentTypeLabel(selectedPayment.paymentType)}</div></div>
                <div><div className="text-xs text-muted-foreground">Metode</div><div className="font-semibold capitalize">{selectedPayment.paymentMethod || "-"}</div></div>
                <div><div className="text-xs text-muted-foreground">Tanggal Upload</div><div className="font-semibold">{format(new Date(selectedPayment.createdAt), "d MMM yyyy HH:mm", { locale: localeId })}</div></div>
                <div><div className="text-xs text-muted-foreground">Jumlah</div><div className="text-xl font-bold text-gold">Rp {selectedPayment.amount.toLocaleString("id-ID")}</div></div>
              </div>
              {selectedPayment.status === "pending" && (
                <div className="flex justify-end gap-3">
                  {proofViewUrl ? (
                    <Button variant="outline" asChild>
                      <a href={proofViewUrl} download target="_blank" rel="noopener noreferrer"><Download className="w-4 h-4 mr-2" /> Download</a>
                    </Button>
                  ) : (
                    <Button variant="outline" disabled>
                      {proofLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />} Download
                    </Button>
                  )}
                  <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => { handleReject(selectedPayment); setImageOpen(false); }}>
                    <XCircle className="w-4 h-4 mr-2" /> Tolak
                  </Button>
                  <Button className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => { handleApprove(selectedPayment); setImageOpen(false); }}>
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
                      <TableCell className="font-mono font-semibold">{payment.booking?.bookingCode || "-"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{getPaymentTypeLabel(payment.paymentType)}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1"><DollarSign className="w-4 h-4 text-muted-foreground" /><span className="font-semibold">Rp {payment.amount.toLocaleString("id-ID")}</span></div>
                      </TableCell>
                      <TableCell className="capitalize">{payment.paymentMethod || "-"}</TableCell>
                      <TableCell>
                        {payment.proofUrl ? (
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedPayment(payment); setImageOpen(true); }} className="text-info hover:text-info/80">
                            <Image className="w-4 h-4 mr-1" /> Lihat
                          </Button>
                        ) : <span className="text-muted-foreground text-sm">Tidak ada</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {payment.createdAt && !isNaN(new Date(payment.createdAt).getTime())
                          ? format(new Date(payment.createdAt), "d MMM yyyy HH:mm", { locale: localeId })
                          : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status || "pending")}</TableCell>
                      <TableCell className="text-right">
                        {isPending(payment.status) && (
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80 hover:bg-destructive/10" onClick={() => handleReject(payment)} title="Tolak"><XCircle className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-success hover:text-success/80 hover:bg-success/10" onClick={() => handleApprove(payment)} title="Setujui"><CheckCircle className="w-4 h-4" /></Button>
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
