import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { apiFetch } from "@/shared/lib/apiClient";
import { toast } from "sonner";
import { Loader2, Users, CheckCircle2, ArrowRightLeft } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Departure {
  id: string;
  departureDate: string;
  returnDate: string | null;
  quota: number;
  remainingQuota: number;
  status: string;
  packageTitle?: string | null;
}

interface BulkChangeDepartureModalProps {
  /** ID booking yang dipilih */
  bookingIds: string[];
  /**
   * Jika semua booking berasal dari paket yang sama, isi ini supaya
   * hanya keberangkatan paket tersebut yang ditampilkan.
   * null = booking dari berbagai paket → tampilkan semua keberangkatan.
   */
  packageId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const BulkChangeDepartureModal = ({
  bookingIds,
  packageId,
  open,
  onOpenChange,
  onSuccess,
}: BulkChangeDepartureModalProps) => {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "-";
    try {
      return format(new Date(d), "d MMM yyyy", { locale: localeId });
    } catch {
      return d ?? "-";
    }
  };

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedId("");
    const url = packageId
      ? `/api/admin/packages/${packageId}/departures`
      : `/api/admin/departures`;
    apiFetch<any>(url)
      .then((data) => {
        const list: any[] = Array.isArray(data) ? data : data?.data ?? [];
        setDepartures(
          list.map((d) => ({
            id: d.id,
            departureDate: d.departureDate ?? d.departure_date ?? "",
            returnDate: d.returnDate ?? d.return_date ?? null,
            quota: Number(d.quota) || 0,
            remainingQuota: Number(d.remainingQuota ?? d.remaining_quota) || 0,
            status: d.status ?? "active",
            packageTitle: d.packageTitle ?? d.package?.title ?? null,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, packageId]);

  const handleSave = async () => {
    if (!selectedId) {
      toast.error("Pilih tanggal keberangkatan terlebih dahulu");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch<{ updated: number; departureDate: string }>(
        `/api/admin/bookings/bulk-departure`,
        {
          method: "PATCH",
          body: JSON.stringify({ ids: bookingIds, departureId: selectedId }),
        }
      );
      toast.success(
        `${res.updated} booking berhasil dipindahkan ke keberangkatan ${fmtDate(res.departureDate)}`
      );
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Gagal memindahkan keberangkatan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            Pindah Keberangkatan ({bookingIds.length} Booking)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <p className="text-sm text-muted-foreground">
            Pilih keberangkatan tujuan untuk {bookingIds.length} booking yang dipilih:
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : departures.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Tidak ada jadwal keberangkatan tersedia
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {departures.map((dep) => {
                const isFull = dep.remainingQuota === 0;
                return (
                  <button
                    key={dep.id}
                    onClick={() => !isFull && setSelectedId(dep.id)}
                    disabled={!!isFull}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedId === dep.id
                        ? "border-primary bg-primary/5"
                        : isFull
                        ? "border-border opacity-50 cursor-not-allowed"
                        : "border-border hover:bg-muted/50 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{fmtDate(dep.departureDate)}</p>
                          {selectedId === dep.id && (
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        {dep.packageTitle && !packageId && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {dep.packageTitle}
                          </p>
                        )}
                        {dep.returnDate && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Kembali: {fmtDate(dep.returnDate)}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className={`flex items-center gap-1 text-xs font-semibold ${
                            dep.remainingQuota === 0
                              ? "text-destructive"
                              : dep.remainingQuota <= 5
                              ? "text-amber-600"
                              : "text-green-600"
                          }`}
                        >
                          <Users className="w-3 h-3" />
                          {dep.remainingQuota}/{dep.quota}
                        </div>
                        <Badge
                          variant={dep.status === "active" ? "default" : "secondary"}
                          className="text-[10px] mt-1"
                        >
                          {dep.status}
                        </Badge>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving || !selectedId}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Pindah Keberangkatan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkChangeDepartureModal;
