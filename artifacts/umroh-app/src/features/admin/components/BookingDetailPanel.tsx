import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/shared/lib/apiClient";
import {
  Users, UserCheck, DollarSign, FileDown, Building2, UsersRound,
  PhoneCall, History, ExternalLink, Bed, Calendar, Loader2,
  Plus, Trash2, Save, X, CheckCircle2, XCircle, Trophy, ChevronDown,
  CreditCard, FileText, Pencil, Search, AlertCircle, Globe,
  Upload, Ban, RotateCcw, CalendarDays,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { fetchInvoiceData, generateInvoiceHTML, openInvoicePrintWindow } from "./InvoiceGenerator";
import PilgrimDetailDrawer, { type FullPilgrim } from "./PilgrimDetailDrawer";
import DepartureDetailDrawer from "./DepartureDetailDrawer";
import ChangeRoomModal from "./ChangeRoomModal";
import ChangeDepartureModal from "./ChangeDepartureModal";
import PilgrimEquipmentPanel from "./PilgrimEquipmentPanel";
import PilgrimDocumentPanel from "./PilgrimDocumentPanel";
import { toast } from "sonner";

interface Branch { id: string; name: string; }

// Status transitions yang diperbolehkan (mirror dari backend state machine)
const VALID_TRANSITIONS: Record<string, { status: string; label: string; icon: React.ReactNode; variant: "default" | "destructive" | "outline" }[]> = {
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

interface BookingDetailPanelProps {
  bookingId: string;
  packageId: string | null;
  departureId?: string | null;
  departureDate?: string | null;
  picType: string | null;
  picId: string | null;
  packageTitle: string;
  branchId?: string | null;
  status?: string;
  onBranchChange?: () => void;
  onBookingChange?: () => void;
  pemesanName?: string | null;
  pemesanPhone?: string | null;
  isGroupBooking?: boolean;
  groupName?: string | null;
  groupPicName?: string | null;
  groupPicPhone?: string | null;
  /** When true, hides the top action bar (status change, room, departure, invoice buttons).
   *  Use this when rendering inside BookingDetailPage which has its own action header. */
  standalone?: boolean;
}

interface Room {
  id: string;
  roomType: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface Payment {
  id: string;
  type: string;
  amount: number;
  paidAt: string;
  method: string | null;
  referenceNumber: string | null;
  notes: string | null;
  isVoided: boolean;
}

interface PaymentSummary {
  totalPrice: number;
  totalPaid: number;
  remaining: number;
  paymentStatus: string;
  payments: Payment[];
}

interface NewJamaahForm {
  name: string;
  phone: string;
  gender: string;
  email: string;
  nik: string;
  birthDate: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
}

/** Returns completeness level: 'complete' | 'partial' | 'empty' */
function getPilgrimCompleteness(p: FullPilgrim): "complete" | "partial" | "empty" {
  const required = [p.nik, p.passportNumber, p.passportExpiry, p.gender, p.phone];
  const filled = required.filter(Boolean).length;
  if (filled === required.length) return "complete";
  if (filled >= 2) return "partial";
  return "empty";
}

const COMPLETENESS_CFG = {
  complete: { label: "Lengkap",   cls: "text-green-600",  title: "Data lengkap (NIK, paspor, HP, gender terisi)" },
  partial:  { label: "Sebagian",  cls: "text-amber-500",  title: "Data belum lengkap — klik untuk melengkapi" },
  empty:    { label: "Minim",     cls: "text-red-500",    title: "Data sangat minim — perlu dilengkapi segera" },
};

interface NewPaymentForm {
  type: string;
  amount: string;
  paidAt: string;
  method: string;
  notes: string;
  proofUrl?: string;
}

const ROOM_LABELS: Record<string, string> = {
  quad: "Quad", triple: "Triple", double: "Double", single: "Single",
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  dp: "DP (Uang Muka)",
  pelunasan: "Pelunasan",
  cicilan: "Cicilan",
  manual: "Manual",
};

const emptyNewJamaah = (): NewJamaahForm => ({
  name: "", phone: "", gender: "", email: "",
  nik: "", birthDate: "", nationality: "", passportNumber: "", passportExpiry: "",
});
const emptyNewPayment = (): NewPaymentForm => ({
  type: "dp",
  amount: "",
  paidAt: new Date().toISOString().split("T")[0],
  method: "",
  notes: "",
  proofUrl: undefined,
});

const BookingDetailPanel = ({
  bookingId, packageId, departureId, departureDate,
  picType, picId, packageTitle, branchId,
  status: initialStatus,
  onBranchChange, onBookingChange,
  pemesanName, pemesanPhone,
  isGroupBooking, groupName, groupPicName, groupPicPhone,
  standalone = false,
}: BookingDetailPanelProps) => {
  const [pilgrims, setPilgrims] = useState<FullPilgrim[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [paymentFetchError, setPaymentFetchError] = useState(false);
  const [commissionRate, setCommissionRate] = useState<number>(0);
  const [picName, setPicName] = useState<string>("-");
  const [agentCommission, setAgentCommission] = useState<{ id: string; status: string; amount: number } | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branchId || "none");
  const [savingBranch, setSavingBranch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [printingInvoice, setPrintingInvoice] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>(initialStatus || "");
  const [changingStatus, setChangingStatus] = useState(false);
  const [statusLogs, setStatusLogs] = useState<Array<{
    id: string; fromStatus: string | null; toStatus: string;
    changedBy: string | null; notes: string | null; createdAt: string;
  }>>([]);

  // Add jamaah inline form
  const [showAddJamaah, setShowAddJamaah] = useState(false);
  const [newJamaah, setNewJamaah] = useState<NewJamaahForm>(emptyNewJamaah());
  const [savingJamaah, setSavingJamaah] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Jamaah search/filter
  const [jamaahSearch, setJamaahSearch] = useState("");

  // Import CSV
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [importingCsv, setImportingCsv] = useState(false);

  // Void payment
  const [voidingPaymentId, setVoidingPaymentId] = useState<string | null>(null);

  // Refund modal
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundForm, setRefundForm] = useState({ reason: "", amount: "", bankName: "", bankAccount: "", accountHolder: "" });
  const [savingRefund, setSavingRefund] = useState(false);

  // Installment schedule
  const [installments, setInstallments] = useState<Array<{
    id: string; installmentNumber: number; dueDate: string;
    amount: number; status: string; paidAt: string | null;
  }>>([]);

  // Payment form
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [newPayment, setNewPayment] = useState<NewPaymentForm>(emptyNewPayment());
  const [uploadingProof, setUploadingProof] = useState(false);
  const proofInputRef = useRef<HTMLInputElement>(null);

  // BKG-F03: Notes
  const [notes, setNotes] = useState<string>("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  // Confirm dialog (replaces window.confirm)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description?: string;
    onConfirm: () => void; destructive?: boolean;
  }>({ open: false, title: "", onConfirm: () => {} });

  const showConfirm = (
    title: string, description: string, onConfirm: () => void, destructive = false,
  ) => setConfirmDialog({ open: true, title, description, onConfirm, destructive });

  // Modal/drawer state
  const [selectedPilgrim, setSelectedPilgrim] = useState<FullPilgrim | null>(null);
  const [showDepartureDrawer, setShowDepartureDrawer] = useState(false);
  const [showChangeRoom, setShowChangeRoom] = useState(false);
  const [showChangeDeparture, setShowChangeDeparture] = useState(false);

  useEffect(() => {
    apiFetch<any[]>("/api/admin/branches")
      .then((data) => setBranches((data || []).map((b: any) => ({ id: b.id, name: b.name }))))
      .catch(() => toast.error("Gagal memuat daftar cabang"));
  }, []);

  const handleBranchChange = async (value: string) => {
    setSelectedBranchId(value);
    setSavingBranch(true);
    try {
      await apiFetch(`/api/admin/bookings/${bookingId}/branch`, {
        method: "PATCH",
        body: JSON.stringify({ branchId: value === "none" ? null : value }),
      });
      toast.success("Cabang berhasil diupdate");
      onBranchChange?.();
    } catch {
      toast.error("Gagal menyimpan cabang");
    } finally {
      setSavingBranch(false);
    }
  };

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const [detail, logs, paymentsRes] = await Promise.allSettled([
        apiFetch<any>(`/api/admin/bookings/${bookingId}`),
        apiFetch<any[]>(`/api/admin/bookings/${bookingId}/status-logs`),
        apiFetch<PaymentSummary>(`/api/admin/bookings/${bookingId}/payments`),
      ]);

      if (detail.status === "fulfilled") {
        const d = detail.value;
        setNotes(d.notes ?? "");
        setPilgrims(
          (d.pilgrims || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            gender: p.gender ?? null,
            phone: p.phone ?? null,
            email: p.email ?? null,
            nik: p.nik ?? null,
            birthDate: p.birthDate ?? p.birth_date ?? null,
            passportNumber: p.passportNumber ?? p.passport_number ?? null,
            passportExpiry: p.passportExpiry ?? p.passport_expiry ?? null,
            roomType: p.roomType ?? p.room_type ?? null,
            roomNumber: p.roomNumber ?? p.room_number ?? null,
            nationality: p.nationality ?? null,
            seatNumber: p.seatNumber ?? p.seat_number ?? null,
            flightSegment: p.flightSegment ?? p.flight_segment ?? null,
            notes: p.notes ?? null,
          }))
        );
        setRooms(
          (d.rooms || []).map((r: any) => ({
            id: r.id,
            roomType: r.roomType ?? r.room_type,
            quantity: Number(r.quantity),
            price: Number(r.price),
            subtotal: Number(r.subtotal),
          }))
        );
      }
      if (logs.status === "fulfilled") setStatusLogs(logs.value || []);
      if (paymentsRes.status === "fulfilled") {
        setPaymentSummary(paymentsRes.value);
        setPaymentFetchError(false);
      } else {
        setPaymentFetchError(true);
      }

      // Fetch installment schedule
      apiFetch<{ data: any[] }>(`/api/admin/installments?bookingId=${bookingId}`)
        .then((r) => setInstallments((r?.data ?? []).map((s: any) => ({
          id: s.id,
          installmentNumber: s.installmentNumber,
          dueDate: s.dueDate,
          amount: Number(s.amount),
          status: s.status,
          paidAt: s.paidAt ?? null,
        }))))
        .catch(() => {});

      // Fetch commission rate + PIC name + agent commission status
      apiFetch<{ commissionRate: number; picName: string | null; agentCommission: { id: string; status: string; amount: number } | null }>(
        `/api/admin/bookings/${bookingId}/pic-info`
      ).then((info) => {
        if (info.commissionRate) setCommissionRate(info.commissionRate);
        if (info.picName) setPicName(info.picName);
        if (info.agentCommission !== undefined) setAgentCommission(info.agentCommission);
      }).catch(() => {});
    } catch (e) {
      console.error("[BookingDetailPanel] fetch error", e);
      toast.error("Gagal memuat detail booking");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchDetails().finally(() => { if (!active) return; });
    return () => { active = false; };
  }, [bookingId, packageId, picType, picId]);

  const handleDownloadInvoice = async () => {
    setPrintingInvoice(true);
    try {
      const data = await fetchInvoiceData(bookingId);
      if (!data) { toast.error("Gagal mengambil data invoice"); return; }
      const html = await generateInvoiceHTML(data);
      openInvoicePrintWindow(html);
    } catch {
      toast.error("Gagal membuat invoice");
    } finally {
      setPrintingInvoice(false);
    }
  };

  const handleBookingChanged = () => {
    fetchDetails();
    onBookingChange?.();
    onBranchChange?.();
  };

  // ── Ubah Status Booking ─────────────────────────────────────────────────
  const handleStatusChange = (newStatus: string) => {
    const action = VALID_TRANSITIONS[currentStatus]?.find((t) => t.status === newStatus);
    if (!action) return;
    showConfirm(
      `${action.label} booking ini?`,
      `Status akan berubah dari "${currentStatus}" → "${newStatus}".`,
      async () => {
        setChangingStatus(true);
        try {
          await apiFetch(`/api/admin/bookings/${bookingId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: newStatus }),
          });
          toast.success(`Status berhasil diubah ke "${action.label}"`);
          setCurrentStatus(newStatus);
          fetchDetails();
          onBookingChange?.();
        } catch (e: any) {
          toast.error(e?.message || "Gagal mengubah status booking");
        } finally {
          setChangingStatus(false);
        }
      },
      action.variant === "destructive",
    );
  };

  // ── Tambah jamaah ─────────────────────────────────────────────────────────
  const handleAddJamaah = async () => {
    if (!newJamaah.name.trim()) { toast.error("Nama jamaah wajib diisi"); return; }
    setSavingJamaah(true);
    try {
      await apiFetch(`/api/admin/bookings/${bookingId}/pilgrims`, {
        method: "POST",
        body: JSON.stringify({
          name:           newJamaah.name.trim(),
          phone:          newJamaah.phone.trim()          || null,
          gender:         newJamaah.gender                || null,
          email:          newJamaah.email.trim()          || null,
          nik:            newJamaah.nik.trim()            || null,
          birthDate:      newJamaah.birthDate             || null,
          nationality:    newJamaah.nationality.trim()    || null,
          passportNumber: newJamaah.passportNumber.trim() || null,
          passportExpiry: newJamaah.passportExpiry        || null,
        }),
      });
      toast.success(`${newJamaah.name} berhasil ditambahkan`);
      setNewJamaah(emptyNewJamaah());
      setShowAddJamaah(false);
      fetchDetails();
      onBookingChange?.();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menambahkan jamaah");
    } finally {
      setSavingJamaah(false);
    }
  };

  // ── Hapus jamaah ──────────────────────────────────────────────────────────
  const handleRemoveJamaah = (pilgrimId: string, name: string) => {
    showConfirm(
      `Hapus jamaah "${name}"?`,
      "Jamaah akan dihapus permanen dari booking ini. Tindakan ini tidak bisa dibatalkan.",
      async () => {
        setRemovingId(pilgrimId);
        try {
          await apiFetch(`/api/admin/pilgrims/${pilgrimId}`, { method: "DELETE" });
          toast.success(`${name} dihapus dari booking`);
          fetchDetails();
          onBookingChange?.();
        } catch (e: any) {
          toast.error(e?.message || "Gagal menghapus jamaah");
        } finally {
          setRemovingId(null);
        }
      },
      true,
    );
  };

  // ── Upload bukti pembayaran ───────────────────────────────────────────────
  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingProof(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // apiFetch otomatis menyertakan Authorization Bearer token dari Supabase session
      // (raw fetch tidak mengirim token sehingga menyebabkan 401 di admin middleware)
      const { url } = await apiFetch<{ url: string; filename: string; size: number }>(
        "/api/admin/payments/upload-proof",
        { method: "POST", body: fd },
      );
      setNewPayment((p) => ({ ...p, proofUrl: url }));
      toast.success("Bukti pembayaran berhasil diupload");
    } catch (e: any) {
      toast.error(e?.message || "Gagal upload bukti pembayaran");
    } finally {
      setUploadingProof(false);
    }
  };

  // ── Tambah pembayaran manual ──────────────────────────────────────────────
  const handleAddPayment = async () => {
    const amount = parseInt(newPayment.amount.replace(/\D/g, ""));
    if (!amount || amount <= 0) { toast.error("Jumlah pembayaran wajib diisi"); return; }
    setSavingPayment(true);
    try {
      await apiFetch(`/api/admin/bookings/${bookingId}/payments`, {
        method: "POST",
        body: JSON.stringify({
          type:     newPayment.type,
          amount,
          paidAt:   newPayment.paidAt,
          method:   newPayment.method || undefined,
          notes:    newPayment.notes  || undefined,
          proofUrl: newPayment.proofUrl || undefined,
        }),
      });
      toast.success("Pembayaran berhasil dicatat");
      setNewPayment(emptyNewPayment());
      setShowAddPayment(false);
      fetchDetails();
      onBookingChange?.();
    } catch (e: any) {
      toast.error(e?.message || "Gagal mencatat pembayaran");
    } finally {
      setSavingPayment(false);
    }
  };

  // ── BKG-F03: Simpan catatan booking ──────────────────────────────────────
  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await apiFetch(`/api/admin/bookings/${bookingId}/notes`, {
        method: "PATCH",
        body: JSON.stringify({ notes: notes.trim() || null }),
      });
      toast.success("Catatan berhasil disimpan");
      setEditingNotes(false);
    } catch {
      toast.error("Gagal menyimpan catatan");
    } finally {
      setSavingNotes(false);
    }
  };

  // ── Void pembayaran ───────────────────────────────────────────────────────
  const handleVoidPayment = (paymentId: string, amount: number) => {
    showConfirm(
      "Batalkan pembayaran ini?",
      `Pembayaran Rp ${amount.toLocaleString("id-ID")} akan dibatalkan (void). Tindakan ini tidak dapat diurungkan.`,
      async () => {
        setVoidingPaymentId(paymentId);
        try {
          await apiFetch(`/api/admin/bookings/${bookingId}/payments/${paymentId}`, { method: "DELETE" });
          toast.success("Pembayaran berhasil dibatalkan");
          fetchDetails();
          onBookingChange?.();
        } catch (e: any) {
          toast.error(e?.message || "Gagal membatalkan pembayaran");
        } finally {
          setVoidingPaymentId(null);
        }
      },
      true,
    );
  };

  // ── Submit refund request ──────────────────────────────────────────────────
  const handleRefundSubmit = async () => {
    const amount = parseInt(refundForm.amount.replace(/\D/g, ""));
    if (!refundForm.reason.trim() || !amount) {
      toast.error("Alasan dan jumlah refund wajib diisi");
      return;
    }
    setSavingRefund(true);
    try {
      await apiFetch("/api/admin/refunds", {
        method: "POST",
        body: JSON.stringify({
          bookingId,
          reason:         refundForm.reason.trim(),
          amount,
          bankName:       refundForm.bankName.trim()       || null,
          bankAccount:    refundForm.bankAccount.trim()    || null,
          accountHolder:  refundForm.accountHolder.trim()  || null,
        }),
      });
      toast.success("Permintaan refund berhasil dibuat");
      setShowRefundModal(false);
      setRefundForm({ reason: "", amount: "", bankName: "", bankAccount: "", accountHolder: "" });
    } catch (e: any) {
      toast.error(e?.message || "Gagal membuat permintaan refund");
    } finally {
      setSavingRefund(false);
    }
  };

  // ── Import jemaah dari CSV ─────────────────────────────────────────────────
  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImportingCsv(true);
    try {
      const Papa = (await import("papaparse")).default;
      const result = await new Promise<any>((resolve, reject) => {
        Papa.parse(file, {
          header: true, skipEmptyLines: true,
          complete: resolve, error: reject,
        });
      });
      const rows = (result.data as any[]).filter((r: any) => r.name?.trim());
      if (rows.length === 0) { toast.error("Tidak ada data valid di file CSV"); return; }
      const results = await Promise.allSettled(
        rows.map((r: any) =>
          apiFetch(`/api/admin/bookings/${bookingId}/pilgrims`, {
            method: "POST",
            body: JSON.stringify({
              name:           r.name?.trim(),
              phone:          r.phone?.trim()          || null,
              gender:         r.gender?.trim()         || null,
              email:          r.email?.trim()          || null,
              nik:            r.nik?.trim()            || null,
              birthDate:      r.birthDate?.trim()      || r.birth_date?.trim() || null,
              nationality:    r.nationality?.trim()    || null,
              passportNumber: r.passportNumber?.trim() || r.passport_number?.trim() || null,
              passportExpiry: r.passportExpiry?.trim() || r.passport_expiry?.trim() || null,
            }),
          })
        )
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;
      toast.success(`${ok} jemaah berhasil diimport${fail ? `, ${fail} gagal` : ""}`);
      fetchDetails();
      onBookingChange?.();
    } catch {
      toast.error("Gagal membaca file CSV");
    } finally {
      setImportingCsv(false);
    }
  };

  // ── Pilgrim updated inline ─────────────────────────────────────────────────
  const handlePilgrimUpdated = (updated: FullPilgrim) => {
    setPilgrims((prev) => prev.map((p) => p.id === updated.id ? updated : p));
  };

  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  const picTypeLabel: Record<string, string> = {
    cabang: "Cabang", agen: "Agen", karyawan: "Karyawan", pusat: "Kantor Pusat",
  };
  const totalCommission = commissionRate * pilgrims.length;
  const isPusat = !picType || picType === "pusat";
  const totalRoomPrice = rooms.reduce((s, r) => s + r.subtotal, 0);

  // Payment status label
  const payStatusLabel: Record<string, { label: string; cls: string }> = {
    paid:    { label: "✓ Lunas",   cls: "text-green-600 bg-green-50 border-green-200" },
    partial: { label: "DP / Cicil", cls: "text-amber-600 bg-amber-50 border-amber-200" },
    unpaid:  { label: "Belum Bayar", cls: "text-red-600 bg-red-50 border-red-200" },
  };

  return (
    <div className="p-4 space-y-4">
      {/* ── Top actions bar — hidden in standalone (page) mode ────────────── */}
      {!standalone && (<div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Cabang:</span>
          <Select value={selectedBranchId} onValueChange={handleBranchChange} disabled={savingBranch}>
            <SelectTrigger className="w-[180px] h-8 text-sm">
              <SelectValue placeholder="Pilih Cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Tanpa Cabang —</SelectItem>
              {branches.map((br) => (
                <SelectItem key={br.id} value={br.id}>{br.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Tombol ubah status */}
          {currentStatus && VALID_TRANSITIONS[currentStatus]?.length > 0 && (
            VALID_TRANSITIONS[currentStatus].length === 1 ? (
              <Button
                size="sm"
                variant={VALID_TRANSITIONS[currentStatus][0].variant}
                onClick={() => handleStatusChange(VALID_TRANSITIONS[currentStatus][0].status)}
                disabled={changingStatus}
                className={VALID_TRANSITIONS[currentStatus][0].variant === "default" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              >
                {changingStatus
                  ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  : VALID_TRANSITIONS[currentStatus][0].icon}
                <span className="ml-1.5">{VALID_TRANSITIONS[currentStatus][0].label}</span>
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" disabled={changingStatus}>
                    {changingStatus
                      ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                    Ubah Status
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {VALID_TRANSITIONS[currentStatus].map((t) => (
                    <DropdownMenuItem
                      key={t.status}
                      onClick={() => handleStatusChange(t.status)}
                      className={t.variant === "destructive" ? "text-destructive focus:text-destructive" : ""}
                    >
                      {t.icon}
                      <span className="ml-2">{t.label}</span>
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
            {printingInvoice
              ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              : <FileDown className="w-3.5 h-3.5 mr-1.5" />}
            Cetak Invoice
          </Button>
          {departureId && (
            <Button size="sm" variant="outline" onClick={() => navigate(`/admin/manifest?departureId=${departureId}`)}>
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Lihat Manifest
            </Button>
          )}
        </div>
      </div>)}

      {/* ── Pemesan info ─────────────────────────────────────────────────────── */}
      {(pemesanName || isGroupBooking) && (
        <div className="p-3 border border-primary/20 bg-primary/5 rounded-lg">
          <h4 className="font-semibold flex items-center gap-2 text-sm mb-2 text-primary">
            <UsersRound className="w-4 h-4" />
            {isGroupBooking ? "Booking Grup" : "Info Pemesan"}
          </h4>
          <div className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
            {(pemesanName || groupPicName) && (
              <>
                <span className="text-muted-foreground">Nama Pemesan</span>
                <span className="font-medium">{pemesanName || groupPicName}</span>
              </>
            )}
            {(pemesanPhone || groupPicPhone) && (
              <>
                <span className="text-muted-foreground flex items-center gap-1">
                  <PhoneCall className="w-3 h-3" /> HP
                </span>
                <span className="font-medium">{pemesanPhone || groupPicPhone}</span>
              </>
            )}
            {groupName && (
              <>
                <span className="text-muted-foreground">Nama Rombongan</span>
                <span className="font-medium">{groupName}</span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* ── Commission Info ───────────────────────────────────────────────── */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-primary" /> Info Komisi
          </h4>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">PIC</span>
              <span className="font-medium">
                {isPusat ? "Kantor Pusat" : `${picTypeLabel[picType!] || picType} - ${picName}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paket</span>
              <span className="font-medium">{packageTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Jumlah Jemaah</span>
              <span className="font-medium">{pilgrims.length} orang</span>
            </div>
            {isPusat ? (
              <div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground text-center">
                Tidak ada komisi (Kantor Pusat)
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Komisi/Jemaah</span>
                  <span className="font-medium">Rp {commissionRate.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border mt-2">
                  <span className="font-semibold">TOTAL KOMISI</span>
                  <span className="font-bold text-primary">Rp {totalCommission.toLocaleString("id-ID")}</span>
                </div>
                {/* Status pembayaran komisi */}
                <div className="flex justify-between items-center pt-1">
                  <span className="text-muted-foreground text-xs">Status Komisi</span>
                  {agentCommission ? (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      agentCommission.status === "paid"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : agentCommission.status === "approved"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {agentCommission.status === "paid" ? "✓ Sudah Dibayar"
                        : agentCommission.status === "approved" ? "Disetujui"
                        : "Belum Dibayar"}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Belum dicatat</span>
                  )}
                </div>
                {agentCommission && agentCommission.status !== "paid" && (
                  <p className="text-xs text-amber-600 mt-1">
                    Komisi sebesar Rp {(agentCommission.amount || totalCommission).toLocaleString("id-ID")} belum dibayarkan ke agen.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Daftar Jemaah ─────────────────────────────────────────────────── */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          {/* hidden CSV input */}
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />

          <div className="flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-primary" /> Daftar Jemaah ({pilgrims.length})
            </h4>
            <div className="flex gap-1.5">
              <Button
                size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                onClick={() => csvInputRef.current?.click()}
                disabled={importingCsv}
                title="Import jemaah dari CSV"
              >
                {importingCsv
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Upload className="w-3 h-3" />}
                CSV
              </Button>
              <Button
                size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                onClick={() => { setShowAddJamaah(!showAddJamaah); setNewJamaah(emptyNewJamaah()); setJamaahSearch(""); }}
              >
                <Plus className="w-3 h-3" /> Tambah
              </Button>
            </div>
          </div>

          {/* ── Form tambah jamaah lengkap ─────────────────────────────────── */}
          {showAddJamaah && (
            <div className="border border-primary/30 rounded-lg p-3 space-y-2 bg-background">
              <p className="text-xs font-semibold text-primary">Jamaah Baru</p>
              <div className="space-y-2">
                {/* Row 1: nama + gender */}
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    value={newJamaah.name}
                    onChange={(e) => setNewJamaah((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Nama lengkap *"
                    className="h-7 text-xs col-span-2"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    value={newJamaah.phone}
                    onChange={(e) => setNewJamaah((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="No. HP"
                    className="h-7 text-xs"
                    type="tel"
                  />
                  <Select value={newJamaah.gender} onValueChange={(v) => setNewJamaah((p) => ({ ...p, gender: v }))}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Kelamin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Laki-laki</SelectItem>
                      <SelectItem value="female">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Row 2: NIK + tgl lahir */}
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    value={newJamaah.nik}
                    onChange={(e) => setNewJamaah((p) => ({ ...p, nik: e.target.value }))}
                    placeholder="NIK (16 digit)"
                    className="h-7 text-xs"
                    maxLength={16}
                  />
                  <Input
                    value={newJamaah.birthDate}
                    onChange={(e) => setNewJamaah((p) => ({ ...p, birthDate: e.target.value }))}
                    placeholder="Tgl Lahir"
                    className="h-7 text-xs"
                    type="date"
                  />
                </div>
                {/* Row 3: passport + expiry */}
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    value={newJamaah.passportNumber}
                    onChange={(e) => setNewJamaah((p) => ({ ...p, passportNumber: e.target.value }))}
                    placeholder="No. Paspor"
                    className="h-7 text-xs"
                  />
                  <Input
                    value={newJamaah.passportExpiry}
                    onChange={(e) => setNewJamaah((p) => ({ ...p, passportExpiry: e.target.value }))}
                    placeholder="Berlaku s/d"
                    className="h-7 text-xs"
                    type="date"
                  />
                </div>
                {/* Row 4: email + nationality */}
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    value={newJamaah.email}
                    onChange={(e) => setNewJamaah((p) => ({ ...p, email: e.target.value }))}
                    placeholder="Email"
                    className="h-7 text-xs"
                    type="email"
                  />
                  <Input
                    value={newJamaah.nationality}
                    onChange={(e) => setNewJamaah((p) => ({ ...p, nationality: e.target.value }))}
                    placeholder="Kewarganegaraan"
                    className="h-7 text-xs"
                  />
                </div>
                <div className="flex gap-1.5 justify-end">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAddJamaah(false)} disabled={savingJamaah}>
                    <X className="w-3 h-3" /> Batal
                  </Button>
                  <Button size="sm" className="h-7 text-xs gap-1 gradient-gold text-primary" onClick={handleAddJamaah} disabled={savingJamaah || !newJamaah.name.trim()}>
                    {savingJamaah ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Simpan
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Search / filter jamaah ──────────────────────────────────────── */}
          {pilgrims.length > 3 && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                value={jamaahSearch}
                onChange={(e) => setJamaahSearch(e.target.value)}
                placeholder="Cari nama / NIK..."
                className="h-7 text-xs pl-6"
              />
              {jamaahSearch && (
                <button
                  onClick={() => setJamaahSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* ── Completeness summary ────────────────────────────────────────── */}
          {pilgrims.length > 0 && (() => {
            const incomplete = pilgrims.filter((p) => getPilgrimCompleteness(p) !== "complete");
            if (incomplete.length === 0) return null;
            return (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{incomplete.length} jemaah belum lengkap datanya — klik nama untuk melengkapi</span>
              </div>
            );
          })()}

          {pilgrims.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada data jemaah</p>
          ) : (() => {
            const keyword = jamaahSearch.toLowerCase().trim();
            const filtered = keyword
              ? pilgrims.filter((p) =>
                  p.name.toLowerCase().includes(keyword) ||
                  (p.nik ?? "").toLowerCase().includes(keyword)
                )
              : pilgrims;
            if (filtered.length === 0) {
              return <p className="text-xs text-muted-foreground text-center py-2">Tidak ditemukan</p>;
            }
            return (
              <ul className="text-sm space-y-1.5">
                {filtered.map((p, i) => {
                  const comp = getPilgrimCompleteness(p);
                  const compCfg = COMPLETENESS_CFG[comp];
                  return (
                    <li key={p.id} className="flex items-center gap-2 group">
                      <UserCheck className="w-3 h-3 text-muted-foreground shrink-0" />
                      <button
                        onClick={() => setSelectedPilgrim(p)}
                        className="text-left font-medium hover:text-primary hover:underline transition-colors flex items-center gap-1 flex-1 min-w-0"
                        title="Klik untuk lihat/edit detail jemaah"
                      >
                        <span className="truncate">{i + 1}. {p.name}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-50 shrink-0" />
                      </button>
                      {/* Completeness indicator */}
                      <span
                        className={`text-[10px] shrink-0 font-medium ${compCfg.cls}`}
                        title={compCfg.title}
                      >
                        {comp === "complete" ? "✓" : comp === "partial" ? "~" : "!"}
                      </span>
                      {p.gender && (
                        <span className="text-muted-foreground text-xs shrink-0">
                          {p.gender === "L" || p.gender?.toLowerCase() === "male" || p.gender === "Laki-laki" ? "L" : "P"}
                        </span>
                      )}
                      {p.notes && (
                        <span
                          className="text-amber-500 shrink-0"
                          title={`Catatan: ${p.notes}`}
                        >
                          <FileText className="w-3 h-3" />
                        </span>
                      )}
                      <button
                        onClick={() => handleRemoveJamaah(p.id, p.name)}
                        disabled={removingId === p.id}
                        className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                        title="Hapus jamaah ini"
                      >
                        {removingId === p.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Trash2 className="w-3 h-3" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
        </div>

        {/* ── Equipment assignment ──────────────────────────────────────────── */}
        {bookingId && pilgrims.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4">
            <PilgrimEquipmentPanel
              bookingId={bookingId}
              pilgrims={pilgrims.map((p) => ({ id: p.id, name: p.name }))}
            />
          </div>
        )}
      </div>

      {/* ── BKG-F03: Catatan / Notes ──────────────────────────────────────────── */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-primary" /> Catatan
          </h4>
          {!editingNotes ? (
            <Button
              size="sm" variant="ghost" className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setEditingNotes(true)}
            >
              <Pencil className="w-3 h-3" /> Edit
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingNotes(false)} disabled={savingNotes}>
                <X className="w-3 h-3" />
              </Button>
              <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSaveNotes} disabled={savingNotes}>
                {savingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Simpan
              </Button>
            </div>
          )}
        </div>
        {editingNotes ? (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tulis catatan internal untuk booking ini…"
            rows={3}
            className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        ) : (
          <p className={`text-sm ${notes ? "text-foreground" : "text-muted-foreground italic"}`}>
            {notes || "Tidak ada catatan"}
          </p>
        )}
      </div>

      {/* ── BKG-F02: Rincian Kamar & Total Harga ─────────────────────────────── */}
      {rooms.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <Bed className="w-4 h-4 text-primary" /> Rincian Kamar &amp; Harga
          </h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs border-b border-border">
                <th className="text-left pb-1.5 font-medium">Tipe Kamar</th>
                <th className="text-right pb-1.5 font-medium">Qty</th>
                <th className="text-right pb-1.5 font-medium">Harga/Kamar</th>
                <th className="text-right pb-1.5 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id} className="border-b border-border/40 last:border-0">
                  <td className="py-1.5">{ROOM_LABELS[r.roomType] ?? r.roomType}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.quantity}</td>
                  <td className="py-1.5 text-right tabular-nums">Rp {r.price.toLocaleString("id-ID")}</td>
                  <td className="py-1.5 text-right font-medium tabular-nums">Rp {r.subtotal.toLocaleString("id-ID")}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-2.5 text-sm font-semibold">TOTAL HARGA BOOKING</td>
                <td className="pt-2.5 text-right font-bold text-primary tabular-nums">
                  Rp {totalRoomPrice.toLocaleString("id-ID")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── BKG-F01: Panel Pembayaran ─────────────────────────────────────────── */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4 text-primary" /> Pembayaran
              {paymentSummary?.paymentStatus && (
                <span className={`text-xs px-2 py-0.5 rounded-full border font-normal ${payStatusLabel[paymentSummary.paymentStatus]?.cls ?? ""}`}>
                  {payStatusLabel[paymentSummary.paymentStatus]?.label ?? paymentSummary.paymentStatus}
                </span>
              )}
            </h4>
            <Button
              size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
              onClick={() => { setShowAddPayment(!showAddPayment); setNewPayment(emptyNewPayment()); }}
            >
              <Plus className="w-3 h-3" /> Tambah Pembayaran
            </Button>
          </div>

          {paymentSummary ? (<>
          {/* Ringkasan */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 bg-background rounded-lg text-center border border-border/60">
              <p className="text-xs text-muted-foreground mb-0.5">Total Harga</p>
              <p className="font-semibold text-sm tabular-nums">Rp {paymentSummary.totalPrice.toLocaleString("id-ID")}</p>
            </div>
            <div className="p-2.5 bg-background rounded-lg text-center border border-green-200 bg-green-50/50">
              <p className="text-xs text-muted-foreground mb-0.5">Sudah Dibayar</p>
              <p className="font-semibold text-sm text-green-600 tabular-nums">Rp {paymentSummary.totalPaid.toLocaleString("id-ID")}</p>
            </div>
            <div className={`p-2.5 rounded-lg text-center border ${paymentSummary.remaining > 0 ? "border-amber-200 bg-amber-50/50" : "border-green-200 bg-green-50/50"}`}>
              <p className="text-xs text-muted-foreground mb-0.5">Sisa Tagihan</p>
              <p className={`font-semibold text-sm tabular-nums ${paymentSummary.remaining > 0 ? "text-amber-600" : "text-green-600"}`}>
                {paymentSummary.remaining > 0
                  ? `Rp ${paymentSummary.remaining.toLocaleString("id-ID")}`
                  : "✓ Lunas"}
              </p>
            </div>
          </div>

          {/* Form tambah pembayaran */}
          {showAddPayment && (
            <div className="border border-primary/30 rounded-lg p-3 space-y-2 bg-background">
              <p className="text-xs font-semibold text-primary">Catat Pembayaran Manual</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Jenis</Label>
                  <Select value={newPayment.type} onValueChange={(v) => setNewPayment((p) => ({ ...p, type: v }))}>
                    <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_TYPE_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Jumlah (Rp) *</Label>
                  <Input
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment((p) => ({ ...p, amount: e.target.value }))}
                    placeholder="0"
                    className="h-7 text-xs mt-0.5"
                    type="number"
                    min="0"
                  />
                </div>
                <div>
                  <Label className="text-xs">Tanggal Bayar *</Label>
                  <Input
                    value={newPayment.paidAt}
                    onChange={(e) => setNewPayment((p) => ({ ...p, paidAt: e.target.value }))}
                    className="h-7 text-xs mt-0.5"
                    type="date"
                  />
                </div>
                <div>
                  <Label className="text-xs">Metode</Label>
                  <Input
                    value={newPayment.method}
                    onChange={(e) => setNewPayment((p) => ({ ...p, method: e.target.value }))}
                    placeholder="Transfer, Tunai…"
                    className="h-7 text-xs mt-0.5"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Catatan</Label>
                <Input
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Opsional"
                  className="h-7 text-xs mt-0.5"
                />
              </div>
              {/* Bukti Pembayaran */}
              <div>
                <Label className="text-xs">Bukti Pembayaran</Label>
                <div className="flex items-center gap-2 mt-0.5">
                  <input
                    ref={proofInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={handleProofUpload}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => proofInputRef.current?.click()}
                    disabled={uploadingProof || savingPayment}
                  >
                    {uploadingProof
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Upload className="w-3 h-3" />}
                    {uploadingProof ? "Mengupload…" : "Upload Bukti"}
                  </Button>
                  {newPayment.proofUrl && (
                    <a
                      href={(import.meta.env.BASE_URL ?? "").replace(/\/$/, "") + newPayment.proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary underline truncate max-w-[140px]"
                    >
                      Lihat bukti ↗
                    </a>
                  )}
                  {!newPayment.proofUrl && (
                    <span className="text-xs text-muted-foreground">JPG/PNG/PDF, maks 15MB</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 justify-end pt-1">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAddPayment(false)} disabled={savingPayment}>
                  <X className="w-3 h-3" /> Batal
                </Button>
                <Button size="sm" className="h-7 text-xs gap-1 gradient-gold text-primary" onClick={handleAddPayment} disabled={savingPayment}>
                  {savingPayment ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Simpan
                </Button>
              </div>
            </div>
          )}

          {/* Tombol Refund */}
          <div className="flex justify-end">
            <Button
              size="sm" variant="outline"
              className="h-7 gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setShowRefundModal(true)}
            >
              <RotateCcw className="w-3 h-3" /> Ajukan Refund
            </Button>
          </div>

          {/* Histori pembayaran */}
          {paymentSummary.payments.filter((p) => !p.isVoided).length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada pembayaran tercatat</p>
          ) : (
            <div className="space-y-0 divide-y divide-border/40">
              {paymentSummary.payments
                .filter((p) => !p.isVoided)
                .map((p) => (
                  <div key={p.id} className="flex items-start justify-between py-2 text-sm group">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <span className="font-medium">
                        {PAYMENT_TYPE_LABELS[p.type] ?? p.type}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {p.method && <span>{p.method}</span>}
                        {p.referenceNumber && <span>#{p.referenceNumber}</span>}
                        {p.notes && <span className="italic">{p.notes}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4 flex items-center gap-2">
                      <div>
                        <p className="font-semibold tabular-nums">Rp {p.amount.toLocaleString("id-ID")}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(p.paidAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleVoidPayment(p.id, p.amount)}
                        disabled={voidingPaymentId === p.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                        title="Void / batalkan pembayaran ini"
                      >
                        {voidingPaymentId === p.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Ban className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
          </>) : (
            <p className="text-sm text-muted-foreground py-2">
              {paymentFetchError
                ? "Gagal memuat data pembayaran."
                : "Memuat data pembayaran…"}
            </p>
          )}
      </div>

      {/* ── Feature 5: Jadwal Cicilan ─────────────────────────────────────── */}
      {installments.length > 0 && (() => {
        const INSTL_STATUS: Record<string, { label: string; cls: string }> = {
          paid:      { label: "Lunas",    cls: "text-green-600 bg-green-50 border-green-200" },
          overdue:   { label: "Terlambat",cls: "text-red-600   bg-red-50   border-red-200"   },
          pending:   { label: "Menunggu", cls: "text-amber-600 bg-amber-50 border-amber-200" },
          cancelled: { label: "Batal",    cls: "text-gray-400  bg-gray-50  border-gray-200"  },
        };
        return (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold flex items-center gap-2 text-sm">
              <CalendarDays className="w-4 h-4 text-primary" /> Jadwal Cicilan ({installments.length})
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left pb-1.5 font-medium">Cicilan</th>
                    <th className="text-left pb-1.5 font-medium">Jatuh Tempo</th>
                    <th className="text-right pb-1.5 font-medium">Jumlah</th>
                    <th className="text-center pb-1.5 font-medium">Status</th>
                    <th className="text-left pb-1.5 font-medium">Dibayar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {installments.map((ins) => {
                    const cfg = INSTL_STATUS[ins.status] ?? INSTL_STATUS.pending;
                    return (
                      <tr key={ins.id}>
                        <td className="py-1.5 font-medium">#{ins.installmentNumber}</td>
                        <td className="py-1.5 text-muted-foreground">
                          {new Date(ins.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="py-1.5 text-right tabular-nums font-medium">
                          Rp {ins.amount.toLocaleString("id-ID")}
                        </td>
                        <td className="py-1.5 text-center">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium ${cfg.cls}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-1.5 text-muted-foreground">
                          {ins.paidAt
                            ? new Date(ins.paidAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ── Feature 6: Dokumen Jemaah ─────────────────────────────────────── */}
      {pilgrims.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-primary" /> Dokumen Jemaah
          </h4>
          <PilgrimDocumentPanel
            bookingId={bookingId}
            pilgrims={pilgrims.map((p) => ({ id: p.id, name: p.name }))}
          />
        </div>
      )}

      {/* ── Status History ─────────────────────────────────────────────────── */}
      {statusLogs.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-semibold flex items-center gap-2 text-sm mb-3">
            <History className="w-4 h-4 text-primary" /> Riwayat Status ({statusLogs.length})
          </h4>
          <ol className="relative border-l border-border ml-2 space-y-3">
            {statusLogs.map((log) => (
              <li key={log.id} className="ml-4">
                <div className="absolute w-2 h-2 bg-primary rounded-full -left-1 top-1.5 border border-background" />
                <div className="text-xs text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString("id-ID")} · {log.changedBy ?? "system"}
                </div>
                <div className="text-sm mt-0.5">
                  {log.fromStatus ? (
                    <span>
                      <span className="font-mono bg-muted px-1 rounded">{log.fromStatus}</span>
                      {" → "}
                      <span className="font-mono bg-muted px-1 rounded font-semibold">{log.toStatus}</span>
                    </span>
                  ) : (
                    <span className="font-mono bg-muted px-1 rounded font-semibold">{log.toStatus}</span>
                  )}
                  {log.notes && <span className="text-muted-foreground ml-2">({log.notes})</span>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── Drawers & Modals ──────────────────────────────────────────────── */}
      <PilgrimDetailDrawer
        pilgrim={selectedPilgrim}
        onClose={() => setSelectedPilgrim(null)}
        onUpdated={handlePilgrimUpdated}
      />

      <DepartureDetailDrawer
        departureId={showDepartureDrawer ? (departureId ?? null) : null}
        packageTitle={packageTitle}
        onClose={() => setShowDepartureDrawer(false)}
      />

      <ChangeRoomModal
        bookingId={bookingId}
        departureId={departureId ?? null}
        currentRooms={rooms}
        open={showChangeRoom}
        onOpenChange={setShowChangeRoom}
        onSuccess={handleBookingChanged}
      />

      <ChangeDepartureModal
        bookingId={bookingId}
        packageId={packageId}
        currentDepartureDate={departureDate ?? null}
        open={showChangeDeparture}
        onOpenChange={setShowChangeDeparture}
        onSuccess={handleBookingChanged}
      />

      {/* ── Feature 8: Refund Modal ───────────────────────────────────────── */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-red-500" /> Ajukan Permintaan Refund
              </h3>
              <button onClick={() => setShowRefundModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs">Alasan Refund *</Label>
                <textarea
                  value={refundForm.reason}
                  onChange={(e) => setRefundForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Jelaskan alasan pembatalan / refund…"
                  rows={3}
                  className="w-full mt-0.5 text-sm rounded-md border border-input bg-background px-3 py-2 resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div>
                <Label className="text-xs">Jumlah Refund (Rp) *</Label>
                <Input
                  value={refundForm.amount}
                  onChange={(e) => setRefundForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  className="h-8 text-sm mt-0.5"
                  type="number"
                  min="0"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Nama Bank</Label>
                  <Input
                    value={refundForm.bankName}
                    onChange={(e) => setRefundForm((f) => ({ ...f, bankName: e.target.value }))}
                    placeholder="BCA, Mandiri…"
                    className="h-8 text-sm mt-0.5"
                  />
                </div>
                <div>
                  <Label className="text-xs">No. Rekening</Label>
                  <Input
                    value={refundForm.bankAccount}
                    onChange={(e) => setRefundForm((f) => ({ ...f, bankAccount: e.target.value }))}
                    placeholder="0123456789"
                    className="h-8 text-sm mt-0.5"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Nama Pemilik Rekening</Label>
                <Input
                  value={refundForm.accountHolder}
                  onChange={(e) => setRefundForm((f) => ({ ...f, accountHolder: e.target.value }))}
                  placeholder="Sesuai buku tabungan"
                  className="h-8 text-sm mt-0.5"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowRefundModal(false)} disabled={savingRefund}>
                Batal
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
                onClick={handleRefundSubmit}
                disabled={savingRefund || !refundForm.reason.trim() || !refundForm.amount}
              >
                {savingRefund ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Kirim Permintaan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── BKG-BUG-05: AlertDialog (menggantikan window.confirm) ────────────── */}
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

export default BookingDetailPanel;
