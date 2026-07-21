/**
 * O-10: Seat Assignment — Grid kursi pesawat visual per keberangkatan
 *
 * Layout: Pilih keberangkatan → pilih segmen (GO/RETURN) →
 *   panel kiri: grid kursi pesawat (klik untuk assign)
 *   panel kanan: daftar jemaah (klik untuk "select", lalu klik kursi)
 */

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { toast } from "sonner";
import {
  Plane, Save, Search, Users, CheckCircle2, X, User,
  ChevronDown, ChevronUp, RotateCcw, Settings2,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PilgrimSeat {
  id: string;
  name: string;
  gender: string | null;
  nik: string | null;
  passportNumber: string | null;
  roomType: string | null;
  seatNumber: string | null;
  flightSegment: string | null;
  bookingId: string;
  bookingCode: string;
}

interface SeatResult {
  data: PilgrimSeat[];
  stats: { total: number; assigned: number; unassigned: number };
}

interface Departure {
  id: string;
  departureDate: string;
  returnDate?: string | null;
  packageTitle?: string;
}

// ─── Plane config ─────────────────────────────────────────────────────────────

type PlaneLayout = "narrow" | "wide";

interface PlaneConfig {
  layout: PlaneLayout;
  rows: number;
  /** column letters per section, separated by null (aisle) */
  columns: (string | null)[];
}

const PLANE_CONFIGS: Record<PlaneLayout, PlaneConfig> = {
  narrow: { layout: "narrow", rows: 30, columns: ["A", "B", "C", null, "D", "E", "F"] },
  wide:   { layout: "wide",   rows: 40, columns: ["A", "B", null, "C", "D", "E", "F", null, "G", "H"] },
};

const SEGMENTS = ["GO", "RETURN", "GO-1", "GO-2", "RETURN-1", "RETURN-2"];

// ─── Seat cell component ──────────────────────────────────────────────────────

interface SeatCellProps {
  seatCode: string; // e.g. "14A"
  pilgrim: PilgrimSeat | null; // currently assigned pilgrim (merged draft+server)
  isSelected: boolean;  // this is the "active" pilgrim's seat
  isActivePilgrim: boolean; // this seat belongs to the selected pilgrim
  onClick: () => void;
  isDirty: boolean;
}

function SeatCell({ seatCode, pilgrim, isSelected, isActivePilgrim, onClick, isDirty }: SeatCellProps) {
  const occupied = !!pilgrim;
  const gender = pilgrim?.gender;

  let bg = "bg-gray-100 hover:bg-gray-200 border-gray-200 cursor-pointer";
  if (isActivePilgrim) {
    bg = "bg-amber-400 border-amber-500 cursor-pointer ring-2 ring-amber-600";
  } else if (occupied && gender === "female") {
    bg = "bg-pink-200 hover:bg-pink-300 border-pink-300 cursor-pointer";
  } else if (occupied && gender === "male") {
    bg = "bg-blue-200 hover:bg-blue-300 border-blue-300 cursor-pointer";
  } else if (occupied) {
    bg = "bg-purple-200 hover:bg-purple-300 border-purple-300 cursor-pointer";
  }

  if (isDirty && !isActivePilgrim) {
    bg += " ring-2 ring-yellow-400";
  }

  return (
    <button
      onClick={onClick}
      title={pilgrim ? `${pilgrim.name} (${seatCode})` : seatCode}
      className={`
        relative w-9 h-9 rounded-t-lg border-2 text-[10px] font-mono font-semibold
        flex items-center justify-center transition-all
        ${bg}
      `}
    >
      <span className="leading-none">{seatCode.replace(/^\d+/, "")}</span>
      {occupied && (
        <span className="absolute -bottom-0.5 left-0 right-0 h-1 rounded-b-sm bg-current opacity-30" />
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SeatAssignment() {
  const qc = useQueryClient();

  const [departureId, setDepartureId] = useState("");
  const [segment, setSegment] = useState("GO");
  const [planeLayout, setPlaneLayout] = useState<PlaneLayout>("narrow");
  const [customRows, setCustomRows] = useState<number | null>(null);

  // draft: { pilgrimId -> seatNumber } for current segment
  // We store per-segment so switching tabs keeps edits
  const [drafts, setDrafts] = useState<
    Record<string, Record<string, string>> // segment -> { pilgrimId -> seatCode }
  >({});

  const [selectedPilgrimId, setSelectedPilgrimId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const { data: departures = [] } = useQuery<Departure[]>({
    queryKey: ["seat-dep-list"],
    queryFn: () =>
      apiFetch<any>("/api/admin/departures").then((r) => r.data ?? r),
  });

  const { data: result, isLoading } = useQuery<SeatResult>({
    queryKey: ["seat-assignment", departureId],
    queryFn: () => apiFetch(`/api/admin/seat-assignment?departureId=${departureId}`),
    enabled: !!departureId,
  });

  // ── Derived state ─────────────────────────────────────────────────────────

  const pilgrims = result?.data ?? [];
  const segmentDraft = drafts[segment] ?? {};

  // Effective seat for a pilgrim in current segment
  const effectiveSeat = (p: PilgrimSeat): string | null => {
    if (segmentDraft[p.id] !== undefined) return segmentDraft[p.id] || null;
    if (p.flightSegment === segment) return p.seatNumber ?? null;
    return null;
  };

  // Map seatCode -> pilgrim for current segment (draft wins)
  const seatMap = useMemo(() => {
    const map = new Map<string, PilgrimSeat>();
    for (const p of pilgrims) {
      const seat = effectiveSeat(p);
      if (seat) map.set(seat.toUpperCase(), p);
    }
    return map;
  }, [pilgrims, segmentDraft, segment]);

  const segmentPilgrims = pilgrims.filter((p) =>
    !p.flightSegment || p.flightSegment === segment
  );

  const filteredPilgrims = pilgrims.filter((p) => {
    if (!search) return true;
    return (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.bookingCode ?? "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const totalDirty = Object.values(drafts).reduce(
    (acc, d) => acc + Object.keys(d).length,
    0
  );
  const currentDirty = Object.keys(segmentDraft).length;

  const selectedPilgrim = pilgrims.find((p) => p.id === selectedPilgrimId) ?? null;
  const selectedSeat = selectedPilgrim ? effectiveSeat(selectedPilgrim) : null;

  const cfg = PLANE_CONFIGS[planeLayout];
  const rows = customRows ?? cfg.rows;

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleSeatClick = (seatCode: string) => {
    const occupant = seatMap.get(seatCode.toUpperCase());

    if (!selectedPilgrimId) {
      // No pilgrim selected — clicking an occupied seat selects that pilgrim
      if (occupant) setSelectedPilgrimId(occupant.id);
      return;
    }

    if (occupant && occupant.id === selectedPilgrimId) {
      // Clicking own seat → unassign
      setDrafts((prev) => ({
        ...prev,
        [segment]: { ...prev[segment], [selectedPilgrimId]: "" },
      }));
      return;
    }

    if (occupant) {
      toast.error(`Kursi ${seatCode} sudah dipakai oleh ${occupant.name}`);
      return;
    }

    // Assign selected pilgrim to this seat
    setDrafts((prev) => ({
      ...prev,
      [segment]: { ...prev[segment], [selectedPilgrimId]: seatCode.toUpperCase() },
    }));
    // Auto-advance to next unassigned pilgrim
    const idx = filteredPilgrims.findIndex((p) => p.id === selectedPilgrimId);
    const next = filteredPilgrims.slice(idx + 1).find((p) => !effectiveSeat(p));
    setSelectedPilgrimId(next?.id ?? null);
  };

  const unassignPilgrim = (pilgrimId: string) => {
    setDrafts((prev) => ({
      ...prev,
      [segment]: { ...prev[segment], [pilgrimId]: "" },
    }));
  };

  const resetSegment = () => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[segment];
      return next;
    });
  };

  const saveAll = async () => {
    const assignments: Array<{ pilgrimId: string; seatNumber: string; flightSegment: string }> = [];
    for (const [seg, d] of Object.entries(drafts)) {
      for (const [pilgrimId, seatNumber] of Object.entries(d)) {
        assignments.push({ pilgrimId, seatNumber: seatNumber || "", flightSegment: seg });
      }
    }
    if (!assignments.length) return;
    setSaving(true);
    try {
      await apiFetch("/api/admin/seat-assignment/bulk", {
        method: "POST",
        body: JSON.stringify({ assignments }),
      });
      qc.invalidateQueries({ queryKey: ["seat-assignment"] });
      setDrafts({});
      setSelectedPilgrimId(null);
      toast.success(`${assignments.length} kursi berhasil disimpan`);
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  // ── Render: plane grid ────────────────────────────────────────────────────

  const renderSeatCell = (row: number, col: string, ci: number) => {
    const seatCode = `${row}${col}`;
    const pilgrim = seatMap.get(seatCode) ?? null;
    const isActivePilgrim = !!selectedPilgrim && pilgrim?.id === selectedPilgrim.id;
    const isDirty = pilgrim ? segmentDraft[pilgrim.id] !== undefined : false;
    return (
      <SeatCell
        key={seatCode}
        seatCode={seatCode}
        pilgrim={pilgrim}
        isSelected={false}
        isActivePilgrim={isActivePilgrim}
        onClick={() => handleSeatClick(seatCode)}
        isDirty={isDirty}
      />
    );
  };

  const renderGrid = () => (
    <div className="overflow-auto">
      {/* Nose */}
      <div className="flex justify-center mb-2">
        <div className="w-20 h-6 bg-gray-200 rounded-t-full flex items-center justify-center">
          <Plane className="h-3 w-3 text-gray-500 -rotate-90" />
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-0.5 mb-1 pl-8">
        {cfg.columns.map((col, ci) =>
          col === null ? (
            <div key={`aisle-h-${ci}`} className="w-4" />
          ) : (
            <div
              key={col}
              className="w-9 text-center text-[10px] font-bold text-muted-foreground"
            >
              {col}
            </div>
          )
        )}
      </div>

      {/* Rows */}
      <div className="space-y-0.5">
        {Array.from({ length: rows }, (_, i) => {
          const row = i + 1;
          return (
            <div key={row} className="flex items-center gap-0.5">
              {/* Row number */}
              <div className="w-7 text-right text-[10px] text-muted-foreground font-mono pr-1">
                {row}
              </div>
              {cfg.columns.map((col, ci) =>
                col === null ? (
                  <div key={`aisle-${row}-${ci}`} className="w-4" />
                ) : renderSeatCell(row, col, ci)
              )}
            </div>
          );
        })}
      </div>

      {/* Tail */}
      <div className="flex justify-center mt-2">
        <div className="w-12 h-4 bg-gray-200 rounded-b-full" />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-gray-100 border-2 border-gray-200 inline-block" /> Kosong
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-blue-200 border-2 border-blue-300 inline-block" /> Laki-laki
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-pink-200 border-2 border-pink-300 inline-block" /> Perempuan
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-amber-400 border-2 border-amber-500 inline-block" /> Dipilih
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-gray-100 border-2 border-gray-200 ring-2 ring-yellow-400 inline-block" /> Draft
        </span>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Assignment Kursi Pesawat</h1>
          <p className="text-sm text-muted-foreground">
            Klik jemaah → klik kursi untuk assign. Simpan ketika selesai.
          </p>
        </div>
        <div className="flex gap-2">
          {totalDirty > 0 && (
            <Button onClick={saveAll} disabled={saving} className="gradient-gold text-primary">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Menyimpan..." : `Simpan ${totalDirty} Perubahan`}
            </Button>
          )}
        </div>
      </div>

      {/* Departure selector + config */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-52 max-w-xs">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Keberangkatan</label>
          <Select
            value={departureId}
            onValueChange={(v) => { setDepartureId(v); setDrafts({}); setSelectedPilgrimId(null); }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih keberangkatan..." />
            </SelectTrigger>
            <SelectContent>
              {departures.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.packageTitle ?? "Paket"} —{" "}
                  {d.departureDate
                    ? format(new Date(d.departureDate), "dd MMM yyyy", { locale: localeId })
                    : "-"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {departureId && (
          <button
            onClick={() => setShowConfig((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Konfigurasi Pesawat
            {showConfig ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </div>

      {/* Plane config panel */}
      {showConfig && departureId && (
        <Card className="bg-muted/40">
          <CardContent className="pt-4 pb-3 flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Layout</label>
              <Select value={planeLayout} onValueChange={(v) => setPlaneLayout(v as PlaneLayout)}>
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="narrow">Narrow-body (3+3)</SelectItem>
                  <SelectItem value="wide">Wide-body (2+4+2)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Jumlah Baris</label>
              <Input
                type="number"
                min={1}
                max={80}
                value={customRows ?? cfg.rows}
                onChange={(e) => setCustomRows(Number(e.target.value) || null)}
                className="w-24 h-8 text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Total kursi: {rows * cfg.columns.filter(Boolean).length}
            </p>
          </CardContent>
        </Card>
      )}

      {!departureId ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Plane className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Pilih keberangkatan untuk membuka peta kursi</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          {/* Stats bar */}
          {result && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                <Users className="h-3 w-3 mr-1" />
                {result.stats.total} Jemaah
              </Badge>
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {result.stats.assigned} Terassign
              </Badge>
              <Badge variant="outline" className="text-muted-foreground">
                {result.stats.unassigned} Belum
              </Badge>
              {currentDirty > 0 && (
                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                  {currentDirty} perubahan draft
                </Badge>
              )}
            </div>
          )}

          {/* Segment tabs */}
          <Tabs value={segment} onValueChange={(v) => { setSegment(v); setSelectedPilgrimId(null); }}>
            <TabsList>
              {SEGMENTS.map((s) => {
                const d = drafts[s];
                const count = d ? Object.keys(d).length : 0;
                return (
                  <TabsTrigger key={s} value={s} className="gap-1">
                    {s}
                    {count > 0 && (
                      <span className="ml-1 text-[10px] bg-yellow-400 text-yellow-900 rounded-full px-1 font-bold">
                        {count}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          {/* Main two-panel layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
            {/* Left: Plane grid */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  Peta Kursi — Segmen {segment}
                </CardTitle>
                {currentDirty > 0 && (
                  <button
                    onClick={resetSegment}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset draft
                  </button>
                )}
              </CardHeader>
              <CardContent>{renderGrid()}</CardContent>
            </Card>

            {/* Right: Pilgrim list */}
            <div className="flex flex-col gap-3">
              {/* Selected pilgrim card */}
              {selectedPilgrim ? (
                <Card className="border-amber-300 bg-amber-50/50">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-800 mb-0.5">Sedang assign:</p>
                        <p className="font-semibold text-sm truncate">{selectedPilgrim.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{selectedPilgrim.bookingCode}</p>
                        {selectedSeat ? (
                          <div className="flex items-center gap-1 mt-1">
                            <Badge className="bg-amber-200 text-amber-800 border-amber-300 text-xs">
                              Kursi {selectedSeat}
                            </Badge>
                            <button
                              onClick={() => unassignPilgrim(selectedPilgrim.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            Klik kursi kosong di peta
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedPilgrimId(null)}
                        className="text-muted-foreground hover:text-foreground shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-xs text-muted-foreground italic text-center py-1">
                  ↓ Klik nama jemaah untuk memilih
                </div>
              )}

              {/* Pilgrim list */}
              <Card className="flex-1">
                <CardHeader className="pb-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama / booking..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0 max-h-[480px] overflow-y-auto">
                  {filteredPilgrims.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      Tidak ada jemaah
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {filteredPilgrims.map((p) => {
                        const seat = effectiveSeat(p);
                        const isActive = p.id === selectedPilgrimId;
                        const isDirty = segmentDraft[p.id] !== undefined;

                        return (
                          <li
                            key={p.id}
                            onClick={() =>
                              setSelectedPilgrimId(isActive ? null : p.id)
                            }
                            className={`
                              flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors text-sm
                              ${isActive
                                ? "bg-amber-50 border-l-2 border-amber-400"
                                : "hover:bg-muted/50 border-l-2 border-transparent"}
                            `}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <User
                                  className={`h-3 w-3 shrink-0 ${
                                    p.gender === "female"
                                      ? "text-pink-400"
                                      : "text-blue-400"
                                  }`}
                                />
                                <span className={`truncate font-medium ${isActive ? "text-amber-800" : ""}`}>
                                  {p.name}
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {p.bookingCode}
                              </span>
                            </div>
                            <div className="shrink-0 flex items-center gap-1">
                              {seat ? (
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-mono px-1 py-0 ${
                                    isDirty
                                      ? "border-yellow-400 text-yellow-700 bg-yellow-50"
                                      : "border-green-300 text-green-700 bg-green-50"
                                  }`}
                                >
                                  {seat}
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
