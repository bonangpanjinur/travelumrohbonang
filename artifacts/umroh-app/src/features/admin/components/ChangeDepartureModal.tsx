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
import { Loader2, Calendar, Users, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Departure {
  id: string;
  departureDate: string;
  returnDate: string | null;
  quota: number;
  remainingQuota: number;
  status: string;
}

interface ChangeDepartureModalProps {
  bookingId: string;
  packageId: string | null;
  currentDepartureDate: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ChangeDepartureModal = ({
  bookingId,
  packageId,
  currentDepartureDate,
  open,
  onOpenChange,
  onSuccess,
}: ChangeDepartureModalProps) => {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "-";
    try {
      return format(new Date(d), "d MMM yyyy", { locale: localeId });
    } catch {
      return d ?? "-";
    }
  };

  useEffect(() => {
    if (!open || !packageId) return;
    setLoading(true);
    setSelectedId("");
    apiFetch<any>(`/api/admin/packages/${packageId}/departures`)
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
      await apiFetch(`/api/admin/bookings/${bookingId}/departure`, {
        method: "PATCH",
        body: JSON.stringify({ departureId: selectedId }),
      });
      toast.success("Tanggal keberangkatan berhasil diubah");
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Gagal mengubah keberangkatan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Ubah Tanggal Keberangkatan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {currentDepartureDate && (
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="text-xs text-muted-foreground">Keberangkatan saat ini</p>
              <p className="font-semibold">{formatDate(currentDepartureDate)}</p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">Pilih tanggal keberangkatan baru:</p>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : departures.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Tidak ada jadwal keberangkatan tersedia
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {departures.map((dep) => {
                const isCurrent =
                  currentDepartureDate && dep.departureDate === currentDepartureDate;
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
                          <p className="font-semibold text-sm">{formatDate(dep.departureDate)}</p>
                          {selectedId === dep.id && (
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          )}
                          {isCurrent && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              Saat ini
                            </Badge>
                          )}
                        </div>
                        {dep.returnDate && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Kembali: {formatDate(dep.returnDate)}
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
            Ubah Keberangkatan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeDepartureModal;
