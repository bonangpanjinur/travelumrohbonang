import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/shared/lib/apiClient";
import {
  Users, UserCheck, DollarSign, FileDown, Building2, UsersRound,
  PhoneCall, History, ExternalLink, Bed, Calendar, Loader2,
  Plus, Trash2, Save, X,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { fetchInvoiceData, generateInvoiceHTML, openInvoicePrintWindow } from "./InvoiceGenerator";
import PilgrimDetailDrawer, { type FullPilgrim } from "./PilgrimDetailDrawer";
import DepartureDetailDrawer from "./DepartureDetailDrawer";
import ChangeRoomModal from "./ChangeRoomModal";
import ChangeDepartureModal from "./ChangeDepartureModal";
import PilgrimEquipmentPanel from "./PilgrimEquipmentPanel";
import { toast } from "sonner";

interface Branch { id: string; name: string; }

interface BookingDetailPanelProps {
  bookingId: string;
  packageId: string | null;
  departureId?: string | null;
  departureDate?: string | null;
  picType: string | null;
  picId: string | null;
  packageTitle: string;
  branchId?: string | null;
  onBranchChange?: () => void;
  onBookingChange?: () => void;
  // Pemesan
  pemesanName?: string | null;
  pemesanPhone?: string | null;
  // Group booking
  isGroupBooking?: boolean;
  groupName?: string | null;
  groupPicName?: string | null;
  groupPicPhone?: string | null;
}

interface Room {
  id: string;
  roomType: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface NewJamaahForm {
  name: string;
  phone: string;
  gender: string;
}

const ROOM_LABELS: Record<string, string> = {
  quad: "Quad", triple: "Triple", double: "Double", single: "Single",
};

const emptyNewJamaah = (): NewJamaahForm => ({ name: "", phone: "", gender: "" });

const BookingDetailPanel = ({
  bookingId, packageId, departureId, departureDate,
  picType, picId, packageTitle, branchId,
  onBranchChange, onBookingChange,
  pemesanName, pemesanPhone,
  isGroupBooking, groupName, groupPicName, groupPicPhone,
}: BookingDetailPanelProps) => {
  const [pilgrims, setPilgrims] = useState<FullPilgrim[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [commissionRate, setCommissionRate] = useState<number>(0);
  const [picName, setPicName] = useState<string>("-");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branchId || "none");
  const [savingBranch, setSavingBranch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [printingInvoice, setPrintingInvoice] = useState(false);
  const [statusLogs, setStatusLogs] = useState<Array<{
    id: string; fromStatus: string | null; toStatus: string;
    changedBy: string | null; notes: string | null; createdAt: string;
  }>>([]);

  // Add jamaah inline form
  const [showAddJamaah, setShowAddJamaah] = useState(false);
  const [newJamaah, setNewJamaah] = useState<NewJamaahForm>(emptyNewJamaah());
  const [savingJamaah, setSavingJamaah] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
      const [detail, logs] = await Promise.allSettled([
        apiFetch<any>(`/api/admin/bookings/${bookingId}`),
        apiFetch<any[]>(`/api/admin/bookings/${bookingId}/status-logs`),
      ]);
      if (detail.status === "fulfilled") {
        const d = detail.value;
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
            nationality: p.nationality ?? null,
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

      if (packageId && picType && picType !== "pusat") {
        apiFetch<any[]>(
          `/rest/v1/package_commissions?package_id=eq.${packageId}&pic_type=eq.${picType}&select=commission_amount&limit=1`
        ).then((rows) => setCommissionRate(Number(rows?.[0]?.commission_amount) || 0))
          .catch(() => {});
      }

      if (picId && picType && picType !== "pusat") {
        const table = picType === "agen" ? "agents" : picType === "cabang" ? "branches" : "profiles";
        apiFetch<any[]>(`/rest/v1/${table}?id=eq.${picId}&select=name&limit=1`)
          .then((rows) => setPicName(rows?.[0]?.name || "-"))
          .catch(() => {});
      }
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

  // ── Tambah jamaah ─────────────────────────────────────────────────────────

  const handleAddJamaah = async () => {
    if (!newJamaah.name.trim()) {
      toast.error("Nama jamaah wajib diisi");
      return;
    }
    setSavingJamaah(true);
    try {
      await apiFetch(`/api/admin/bookings/${bookingId}/pilgrims`, {
        method: "POST",
        body: JSON.stringify({
          name:   newJamaah.name.trim(),
          phone:  newJamaah.phone.trim() || null,
          gender: newJamaah.gender || null,
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

  const handleRemoveJamaah = async (pilgrimId: string, name: string) => {
    if (!confirm(`Hapus jamaah "${name}" dari booking ini?`)) return;
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

  return (
    <div className="p-4 space-y-4">
      {/* ── Top actions bar ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
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
      </div>

      {/* ── Pemesan info — selalu tampilkan ─────────────────────────────────── */}
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
              </>
            )}
          </div>
        </div>

        {/* ── Daftar Jemaah — dengan tambah & hapus ───────────────────────── */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-primary" /> Daftar Jemaah ({pilgrims.length})
            </h4>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-xs"
              onClick={() => { setShowAddJamaah(!showAddJamaah); setNewJamaah(emptyNewJamaah()); }}
            >
              <Plus className="w-3 h-3" /> Tambah
            </Button>
          </div>

          {/* Inline form tambah jamaah */}
          {showAddJamaah && (
            <div className="border border-primary/30 rounded-lg p-3 space-y-2 bg-background">
              <p className="text-xs font-semibold text-primary">Jamaah Baru</p>
              <div className="space-y-2">
                <Input
                  value={newJamaah.name}
                  onChange={(e) => setNewJamaah((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Nama lengkap *"
                  className="h-7 text-xs"
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    value={newJamaah.phone}
                    onChange={(e) => setNewJamaah((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="No. HP"
                    className="h-7 text-xs"
                    type="tel"
                  />
                  <Select
                    value={newJamaah.gender}
                    onValueChange={(v) => setNewJamaah((p) => ({ ...p, gender: v }))}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Kelamin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Laki-laki</SelectItem>
                      <SelectItem value="female">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-1.5 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => setShowAddJamaah(false)}
                    disabled={savingJamaah}
                  >
                    <X className="w-3 h-3" /> Batal
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1 gradient-gold text-primary"
                    onClick={handleAddJamaah}
                    disabled={savingJamaah || !newJamaah.name.trim()}
                  >
                    {savingJamaah
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Save className="w-3 h-3" />}
                    Simpan
                  </Button>
                </div>
              </div>
            </div>
          )}

          {pilgrims.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada data jemaah</p>
          ) : (
            <ul className="text-sm space-y-1.5">
              {pilgrims.map((p, i) => (
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
                  {p.gender && (
                    <span className="text-muted-foreground text-xs shrink-0">
                      {p.gender === "L" || p.gender?.toLowerCase() === "male" || p.gender === "Laki-laki"
                        ? "L" : "P"}
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
              ))}
            </ul>
          )}
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
    </div>
  );
};

export default BookingDetailPanel;
