import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { toast } from "sonner";
import { ScanLine, Camera, Square, CheckCircle2, Users, UserCheck, UserX, RefreshCw, Search } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { apiFetch } from "@/shared/lib/apiClient";
import { supabase } from "@/shared/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";

// ── Types ──────────────────────────────────────────────────────────────────

type Recent = {
  id: string;
  pilgrimId: string;
  checkedInAt: string;
  location: string | null;
  pilgrimName?: string;
};

interface Departure {
  id: string;
  departureDate: string;
  package?: { title: string } | null;
}

interface SearchResult {
  id: string;
  name: string;
  nik: string | null;
  phone: string | null;
  gender: string | null;
  bookingCode: string | null;
  packageTitle: string | null;
  departureDate: string | null;
  departureId: string | null;
}

interface RecapPilgrim {
  id: string;
  name: string;
  nik: string | null;
  gender: string | null;
  bookingCode: string | null;
  checkedIn: boolean;
  checkedInAt: string | null;
  location: string | null;
}

interface RecapData {
  total: number;
  checkedIn: number;
  notCheckedIn: number;
  pilgrims: RecapPilgrim[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDepartureLabel(dep: Departure): string {
  return `${dep.package?.title ?? "Paket"} — ${format(new Date(dep.departureDate), "dd/MM/yyyy")}`;
}

// ── Component ──────────────────────────────────────────────────────────────

const AdminCheckIn = () => {
  // ── Shared state ──
  const [location, setLocation] = useState("Bandara CGK Terminal 3");
  const [departures, setDepartures] = useState<Departure[]>([]);

  useEffect(() => {
    apiFetch<{ data: Departure[] }>("/api/admin/departures")
      .then((res) => setDepartures(res?.data ?? []))
      .catch(() => toast.error("Gagal memuat keberangkatan"));
  }, []);

  // ── Tab 1: QR Scanner state ──
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [recent, setRecent] = useState<Recent[]>([]);
  const lastScanRef = useRef<string>("");
  const lastTimeRef = useRef<number>(0);

  const loadRecent = async () => {
    try {
      const data = await apiFetch<any[]>("/api/admin/pilgrims/check-ins");
      setRecent(
        (data || []).map((r: any) => ({
          id: r.id,
          pilgrimId: r.pilgrimId,
          checkedInAt: r.checkedInAt,
          location: r.location,
          pilgrimName: r.pilgrimName,
        }))
      );
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat riwayat check-in");
    }
  };

  useEffect(() => {
    loadRecent();
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  const handleScan = async (decoded: string) => {
    const now = Date.now();
    if (decoded === lastScanRef.current && now - lastTimeRef.current < 3000) return;
    lastScanRef.current = decoded;
    lastTimeRef.current = now;

    let payload: any;
    try {
      payload = JSON.parse(decoded);
    } catch {
      payload = { pilgrim_id: decoded };
    }
    if (!payload.pilgrim_id) {
      toast.error("QR tidak valid");
      return;
    }

    try {
      await apiFetch("/api/admin/pilgrims/check-in", {
        method: "POST",
        body: JSON.stringify({
          pilgrimId: payload.pilgrim_id,
          departureId: payload.departure_id || null,
          location,
        }),
      });
      toast.success(`✓ Check-in berhasil`);
      loadRecent();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const startScanner = async () => {
    setScanning(true);
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        handleScan,
        () => {}
      );
    } catch (e: any) {
      toast.error(e.message || "Gagal akses kamera");
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      await scannerRef.current?.stop();
      await scannerRef.current?.clear();
    } catch {}
    scannerRef.current = null;
    setScanning(false);
  };

  // ── Tab 2: Manual search state ──
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartureId, setSelectedDepartureId] = useState("all");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [manualLoading, setManualLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState<Set<string>>(new Set());
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string, depId: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setManualLoading(true);
    try {
      const params = new URLSearchParams({ q });
      if (depId && depId !== "all") params.set("departureId", depId);
      const data = await apiFetch<SearchResult[]>(`/api/admin/pilgrims/search?${params.toString()}`);
      setSearchResults(data || []);
    } catch {
      toast.error("Gagal mencari jemaah");
    } finally {
      setManualLoading(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      doSearch(value, selectedDepartureId);
    }, 400);
  };

  const handleDepartureFilterChange = (value: string) => {
    setSelectedDepartureId(value);
    if (searchQuery.trim()) {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        doSearch(searchQuery, value);
      }, 400);
    }
  };

  const handleManualCheckIn = async (result: SearchResult) => {
    setCheckingIn((prev) => new Set(prev).add(result.id));
    try {
      await apiFetch("/api/admin/pilgrims/check-in", {
        method: "POST",
        body: JSON.stringify({
          pilgrimId: result.id,
          departureId: result.departureId || null,
          location,
        }),
      });
      toast.success(`✓ ${result.name} berhasil check-in`);
      setCheckedInIds((prev) => new Set(prev).add(result.id));
    } catch (err: any) {
      toast.error(err.message || "Gagal check-in");
    } finally {
      setCheckingIn((prev) => {
        const next = new Set(prev);
        next.delete(result.id);
        return next;
      });
    }
  };

  // ── Tab 3: Recap state ──
  const [recapDepartureId, setRecapDepartureId] = useState("");
  const [recapData, setRecapData] = useState<RecapData | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [recapFilter, setRecapFilter] = useState<"all" | "checked" | "unchecked">("all");

  const loadRecap = async (depId: string) => {
    if (!depId) return;
    setRecapLoading(true);
    try {
      const data = await apiFetch<RecapData>(
        `/api/admin/pilgrims/departure-recap?departureId=${depId}`
      );
      setRecapData(data);
    } catch {
      toast.error("Gagal memuat rekapitulasi");
    } finally {
      setRecapLoading(false);
    }
  };

  const handleRecapDepartureChange = (value: string) => {
    setRecapDepartureId(value);
    setRecapData(null);
    loadRecap(value);
  };

  const filteredRecapPilgrims = recapData
    ? recapData.pilgrims.filter((p) => {
        if (recapFilter === "checked") return p.checkedIn;
        if (recapFilter === "unchecked") return !p.checkedIn;
        return true;
      })
    : [];

  const recapPct =
    recapData && recapData.total > 0
      ? Math.round((recapData.checkedIn / recapData.total) * 100)
      : 0;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScanLine className="w-6 h-6 text-primary" /> Check-In Jemaah
        </h1>
        <p className="text-muted-foreground text-sm">
          Scan QR, cari manual, atau lihat rekap kehadiran.
        </p>
      </div>

      <Tabs defaultValue="qr">
        <TabsList>
          <TabsTrigger value="qr">Scanner QR</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="recap">Rekapitulasi</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: QR Scanner ── */}
        <TabsContent value="qr" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scanner</CardTitle>
              <CardDescription>Arahkan kamera ke QR code jemaah.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5 max-w-md">
                <Label>Lokasi Check-in</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div id="qr-reader" className="max-w-md mx-auto rounded-lg overflow-hidden bg-muted" />
              <div className="flex gap-2">
                {!scanning ? (
                  <Button onClick={startScanner}>
                    <Camera className="w-4 h-4 mr-2" /> Mulai Scanner
                  </Button>
                ) : (
                  <Button variant="destructive" onClick={stopScanner}>
                    <Square className="w-4 h-4 mr-2" /> Stop
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Check-in Terbaru</CardTitle>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Belum ada check-in</p>
              ) : (
                <ul className="divide-y">
                  {recent.map((r) => (
                    <li key={r.id} className="py-2 flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{r.pilgrimName || r.pilgrimId.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">{r.location || "-"}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(r.checkedInAt), "HH:mm dd/MM", { locale: localeId })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Manual ── */}
        <TabsContent value="manual" className="space-y-4 mt-4">
          {/* Row 1: Departure select + Location input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Keberangkatan</Label>
              <Select value={selectedDepartureId} onValueChange={handleDepartureFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Keberangkatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Keberangkatan</SelectItem>
                  {departures.map((dep) => (
                    <SelectItem key={dep.id} value={dep.id}>
                      {formatDepartureLabel(dep)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Lokasi Check-in</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>

          {/* Row 2: Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Cari nama atau NIK jemaah..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          {/* Row 3: Results */}
          {manualLoading && (
            <p className="text-sm text-muted-foreground text-center py-4">Mencari…</p>
          )}

          {!manualLoading && !searchQuery.trim() && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Ketik nama atau NIK untuk mencari jemaah
            </p>
          )}

          {!manualLoading && searchQuery.trim() && searchResults.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Tidak ditemukan</p>
          )}

          {!manualLoading && searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((result) => {
                const alreadyChecked = checkedInIds.has(result.id);
                const isLoading = checkingIn.has(result.id);
                return (
                  <Card key={result.id}>
                    <CardContent className="py-3 px-4 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{result.name}</p>
                        <p className="text-xs text-muted-foreground">
                          NIK: {result.nik || "-"}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1 items-center">
                          {result.bookingCode && (
                            <Badge variant="outline" className="text-xs">
                              {result.bookingCode}
                            </Badge>
                          )}
                          {result.packageTitle && (
                            <span className="text-xs text-muted-foreground">
                              {result.packageTitle}
                              {result.departureDate
                                ? ` — ${format(new Date(result.departureDate), "dd/MM/yyyy")}`
                                : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {alreadyChecked ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                            <CheckCircle2 className="w-4 h-4" /> Sudah Check-in
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            disabled={isLoading}
                            onClick={() => handleManualCheckIn(result)}
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            {isLoading ? "Proses…" : "Check-in"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 3: Recap ── */}
        <TabsContent value="recap" className="space-y-4 mt-4">
          {/* Row 1: Departure select + Refresh */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1.5">
              <Label>Keberangkatan</Label>
              <Select value={recapDepartureId} onValueChange={handleRecapDepartureChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih keberangkatan…" />
                </SelectTrigger>
                <SelectContent>
                  {departures.map((dep) => (
                    <SelectItem key={dep.id} value={dep.id}>
                      {formatDepartureLabel(dep)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="icon"
              disabled={!recapDepartureId || recapLoading}
              onClick={() => loadRecap(recapDepartureId)}
            >
              <RefreshCw className={`w-4 h-4 ${recapLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {!recapDepartureId && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Pilih keberangkatan untuk melihat rekap
            </p>
          )}

          {recapDepartureId && recapLoading && (
            <p className="text-sm text-muted-foreground text-center py-8">Memuat rekap…</p>
          )}

          {recapDepartureId && !recapLoading && recapData && (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card>
                  <CardContent className="py-4 px-4 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-100">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Jemaah</p>
                      <p className="text-2xl font-bold">{recapData.total}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 px-4 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-green-100">
                      <UserCheck className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sudah Check-in</p>
                      <p className="text-2xl font-bold">
                        {recapData.checkedIn}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{recapData.total}
                        </span>
                      </p>
                      <p className="text-xs text-green-600">{recapPct}%</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 px-4 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-red-100">
                      <UserX className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Belum Check-in</p>
                      <p className="text-2xl font-bold">{recapData.notCheckedIn}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Progress bar */}
              <div className="w-full h-3 rounded-full bg-gray-200">
                <div
                  className="h-3 rounded-full bg-green-500 transition-all"
                  style={{ width: `${recapPct}%` }}
                />
              </div>

              {/* Filter buttons */}
              <div className="flex gap-2">
                {(["all", "checked", "unchecked"] as const).map((f) => {
                  const labels = { all: "Semua", checked: "Sudah", unchecked: "Belum" };
                  return (
                    <Button
                      key={f}
                      size="sm"
                      variant={recapFilter === f ? "default" : "outline"}
                      onClick={() => setRecapFilter(f)}
                    >
                      {labels[f]}
                    </Button>
                  );
                })}
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-3 py-2 font-medium">Nama</th>
                      <th className="text-left px-3 py-2 font-medium">NIK</th>
                      <th className="text-left px-3 py-2 font-medium">Gender</th>
                      <th className="text-left px-3 py-2 font-medium">Booking</th>
                      <th className="text-left px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecapPilgrims.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-muted-foreground">
                          Tidak ada data
                        </td>
                      </tr>
                    ) : (
                      filteredRecapPilgrims.map((p) => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-3 py-2 font-medium">{p.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{p.nik || "-"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{p.gender || "-"}</td>
                          <td className="px-3 py-2">
                            {p.bookingCode ? (
                              <Badge variant="outline" className="text-xs">
                                {p.bookingCode}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {p.checkedIn ? (
                              <span className="text-green-600 font-medium">
                                ✓{" "}
                                {p.checkedInAt
                                  ? format(new Date(p.checkedInAt), "HH:mm dd/MM")
                                  : ""}
                              </span>
                            ) : (
                              <span className="text-red-500 font-medium">✗ Belum</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminCheckIn;
