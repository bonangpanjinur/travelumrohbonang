/**
 * O-10: Seat Assignment — penempatan kursi pesawat per jemaah
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "sonner";
import { Plane, Save, CheckCircle2 } from "lucide-react";

interface PilgrimSeat {
  id: string; name: string; gender: string | null;
  nik: string | null; passportNumber: string | null;
  roomType: string | null; seatNumber: string | null;
  flightSegment: string | null; bookingId: string; bookingCode: string;
}

interface SeatResult {
  data: PilgrimSeat[];
  stats: { total: number; assigned: number; unassigned: number };
}

interface Departure { id: string; departureDate: string; packageTitle?: string; package_title?: string; }

const SEGMENTS = ["GO", "RETURN", "GO-1", "GO-2", "RETURN-1", "RETURN-2"];

export default function SeatAssignment() {
  const qc = useQueryClient();
  const [departureId, setDepartureId] = useState("all");
  const [search, setSearch] = useState("");
  const [edits, setEdits] = useState<Record<string, { seatNumber: string; flightSegment: string }>>({});
  const [saving, setSaving] = useState(false);

  const { data: departures = [] } = useQuery<Departure[]>({
    queryKey: ["departures-list"],
    queryFn: () => apiFetch<any>("/api/admin/departures?limit=100").then((r) => r.data ?? r),
  });

  const { data: result, isLoading } = useQuery<SeatResult>({
    queryKey: ["seat-assignment", departureId],
    queryFn: () => apiFetch(`/api/admin/seat-assignment?departureId=${departureId}`),
    enabled: departureId !== "all",
  });

  const pilgrims = (result?.data ?? []).filter((p) => {
    if (!search) return true;
    return p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.seatNumber ?? "").toLowerCase().includes(search.toLowerCase());
  });

  const getEdit = (p: PilgrimSeat) => edits[p.id] ?? {
    seatNumber: p.seatNumber ?? "",
    flightSegment: p.flightSegment ?? "GO",
  };

  const setEdit = (id: string, field: "seatNumber" | "flightSegment", value: string) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...getEdit({ id } as any), ...prev[id], [field]: value },
    }));
  };

  const hasChanges = Object.keys(edits).length > 0;

  const saveAll = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      const assignments = Object.entries(edits).map(([pilgrimId, e]) => ({
        pilgrimId,
        seatNumber: e.seatNumber,
        flightSegment: e.flightSegment,
      }));
      await apiFetch("/api/admin/seat-assignment/bulk", {
        method: "POST",
        body: JSON.stringify({ assignments }),
      });
      qc.invalidateQueries({ queryKey: ["seat-assignment"] });
      setEdits({});
      toast.success(`${assignments.length} kursi berhasil disimpan`);
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assignment Kursi Pesawat</h1>
          <p className="text-muted-foreground text-sm">Penempatan nomor kursi per jemaah per penerbangan</p>
        </div>
        {hasChanges && (
          <Button onClick={saveAll} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Menyimpan..." : `Simpan ${Object.keys(edits).length} Perubahan`}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={departureId} onValueChange={(v) => { setDepartureId(v); setEdits({}); }}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Pilih Keberangkatan..." /></SelectTrigger>
          <SelectContent>
            {departures.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.packageTitle ?? d.package_title ?? "?"} — {d.departureDate}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="Cari nama jemaah / kursi..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
      </div>

      {departureId === "all" ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Plane className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Pilih keberangkatan untuk melihat daftar jemaah</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Memuat...</div>
      ) : (
        <>
          {/* Stats */}
          {result && (
            <div className="flex gap-4">
              <Badge variant="secondary">{result.stats.total} Jemaah</Badge>
              <Badge className="bg-green-100 text-green-700">{result.stats.assigned} Kursi Assigned</Badge>
              <Badge variant="outline">{result.stats.unassigned} Belum Assigned</Badge>
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="py-3 px-4 text-left font-medium">Nama Jemaah</th>
                      <th className="py-3 px-4 text-left font-medium">Booking</th>
                      <th className="py-3 px-4 text-left font-medium">Gender</th>
                      <th className="py-3 px-4 text-left font-medium">Kamar</th>
                      <th className="py-3 px-4 text-left font-medium w-32">Penerbangan</th>
                      <th className="py-3 px-4 text-left font-medium w-28">No. Kursi</th>
                      <th className="py-3 px-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pilgrims.length === 0 ? (
                      <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">Tidak ada jemaah</td></tr>
                    ) : pilgrims.map((p) => {
                      const edit = getEdit(p);
                      const isDirty = !!edits[p.id];
                      return (
                        <tr key={p.id} className={`border-b last:border-0 ${isDirty ? "bg-yellow-50/50" : "hover:bg-muted/20"}`}>
                          <td className="py-2 px-4 font-medium">{p.name}</td>
                          <td className="py-2 px-4 font-mono text-xs text-muted-foreground">{p.bookingCode}</td>
                          <td className="py-2 px-4 text-xs">
                            <Badge variant="outline" className="text-xs">{p.gender ?? "-"}</Badge>
                          </td>
                          <td className="py-2 px-4 text-xs text-muted-foreground">
                            {p.roomType ?? "-"}
                          </td>
                          <td className="py-2 px-4">
                            <Select value={edit.flightSegment || "GO"}
                              onValueChange={(v) => setEdit(p.id, "flightSegment", v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {SEGMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-2 px-4">
                            <Input
                              className="h-8 text-xs font-mono"
                              placeholder="14A"
                              value={edit.seatNumber}
                              onChange={(e) => setEdit(p.id, "seatNumber", e.target.value.toUpperCase())}
                            />
                          </td>
                          <td className="py-2 px-4">
                            {p.seatNumber && !isDirty && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
