import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Users, UserCheck, DollarSign, FileDown, Building2, UsersRound, PhoneCall, History } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { fetchInvoiceData, generateInvoiceHTML, openInvoicePrintWindow } from "./InvoiceGenerator";
import PilgrimEquipmentPanel from "./PilgrimEquipmentPanel";
import { toast } from "sonner";

interface Branch {
  id: string;
  name: string;
}

interface BookingDetailPanelProps {
  bookingId: string;
  packageId: string | null;
  picType: string | null;
  picId: string | null;
  packageTitle: string;
  branchId?: string | null;
  onBranchChange?: () => void;
  // Group booking
  isGroupBooking?: boolean;
  groupName?: string | null;
  groupPicName?: string | null;
  groupPicPhone?: string | null;
}

interface Pilgrim {
  id: string;
  name: string;
  gender: string | null;
}

const BookingDetailPanel = ({ bookingId, packageId, picType, picId, packageTitle, branchId, onBranchChange, isGroupBooking, groupName, groupPicName, groupPicPhone }: BookingDetailPanelProps) => {
  const [pilgrims, setPilgrims] = useState<Pilgrim[]>([]);
  const [commissionRate, setCommissionRate] = useState<number>(0);
  const [picName, setPicName] = useState<string>("-");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branchId || "none");
  const [savingBranch, setSavingBranch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusLogs, setStatusLogs] = useState<Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    changedBy: string | null;
    notes: string | null;
    createdAt: string;
  }>>([]);

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

  useEffect(() => {
    let active = true;
    const fetchDetails = async () => {
      setLoading(true);
      try {
        // Booking detail includes pilgrims
        const [detail, logs] = await Promise.allSettled([
          apiFetch<any>(`/api/admin/bookings/${bookingId}`),
          apiFetch<any[]>(`/api/admin/bookings/${bookingId}/status-logs`),
        ]);
        if (!active) return;
        if (detail.status === "fulfilled") setPilgrims(detail.value.pilgrims || []);
        if (logs.status === "fulfilled") setStatusLogs(logs.value || []);

        // Commission rate via REST shim
        if (packageId && picType && picType !== "pusat") {
          apiFetch<any[]>(
            `/rest/v1/package_commissions?package_id=eq.${packageId}&pic_type=eq.${picType}&select=commission_amount&limit=1`
          ).then((rows) => {
            if (active) setCommissionRate(Number(rows?.[0]?.commission_amount) || 0);
          }).catch(() => {/* commission optional */});
        }

        // PIC name via REST shim
        if (picId && picType && picType !== "pusat") {
          const table = picType === "agen" ? "agents" : picType === "cabang" ? "branches" : "profiles";
          apiFetch<any[]>(`/rest/v1/${table}?id=eq.${picId}&select=name&limit=1`)
            .then((rows) => { if (active) setPicName(rows?.[0]?.name || "-"); })
            .catch(() => {/* name optional */});
        }
      } catch (e) {
        console.error("[BookingDetailPanel] fetch error", e);
        if (active) toast.error("Gagal memuat detail booking");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchDetails();
    return () => { active = false; };
  }, [bookingId, packageId, picType, picId]);

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  const picTypeLabel: Record<string, string> = {
    cabang: "Cabang",
    agen: "Agen",
    karyawan: "Karyawan",
    pusat: "Kantor Pusat",
  };

  const totalCommission = commissionRate * pilgrims.length;
  const isPusat = !picType || picType === "pusat";

  const handleDownloadInvoice = async () => {
    const data = await fetchInvoiceData(bookingId);
    if (!data) {
      toast.error("Gagal mengambil data invoice");
      return;
    }
    const html = generateInvoiceHTML(data);
    openInvoicePrintWindow(html);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Cabang:</span>
          <Select value={selectedBranchId} onValueChange={handleBranchChange} disabled={savingBranch}>
            <SelectTrigger className="w-[200px] h-8 text-sm">
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
        <Button size="sm" variant="outline" onClick={handleDownloadInvoice}>
          <FileDown className="w-4 h-4 mr-2" /> Cetak Invoice
        </Button>
      </div>
      {/* Group Booking Info */}
      {isGroupBooking && (
        <div className="p-3 border border-gold/30 bg-gold/5 rounded-lg">
          <h4 className="font-semibold flex items-center gap-2 text-sm mb-2 text-gold">
            <UsersRound className="w-4 h-4" /> Booking Grup
          </h4>
          <div className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
            {groupName && (
              <>
                <span className="text-muted-foreground">Nama Rombongan</span>
                <span className="font-medium">{groupName}</span>
              </>
            )}
            {groupPicName && (
              <>
                <span className="text-muted-foreground">Koordinator</span>
                <span className="font-medium">{groupPicName}</span>
              </>
            )}
            {groupPicPhone && (
              <>
                <span className="text-muted-foreground flex items-center gap-1">
                  <PhoneCall className="w-3 h-3" /> HP Koordinator
                </span>
                <span className="font-medium">{groupPicPhone}</span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
      {/* Commission Info */}
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

      {/* Pilgrim List */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <h4 className="font-semibold flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-primary" /> Daftar Jemaah ({pilgrims.length})
        </h4>
        {pilgrims.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada data jemaah</p>
        ) : (
          <ul className="text-sm space-y-1">
            {pilgrims.map((p, i) => (
              <li key={p.id} className="flex items-center gap-2">
                <UserCheck className="w-3 h-3 text-muted-foreground" />
                <span>{i + 1}. {p.name}</span>
                {p.gender && <span className="text-muted-foreground text-xs">- {p.gender === "L" || p.gender === "Laki-laki" ? "Laki-laki" : "Perempuan"}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Equipment assignment — PL-F01 */}
      {bookingId && pilgrims.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4">
          <PilgrimEquipmentPanel
            bookingId={bookingId}
            pilgrims={pilgrims.map((p) => ({ id: p.id, name: p.name }))}
          />
        </div>
      )}
      </div>

      {/* BK-03: Riwayat Perubahan Status */}
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
    </div>
  );
};

export default BookingDetailPanel;
