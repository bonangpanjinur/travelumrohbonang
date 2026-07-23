import { useState, useEffect, useCallback } from "react";
import { FileCheck, Users, CheckCircle2, Clock, XCircle, RefreshCw, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { apiFetch } from "@/shared/lib/apiClient";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface PilgrimDocStatus {
  pilgrimId: string;
  name: string;
  nik: string | null;
  gender: string | null;
  bookingCode: string | null;
  completionPct: number;
  documents: Record<string, string>;
}

interface DepartureSummary {
  totalPilgrims: number;
  fullyVerified: number;
  partial: number;
  notStarted: number;
  requiredDocTypes: string[];
  departureInfo: { packageTitle: string | null; departureDate: string | null } | null;
  pilgrims: PilgrimDocStatus[];
}

interface Departure {
  id: string;
  departureDate: string;
  package?: { title: string } | null;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  paspor: "Paspor",
  visa: "Visa",
  ktp: "KTP",
  foto: "Foto",
  surat_mahram: "S.Mahram",
  lainnya: "Lainnya",
};

function getDocLabel(docType: string): string {
  return DOC_TYPE_LABELS[docType] ?? docType;
}

type FilterType = "all" | "complete" | "partial" | "notStarted";

export default function AdminDocumentTracking() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [selectedDepartureId, setSelectedDepartureId] = useState<string>("");
  const [summary, setSummary] = useState<DepartureSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    apiFetch<{ data: Departure[] }>("/api/admin/departures")
      .then((res) => setDepartures(res?.data ?? []))
      .catch(() => toast.error("Gagal memuat data keberangkatan"));
  }, []);

  const fetchSummary = useCallback(
    async (departureId: string) => {
      if (!departureId) return;
      setLoading(true);
      try {
        const data = await apiFetch<DepartureSummary>(
          `/api/admin/documents/departure-summary?departureId=${departureId}`
        );
        setSummary(data);
      } catch {
        toast.error("Gagal memuat ringkasan dokumen");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleDepartureChange = (value: string) => {
    setSelectedDepartureId(value);
    setSummary(null);
    setFilter("all");
    fetchSummary(value);
  };

  const handleRefresh = () => {
    if (selectedDepartureId) {
      fetchSummary(selectedDepartureId);
    }
  };

  const filteredPilgrims = summary
    ? summary.pilgrims.filter((p) => {
        if (filter === "all") return true;
        if (filter === "complete") return p.completionPct === 100;
        if (filter === "partial") return p.completionPct > 0 && p.completionPct < 100;
        if (filter === "notStarted") return p.completionPct === 0;
        return true;
      })
    : [];

  const overallPct =
    summary && summary.totalPilgrims > 0
      ? Math.round((summary.fullyVerified / summary.totalPilgrims) * 100)
      : 0;

  const renderDocIcon = (status: string | undefined) => {
    if (status === "verified") {
      return (
        <span title="Terverifikasi">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        </span>
      );
    }
    if (status === "uploaded") {
      return (
        <span title="Diunggah, menunggu review">
          <Clock className="w-4 h-4 text-yellow-500" />
        </span>
      );
    }
    if (status === "rejected") {
      return (
        <span title="Ditolak">
          <XCircle className="w-4 h-4 text-red-500" />
        </span>
      );
    }
    return (
      <span title="Belum ada">
        <Minus className="w-4 h-4 text-gray-300" />
      </span>
    );
  };

  const getMiniBarColor = (pct: number) => {
    if (pct === 100) return "bg-green-500";
    if (pct > 0) return "bg-yellow-400";
    return "bg-red-400";
  };

  return (
    <div className="space-y-6">
      {/* Departure selector description */}
      <p className="text-sm text-muted-foreground">
        Pantau kelengkapan dokumen jemaah per keberangkatan secara real-time.
      </p>

      {/* Departure selector row */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-md">
          <Select value={selectedDepartureId} onValueChange={handleDepartureChange}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih keberangkatan..." />
            </SelectTrigger>
            <SelectContent>
              {departures.map((dep) => (
                <SelectItem key={dep.id} value={dep.id}>
                  {`${dep.package?.title ?? "Paket"} — ${format(
                    new Date(dep.departureDate),
                    "dd/MM/yyyy",
                    { locale: localeId }
                  )}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={!selectedDepartureId || loading}
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* No departure selected */}
      {!selectedDepartureId && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <FileCheck className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              Pilih keberangkatan untuk melihat tracking dokumen
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary and table */}
      {selectedDepartureId && summary && (
        <div className="space-y-6">
          {/* 4 summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Jemaah
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <span className="text-2xl font-bold text-blue-600">
                  {summary.totalPilgrims}
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Lengkap
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold text-green-600">
                  {summary.fullyVerified}
                </span>
                <span className="text-sm text-muted-foreground">
                  (
                  {summary.totalPilgrims > 0
                    ? Math.round((summary.fullyVerified / summary.totalPilgrims) * 100)
                    : 0}
                  %)
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Sebagian
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                <span className="text-2xl font-bold text-yellow-600">
                  {summary.partial}
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Belum Mulai
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-2xl font-bold text-red-600">
                  {summary.notStarted}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Overall progress */}
          <Card>
            <CardContent className="pt-4 pb-4 space-y-2">
              <p className="font-bold text-sm">
                Kelengkapan Keseluruhan: {overallPct}%
              </p>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-green-500 h-4 rounded-full transition-all"
                  style={{ width: overallPct + "%" }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {(
              [
                { key: "all", label: "Semua" },
                { key: "complete", label: "Lengkap" },
                { key: "partial", label: "Sebagian" },
                { key: "notStarted", label: "Belum Mulai" },
              ] as { key: FilterType; label: string }[]
            ).map(({ key, label }) => (
              <Button
                key={key}
                size="sm"
                variant={filter === key ? "default" : "outline"}
                onClick={() => setFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Document matrix table */}
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Nama</th>
                  <th className="text-left px-4 py-3 font-medium">Booking</th>
                  {summary.requiredDocTypes.map((docType) => (
                    <th key={docType} className="text-center px-3 py-3 font-medium">
                      {getDocLabel(docType)}
                    </th>
                  ))}
                  <th className="text-left px-4 py-3 font-medium">Kelengkapan</th>
                </tr>
              </thead>
              <tbody>
                {filteredPilgrims.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3 + summary.requiredDocTypes.length}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Tidak ada data
                    </td>
                  </tr>
                ) : (
                  filteredPilgrims.map((pilgrim) => (
                    <tr
                      key={pilgrim.pilgrimId}
                      className="border-t hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{pilgrim.name}</p>
                        {pilgrim.nik && (
                          <p className="text-xs text-muted-foreground">{pilgrim.nik}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {pilgrim.bookingCode ? (
                          <Badge variant="outline" className="text-xs">
                            {pilgrim.bookingCode}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      {summary.requiredDocTypes.map((docType) => (
                        <td key={docType} className="px-3 py-3 text-center">
                          <div className="flex justify-center">
                            {renderDocIcon(pilgrim.documents[docType])}
                          </div>
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-[80px]">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${getMiniBarColor(
                                pilgrim.completionPct
                              )}`}
                              style={{ width: pilgrim.completionPct + "%" }}
                            />
                          </div>
                          <span className="text-xs font-medium whitespace-nowrap">
                            {pilgrim.completionPct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loading state */}
      {selectedDepartureId && loading && !summary && (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
