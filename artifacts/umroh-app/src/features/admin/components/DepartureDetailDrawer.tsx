import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import {
  Calendar, Users, TrendingUp, ExternalLink, Loader2,
  Plane, User, DollarSign, ClipboardList, Activity,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Price { roomType: string; price: number }
interface ManifestSummary { confirmedPilgrims: number; docsComplete: number; docsIncomplete: number }

interface DepartureInfo {
  departureDate: string;
  returnDate?: string | null;
  quota: number;
  remainingQuota: number;
  status: string;
  flightNumber?: string | null;
  muthawifName?: string | null;
  airlineName?: string | null;
  depAirportCode?: string | null;
  depAirportCity?: string | null;
  arrAirportCode?: string | null;
  arrAirportCity?: string | null;
  prices: Price[];
}

interface DepartureDetailDrawerProps {
  departureId: string | null;
  packageTitle?: string;
  onClose: () => void;
}

const ROOM_LABELS: Record<string, string> = { quad: "Quad", triple: "Triple", double: "Double", single: "Single" };
const STATUS_LABELS: Record<string, string> = {
  active: "Aktif", closed: "Ditutup", penuh: "Penuh", draft: "Draft",
};

const DepartureDetailDrawer = ({ departureId, packageTitle, onClose }: DepartureDetailDrawerProps) => {
  const [data, setData] = useState<DepartureInfo | null>(null);
  const [summary, setSummary] = useState<ManifestSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "-";
    try { return format(new Date(d), "d MMMM yyyy", { locale: localeId }); }
    catch { return d; }
  };

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(p);

  useEffect(() => {
    if (!departureId) { setData(null); setSummary(null); return; }
    setLoading(true);

    Promise.allSettled([
      // KB-F05: fetch more detail with joins
      apiFetch<any[]>(
        `/rest/v1/package_departures?id=eq.${departureId}` +
        `&select=departure_date,return_date,quota,remaining_quota,status,flight_number,` +
        `muthawif:muthawifs(name),` +
        `airline:airlines(name,code),` +
        `dep_airport:airports!departure_airport_id(name,code,city),` +
        `arr_airport:airports!arrival_airport_id(name,code,city),` +
        `prices:departure_prices(room_type,price)` +
        `&limit=1`
      ),
      apiFetch<ManifestSummary>(`/api/admin/departures/${departureId}/manifest-summary`),
    ]).then(([depRes, sumRes]) => {
      if (depRes.status === "fulfilled") {
        const dep = depRes.value?.[0];
        if (dep) {
          setData({
            departureDate:  dep.departure_date,
            returnDate:     dep.return_date ?? null,
            quota:          dep.quota,
            remainingQuota: dep.remaining_quota,
            status:         dep.status || "active",
            flightNumber:   dep.flight_number ?? null,
            muthawifName:   dep.muthawif?.name ?? null,
            airlineName:    dep.airline ? `${dep.airline.name}${dep.airline.code ? ` (${dep.airline.code})` : ""}` : null,
            depAirportCode: dep.dep_airport?.code ?? null,
            depAirportCity: dep.dep_airport?.city ?? dep.dep_airport?.name ?? null,
            arrAirportCode: dep.arr_airport?.code ?? null,
            arrAirportCity: dep.arr_airport?.city ?? dep.arr_airport?.name ?? null,
            prices: (dep.prices ?? [])
              .filter((p: any) => p.price > 0)
              .sort((a: any, b: any) => a.price - b.price),
          });
        }
      }
      if (sumRes.status === "fulfilled") setSummary(sumRes.value);
    }).finally(() => setLoading(false));
  }, [departureId]);

  const filledPercent = data
    ? Math.round(((data.quota - data.remainingQuota) / data.quota) * 100)
    : 0;

  return (
    <Dialog open={!!departureId} onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
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

            {/* Tanggal */}
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

            {/* Quota */}
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-3.5 h-3.5" /> Kapasitas
                </span>
                <span className="font-semibold">{data.quota} orang</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sisa Kursi</span>
                <span className={`font-bold ${
                  data.remainingQuota === 0 ? "text-destructive"
                  : data.remainingQuota <= 5 ? "text-amber-600"
                  : "text-green-600"
                }`}>
                  {data.remainingQuota} tersedia
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${filledPercent}%` }} />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {data.quota - data.remainingQuota} dari {data.quota} kursi terisi ({filledPercent}%)
              </p>
            </div>

            {/* Manifest summary (KB-F05) */}
            {summary && (
              <div className="p-3 border border-border/60 rounded-lg space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <ClipboardList className="w-3 h-3" /> Manifest
                </p>
                <div className="grid grid-cols-3 gap-1 text-center text-xs">
                  <div>
                    <p className="font-semibold">{summary.confirmedPilgrims}</p>
                    <p className="text-muted-foreground text-[10px]">Terdaftar</p>
                  </div>
                  <div>
                    <p className="font-semibold text-green-600">{summary.docsComplete}</p>
                    <p className="text-muted-foreground text-[10px]">Dok ✓</p>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-600">{summary.docsIncomplete}</p>
                    <p className="text-muted-foreground text-[10px]">Belum Lengkap</p>
                  </div>
                </div>
              </div>
            )}

            {/* Muthawif (KB-F05) */}
            {data.muthawifName && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Muthawif:</span>
                <span className="font-medium">{data.muthawifName}</span>
              </div>
            )}

            {/* Info Penerbangan (KB-F05) */}
            {(data.airlineName || data.flightNumber || data.depAirportCity) && (
              <div className="p-3 border border-border/60 rounded-lg space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Plane className="w-3 h-3" /> Info Penerbangan
                </p>
                <div className="text-xs space-y-1">
                  {data.airlineName && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-24 shrink-0">Maskapai</span>
                      <span className="font-medium">{data.airlineName}</span>
                    </div>
                  )}
                  {data.flightNumber && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-24 shrink-0">No. Penerbangan</span>
                      <span className="font-medium font-mono">{data.flightNumber}</span>
                    </div>
                  )}
                  {data.depAirportCity && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-24 shrink-0">Dari</span>
                      <span className="font-medium">
                        {data.depAirportCode ? `${data.depAirportCode} — ` : ""}{data.depAirportCity}
                      </span>
                    </div>
                  )}
                  {data.arrAirportCity && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-24 shrink-0">Ke</span>
                      <span className="font-medium">
                        {data.arrAirportCode ? `${data.arrAirportCode} — ` : ""}{data.arrAirportCity}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Harga per kamar (KB-F05) */}
            {data.prices.length > 0 && (
              <div className="p-3 border border-border/60 rounded-lg space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Harga per Kamar
                </p>
                <div className="space-y-1">
                  {data.prices.map((p) => (
                    <div key={p.roomType} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{ROOM_LABELS[p.roomType] ?? p.roomType}</span>
                      <span className="font-medium">{formatPrice(p.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status:</span>
              <Badge variant={data.status === "active" ? "default" : "secondary"}>
                {STATUS_LABELS[data.status] ?? data.status}
              </Badge>
            </div>

            {/* Quick links (KB-F05) */}
            {departureId && (
              <div className="flex flex-wrap gap-2 pt-1 border-t border-border/60">
                <button
                  onClick={() => { navigate(`/admin/manifest?departureId=${departureId}`); onClose(); }}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ClipboardList className="w-3 h-3" /> Manifest
                </button>
                <button
                  onClick={() => { navigate(`/admin/departure-readiness?departureId=${departureId}`); onClose(); }}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Activity className="w-3 h-3" /> Kesiapan
                </button>
                <a
                  href="/admin/departures"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Kelola Keberangkatan
                </a>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Data tidak tersedia</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DepartureDetailDrawer;
