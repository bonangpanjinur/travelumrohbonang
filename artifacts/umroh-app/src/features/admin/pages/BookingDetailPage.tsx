import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { supabaseAuth } from "@/shared/integrations/supabase/auth-client";
import BookingDetailPanel from "@/features/admin/components/BookingDetailPanel";
import BookingStatusBadge from "@/features/admin/components/BookingStatusBadge";
import ChangeRoomModal from "@/features/admin/components/ChangeRoomModal";
import ChangeDepartureModal from "@/features/admin/components/ChangeDepartureModal";
import { fetchInvoiceData, generateInvoiceHTML, openInvoicePrintWindow } from "@/features/admin/components/InvoiceGenerator";
import { fetchPassportRecommendationData, generatePassportRecommendationHTML, openPassportRecommendationPrintWindow } from "@/features/admin/components/PassportRecommendationGenerator";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  ArrowLeft, ChevronDown, CheckCircle2, XCircle, Trophy,
  Bed, Calendar, FileDown, ExternalLink, Loader2,
  Package, CreditCard, Banknote, AlertCircle, RefreshCw,
  User, Phone, Building2, UserCheck,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";

interface BookingHeader {
  id: string;
  bookingCode: string;
  status: string;
  packageId: string | null;
  packageTitle: string | null;
  packageSlug: string | null;
  departureId: string | null;
  departureDate: string | null;
  branchId: string | null;
  branchName: string | null;
  totalPrice: number;
  paymentStatus: string;
  picType: string | null;
  picId: string | null;
  picName: string | null;
  picPhone: string | null;
  pemesanName: string | null;
  pemesanPhone: string | null;
  pemesanEmail: string | null;
  groupName: string | null;
  isGroupBooking: boolean;
  notes: string | null;
  user: { id: string; name: string; email: string; phone?: string | null } | null;
}

const VALID_TRANSITIONS: Record<string, { status: string; label: string; icon: React.ReactNode; variant: "default" | "destructive" }[]> = {
  draft: [
    { status: "confirmed", label: "Konfirmasi", icon: <CheckCircle2 className="w-3.5 h-3.5" />, variant: "default" },
    { status: "cancelled", label: "Batalkan", icon: <XCircle className="w-3.5 h-3.5" />, variant: "destructive" },
  ],
  pending: [
    { status: "confirmed", label: "Konfirmasi", icon: <CheckCircle2 className="w-3.5 h-3.5" />, variant: "default" },
    { status: "cancelled", label: "Batalkan", icon: <XCircle className="w-3.5 h-3.5" />, variant: "destructive" },
  ],
  confirmed: [
    { status: "completed", label: "Tandai Selesai", icon: <Trophy className="w-3.5 h-3.5" />, variant: "default" },
    { status: "cancelled", label: "Batalkan", icon: <XCircle className="w-3.5 h-3.5" />, variant: "destructive" },
  ],
};

const picTypeLabel: Record<string, string> = {
  cabang: "Cabang", agen: "Agen", karyawan: "Karyawan", pusat: "Pusat",
};
const picTypeBadgeColor: Record<string, string> = {
  agen: "bg-blue-100 text-blue-700 border-blue-200",
  karyawan: "bg-purple-100 text-purple-700 border-purple-200",
  cabang: "bg-orange-100 text-orange-700 border-orange-200",
  pusat: "bg-gray-100 text-gray-600 border-gray-200",
};

const payStatusConfig: Record<string, { label: string; cls: string }> = {
  paid: { label: "✓ Lunas", cls: "text-green-700 bg-green-50 border-green-200" },
  partial: { label: "DP / Cicil", cls: "text-amber-700 bg-amber-50 border-amber-200" },
  unpaid: { label: "Belum Bayar", cls: "text-red-700 bg-red-50 border-red-200" },
};

const formatDate = (d: string | null | undefined) => {
  if (!d) return "-";
  try { return format(new Date(d), "d MMM yyyy", { locale: localeId }); } catch { return d; }
};

const BookingDetailPage = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<BookingHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState(false);
  const [printingInvoice, setPrintingInvoice] = useState(false);
  const [showChangeRoom, setShowChangeRoom] = useState(false);
  const [showChangeDeparture, setShowChangeDeparture] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description?: string;
    onConfirm: () => void; destructive?: boolean;
  }>({ open: false, title: "", onConfirm: () => {} });

  const fetchBooking = async () => {
    if (!bookingId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<any>(`/api/admin/bookings/${bookingId}`);
      setBooking({
        id: data.id,
        bookingCode: data.bookingCode,
        status: data.status ?? "draft",
        packageId: data.packageId ?? null,
        packageTitle: data.packageTitle ?? null,
        packageSlug: data.packageSlug ?? null,
        departureId: data.departureId ?? null,
        departureDate: data.departureDate ?? null,
        branchId: data.branchId ?? null,
        branchName: data.branchName ?? null,
        totalPrice: Number(data.totalPrice) || 0,
        paymentStatus: data.paymentStatus ?? "unpaid",
        picType: data.picType ?? null,
        picId: data.picId ?? null,
        picName: data.picName ?? null,
        picPhone: data.picPhone ?? null,
        pemesanName: data.pemesanName ?? null,
        pemesanPhone: data.pemesanPhone ?? null,
        pemesanEmail: data.pemesanEmail ?? null,
        groupName: data.groupName ?? null,
        isGroupBooking: data.isGroupBooking ?? false,
        notes: data.notes ?? null,
        user: data.user ?? null,
      });
    } catch (e: any) {
      setError(e?.message || "Gagal memuat detail booking");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBooking(); }, [bookingId]);

  const showConfirm = (title: string, description: string, onConfirm: () => void, destructive = false) =>
    setConfirmDialog({ open: true, title, description, onConfirm, destructive });

  const handleStatusChange = (newStatus: string) => {
    if (!booking) return;
    const action = VALID_TRANSITIONS[booking.status]?.find((t) => t.status === newStatus);
    if (!action) return;
    showConfirm(
      `${action.label} booking ini?`,
      `Status akan berubah dari "${booking.status}" → "${newStatus}".`,
      async () => {
        setChangingStatus(true);
        try {
          await apiFetch(`/api/admin/bookings/${booking.id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: newStatus }),
          });
          toast.success(`Status berhasil diubah ke "${action.label}"`);
          fetchBooking();
        } catch (e: any) {
          toast.error(e?.message || "Gagal mengubah status booking");
        } finally {
          setChangingStatus(false);
        }
      },
      action.variant === "destructive",
    );
  };

  const handleDownloadInvoice = async () => {
    if (!bookingId) return;
    setPrintingInvoice(true);
    try {
      const data = await fetchInvoiceData(bookingId);
      if (!data) { toast.error("Gagal mengambil data invoice"); return; }
      const html = await generateInvoiceHTML(data);
      openInvoicePrintWindow(html);
    } catch { toast.error("Gagal membuat invoice"); }
    finally { setPrintingInvoice(false); }
  };

  if (!bookingId) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
        <AlertCircle className="w-12 h-12 text-destructive/60" />
        <div>
          <p className="font-medium text-destructive">Gagal memuat booking</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
          </Button>
          <Button variant="outline" size="sm" onClick={fetchBooking}>
            <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  const transitions = VALID_TRANSITIONS[booking.status] ?? [];
  const payStat = payStatusConfig[booking.paymentStatus] ?? payStatusConfig.unpaid;
  const isPusat = !booking.picType || booking.picType === "pusat";

  return (
    <div className="space-y-6 pb-10">
      {/* ── Sticky-feel header ────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl px-5 py-4 space-y-3">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
          <Link
            to="/admin/bookings"
            className="hover:text-foreground transition-colors flex items-center gap-1 shrink-0"
          >
            Daftar Booking
          </Link>
          <ChevronDown className="w-3.5 h-3.5 -rotate-90 shrink-0 opacity-40" />
          <span className="font-mono text-foreground font-semibold shrink-0">{booking.bookingCode}</span>
          {booking.pemesanName && (
            <>
              <span className="opacity-30 shrink-0">·</span>
              <span className="text-muted-foreground truncate max-w-[180px]">{booking.pemesanName}</span>
            </>
          )}
        </nav>

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Kembali"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="font-mono text-2xl font-bold tracking-tight">{booking.bookingCode}</h1>
            <BookingStatusBadge status={booking.status} />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {transitions.length > 0 && (
              transitions.length === 1 ? (
                <Button
                  size="sm"
                  variant={transitions[0].variant}
                  onClick={() => handleStatusChange(transitions[0].status)}
                  disabled={changingStatus}
                  className={transitions[0].variant === "default" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                >
                  {changingStatus ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : transitions[0].icon}
                  <span className="ml-1.5">{transitions[0].label}</span>
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" disabled={changingStatus}>
                      {changingStatus ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                      Ubah Status <ChevronDown className="w-3 h-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {transitions.map((t) => (
                      <DropdownMenuItem
                        key={t.status}
                        onClick={() => handleStatusChange(t.status)}
                        className={t.variant === "destructive" ? "text-destructive focus:text-destructive" : ""}
                      >
                        {t.icon}<span className="ml-2">{t.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            )}
            <Button size="sm" variant="outline" onClick={() => setShowChangeRoom(true)}>
              <Bed className="w-3.5 h-3.5 mr-1.5" /> Ubah Kamar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowChangeDeparture(true)}>
              <Calendar className="w-3.5 h-3.5 mr-1.5" /> Ubah Keberangkatan
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadInvoice} disabled={printingInvoice}>
              {printingInvoice ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5 mr-1.5" />}
              Cetak Invoice
            </Button>
            <Button
              size="sm" variant="outline"
              onClick={async () => {
                try {
                  const data = await fetchPassportRecommendationData(booking.id);
                  if (!data) throw new Error("Gagal mengambil data surat rekomendasi");
                  const html = await generatePassportRecommendationHTML(data);
                  openPassportRecommendationPrintWindow(html);
                } catch (e: any) {
                  toast.error(e?.message || "Gagal generate surat rekomendasi");
                }
              }}
            >
              <FileDown className="w-3.5 h-3.5 mr-1.5" /> Surat Rekomendasi Paspor
            </Button>
            {booking.departureId && (
              <Button size="sm" variant="outline" onClick={() => navigate(`/admin/manifest?departureId=${booking.departureId}`)}>
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Lihat Manifest
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Info strip — 4 cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Paket */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Package className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Paket</p>
            <p className="font-semibold text-sm mt-0.5 leading-tight">{booking.packageTitle || "-"}</p>
          </div>
        </div>

        {/* Keberangkatan */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-50 shrink-0">
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Keberangkatan</p>
            <p className="font-semibold text-sm mt-0.5">{formatDate(booking.departureDate)}</p>
          </div>
        </div>

        {/* Total Harga */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-green-50 shrink-0">
            <Banknote className="w-4 h-4 text-green-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Harga</p>
            <p className="font-semibold text-sm mt-0.5 tabular-nums">Rp {booking.totalPrice.toLocaleString("id-ID")}</p>
          </div>
        </div>

        {/* Status Bayar */}
        <div className={`bg-card border rounded-xl p-4 flex items-start gap-3 ${booking.paymentStatus === 'paid' ? 'border-green-200' : booking.paymentStatus === 'partial' ? 'border-amber-200' : 'border-red-200'}`}>
          <div className={`p-2 rounded-lg shrink-0 ${booking.paymentStatus === 'paid' ? 'bg-green-50' : booking.paymentStatus === 'partial' ? 'bg-amber-50' : 'bg-red-50'}`}>
            <CreditCard className={`w-4 h-4 ${booking.paymentStatus === 'paid' ? 'text-green-600' : booking.paymentStatus === 'partial' ? 'text-amber-600' : 'text-red-600'}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Status Bayar</p>
            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border font-semibold ${payStat.cls}`}>
              {payStat.label}
            </span>
          </div>
        </div>
      </div>

      {/* ── Data Pemesan & Penginput ─────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">

        {/* --- Pemesan (dari form) ---------------------------------------- */}
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-primary" />
            Data Pemesan
            <span className="text-xs font-normal text-muted-foreground">(ditagihkan di invoice)</span>
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm">
            {/* Nama Pemesan */}
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Nama Pemesan</p>
              <p className="font-semibold">{booking.pemesanName || booking.user?.name || "-"}</p>
              {booking.user?.name && booking.user.name !== booking.pemesanName && (
                <p className="text-xs text-muted-foreground mt-0.5">Akun: {booking.user.name}</p>
              )}
            </div>

            {/* HP / WhatsApp */}
            {(booking.pemesanPhone || booking.picPhone) && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-0.5">No. HP / WhatsApp</p>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-medium">{booking.pemesanPhone || booking.picPhone}</span>
                  <a
                    href={`https://wa.me/${(booking.pemesanPhone || booking.picPhone || "").replace(/\D/g, "")}`}
                    target="_blank" rel="noreferrer"
                    className="text-green-600 hover:text-green-700 transition-colors"
                    title="WhatsApp"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </a>
                </div>
              </div>
            )}

            {/* Email */}
            {booking.pemesanEmail && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-0.5">Email</p>
                <p className="font-medium text-sm break-all">{booking.pemesanEmail}</p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border" />

        {/* --- Penginput & Cabang ----------------------------------------- */}
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <UserCheck className="w-4 h-4 text-muted-foreground" /> Penginput &amp; Cabang
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm">
            {/* Diinput oleh */}
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Diinput Oleh</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{booking.picName || (isPusat ? "Kantor Pusat" : "-")}</span>
                {booking.picType && (
                  <span className={`text-xs px-1.5 py-0.5 rounded border font-semibold ${picTypeBadgeColor[booking.picType] ?? picTypeBadgeColor.pusat}`}>
                    {picTypeLabel[booking.picType] ?? booking.picType}
                  </span>
                )}
              </div>
              {booking.user?.email && (
                <p className="text-xs text-muted-foreground mt-0.5">Akun: {booking.user.email}</p>
              )}
            </div>

            {/* Cabang */}
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Cabang</p>
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-medium">{booking.branchName || "— Tanpa Cabang —"}</span>
              </div>
            </div>

            {/* Rombongan */}
            {booking.isGroupBooking && booking.groupName && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-0.5">Nama Rombongan</p>
                <p className="font-medium">{booking.groupName}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Detail panel (pilgrims, payments, rooms, notes, status logs) ─── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <BookingDetailPanel
          bookingId={booking.id}
          packageId={booking.packageId}
          departureId={booking.departureId}
          departureDate={booking.departureDate}
          picType={booking.picType}
          picId={booking.picId}
          packageTitle={booking.packageTitle || "-"}
          branchId={booking.branchId}
          status={booking.status}
          onBranchChange={fetchBooking}
          onBookingChange={fetchBooking}
          pemesanName={booking.pemesanName}
          pemesanPhone={booking.pemesanPhone}
          isGroupBooking={booking.isGroupBooking}
          groupName={booking.groupName}
          groupPicName={booking.picName}
          groupPicPhone={booking.picPhone}
          standalone={true}
        />
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <ChangeRoomModal
        bookingId={booking.id}
        departureId={booking.departureId ?? null}
        currentRooms={[]}
        open={showChangeRoom}
        onOpenChange={setShowChangeRoom}
        onSuccess={fetchBooking}
      />

      <ChangeDepartureModal
        bookingId={booking.id}
        packageId={booking.packageId}
        currentDepartureDate={booking.departureDate ?? null}
        open={showChangeDeparture}
        onOpenChange={setShowChangeDeparture}
        onSuccess={fetchBooking}
      />

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => !open && setConfirmDialog((d) => ({ ...d, open: false }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            {confirmDialog.description && (
              <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDialog((d) => ({ ...d, open: false }));
                confirmDialog.onConfirm();
              }}
              className={confirmDialog.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              Ya, Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BookingDetailPage;
