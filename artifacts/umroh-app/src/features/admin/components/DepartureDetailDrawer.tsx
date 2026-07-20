import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Calendar, Users, TrendingUp, ExternalLink, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface DepartureInfo {
  departureDate: string;
  returnDate?: string | null;
  quota: number;
  remainingQuota: number;
  status: string;
}

interface DepartureDetailDrawerProps {
  departureId: string | null;
  packageTitle?: string;
  onClose: () => void;
}

const DepartureDetailDrawer = ({ departureId, packageTitle, onClose }: DepartureDetailDrawerProps) => {
  const [data, setData] = useState<DepartureInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "-";
    try {
      return format(new Date(d), "d MMMM yyyy", { locale: localeId });
    } catch {
      return d;
    }
  };

  useEffect(() => {
    if (!departureId) {
      setData(null);
      return;
    }
    setLoading(true);
    apiFetch<any[]>(
      `/rest/v1/package_departures?id=eq.${departureId}&select=departure_date,return_date,quota,remaining_quota,status&limit=1`
    )
      .then((rows) => {
        const dep = rows?.[0];
        if (!dep) return;
        setData({
          departureDate: dep.departure_date,
          returnDate: dep.return_date ?? null,
          quota: dep.quota,
          remainingQuota: dep.remaining_quota,
          status: dep.status || "active",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [departureId]);

  const filledPercent = data
    ? Math.round(((data.quota - data.remainingQuota) / data.quota) * 100)
    : 0;

  return (
    <Dialog open={!!departureId} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Detail Keberangkatan
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            {packageTitle && (
              <p className="font-semibold text-base">{packageTitle}</p>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Tanggal Berangkat</p>
                <p className="font-semibold">{formatDate(data.departureDate)}</p>
              </div>
              {data.returnDate && (
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Tanggal Kembali</p>
                  <p className="font-semibold">{formatDate(data.returnDate)}</p>
                </div>
              )}
            </div>

            {/* Quota indicator */}
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-3.5 h-3.5" /> Kapasitas
                </span>
                <span className="font-semibold">{data.quota} orang</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sisa Kursi</span>
                <span
                  className={`font-bold ${
                    data.remainingQuota === 0
                      ? "text-destructive"
                      : data.remainingQuota <= 5
                      ? "text-amber-600"
                      : "text-green-600"
                  }`}
                >
                  {data.remainingQuota} tersedia
                </span>
              </div>
              {/* progress bar */}
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${filledPercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {data.quota - data.remainingQuota} dari {data.quota} kursi terisi ({filledPercent}%)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status:</span>
              <Badge variant={data.status === "active" ? "default" : "secondary"}>
                {data.status}
              </Badge>
            </div>

            <a
              href="/admin/departures"
              className="inline-flex items-center gap-1 text-xs text-primary underline"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="w-3 h-3" /> Kelola semua keberangkatan
            </a>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Data tidak tersedia</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DepartureDetailDrawer;
