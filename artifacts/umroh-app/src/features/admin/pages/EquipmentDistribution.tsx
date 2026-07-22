/**
 * O-8: Halaman Distribusi Perlengkapan + Stok Rekonsiliasi
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { toast } from "sonner";
import { Backpack, PackageCheck, PackageMinus, RotateCcw } from "lucide-react";

interface Equipment { id: string; name: string; category: string | null; totalStock: number; }
interface Assignment { id: string; equipmentId: string; status: string; quantity: number; equipmentName: string; equipmentCategory: string | null; distributedAt: string | null; returnedAt: string | null; }
interface PilgrimWithAssignments {
  id: string; name: string; gender: string | null; bookingId: string; bookingCode: string;
  assignments: Assignment[];
}
interface DistributionResult {
  pilgrims: PilgrimWithAssignments[];
  equipment: Equipment[];
  stats: { totalPilgrims: number; totalAssignments: number; distributed: number; returned: number; pending: number };
}
interface Departure { id: string; departureDate: string; packageTitle?: string; package_title?: string; }

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700" },
  distributed: { label: "Didistribusi", color: "bg-green-100 text-green-700" },
  returned: { label: "Dikembalikan", color: "bg-gray-100 text-gray-700" },
};

export default function EquipmentDistribution() {
  const qc = useQueryClient();
  const [departureId, setDepartureId] = useState("all");
  const [search, setSearch] = useState("");
  const [bulkDialog, setBulkDialog] = useState(false);
  const [selectedPilgrimIds, setSelectedPilgrimIds] = useState<Set<string>>(new Set());
  const [bulkEquipmentId, setBulkEquipmentId] = useState("");

  const { data: departures = [] } = useQuery<Departure[]>({
    queryKey: ["departures-list"],
    queryFn: () =>
      apiFetch<{ data: Departure[] } | Departure[]>("/api/admin/departures?limit=100").then((r) =>
        Array.isArray(r) ? r : (r as { data: Departure[] }).data ?? []
      ),
  });

  const { data: result, isLoading } = useQuery<DistributionResult>({
    queryKey: ["equipment-distribution", departureId],
    queryFn: () => apiFetch(`/api/admin/pilgrim-equipment/by-departure/${departureId}`),
    enabled: departureId !== "all",
  });

  const pilgrims = (result?.pilgrims ?? []).filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );
  const equipment = result?.equipment ?? [];

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/api/admin/pilgrim-equipment/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipment-distribution"] });
      toast.success("Status diperbarui");
    },
    onError: (e: any) => toast.error(e.message || "Gagal update"),
  });

  const bulkAssignMutation = useMutation({
    mutationFn: (body: any) => apiFetch("/api/admin/pilgrim-equipment/bulk-assign", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ["equipment-distribution"] });
      setBulkDialog(false);
      setSelectedPilgrimIds(new Set());
      setBulkEquipmentId("");
      toast.success(`${d.inserted} assignment dibuat (${d.skipped} sudah ada)`);
    },
    onError: (e: any) => toast.error(e.message || "Gagal bulk assign"),
  });

  const handleBulkAssign = () => {
    if (!bulkEquipmentId || selectedPilgrimIds.size === 0) return;
    const assignments = [...selectedPilgrimIds].map((pilgrimId) => {
      const pilgrim = pilgrims.find((p) => p.id === pilgrimId);
      return { pilgrimId, equipmentId: bulkEquipmentId, bookingId: pilgrim?.bookingId ?? "" };
    });
    bulkAssignMutation.mutate({ assignments });
  };

  const toggleAll = () => {
    if (selectedPilgrimIds.size === pilgrims.length) setSelectedPilgrimIds(new Set());
    else setSelectedPilgrimIds(new Set(pilgrims.map((p) => p.id)));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Distribusi Perlengkapan</h1>
          <p className="text-muted-foreground text-sm">Manajemen perlengkapan manasik per jemaah per keberangkatan</p>
        </div>
        {departureId !== "all" && selectedPilgrimIds.size > 0 && (
          <Button onClick={() => setBulkDialog(true)}>
            <PackageCheck className="h-4 w-4 mr-2" />
            Assign ke {selectedPilgrimIds.size} Jemaah
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={departureId} onValueChange={(v) => { setDepartureId(v); setSelectedPilgrimIds(new Set()); }}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Pilih Keberangkatan..." /></SelectTrigger>
          <SelectContent>
            {departures.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.packageTitle ?? d.package_title ?? "?"} — {d.departureDate}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {departureId !== "all" && (
          <Input placeholder="Cari nama jemaah..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
        )}
      </div>

      {departureId === "all" ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Backpack className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Pilih keberangkatan untuk mengelola distribusi perlengkapan</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Memuat...</div>
      ) : (
        <>
          {/* Stats */}
          {result?.stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Jemaah</p><p className="text-2xl font-bold">{result.stats.totalPilgrims}</p></CardContent></Card>
              <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Assignments</p><p className="text-2xl font-bold">{result.stats.totalAssignments}</p></CardContent></Card>
              <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Terdistribusi</p><p className="text-2xl font-bold text-green-600">{result.stats.distributed}</p></CardContent></Card>
              <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-yellow-600">{result.stats.pending}</p></CardContent></Card>
            </div>
          )}

          {/* Equipment Stock Overview */}
          {equipment.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Stok Perlengkapan</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {equipment.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 text-sm">
                      <span className="font-medium">{e.name}</span>
                      <Badge variant={e.totalStock > 10 ? "default" : e.totalStock > 0 ? "secondary" : "destructive"} className="text-xs">
                        Stok: {e.totalStock}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pilgrims Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="py-3 px-4 w-8">
                        <Checkbox checked={selectedPilgrimIds.size === pilgrims.length && pilgrims.length > 0} onCheckedChange={toggleAll} />
                      </th>
                      <th className="py-3 px-4 text-left font-medium">Jemaah</th>
                      <th className="py-3 px-4 text-left font-medium">Booking</th>
                      <th className="py-3 px-4 text-left font-medium">Perlengkapan Ditetapkan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pilgrims.length === 0 ? (
                      <tr><td colSpan={4} className="py-10 text-center text-muted-foreground">Tidak ada jemaah</td></tr>
                    ) : pilgrims.map((p) => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-3 px-4">
                          <Checkbox checked={selectedPilgrimIds.has(p.id)}
                            onCheckedChange={(c) => {
                              const s = new Set(selectedPilgrimIds);
                              c ? s.add(p.id) : s.delete(p.id);
                              setSelectedPilgrimIds(s);
                            }} />
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.gender}</p>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{p.bookingCode}</td>
                        <td className="py-3 px-4">
                          {p.assignments.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">Belum ada perlengkapan</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {p.assignments.map((a) => {
                                const cfg = STATUS_CONFIG[a.status] ?? { label: a.status, color: "bg-gray-100 text-gray-700" };
                                return (
                                  <div key={a.id} className="flex items-center gap-1.5 bg-muted/50 rounded px-2 py-1">
                                    <span className="text-xs font-medium">{a.equipmentName}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${cfg.color}`}>{cfg.label}</span>
                                    {a.status === "pending" && (
                                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-green-600 hover:text-green-700"
                                        title="Mark Distributed"
                                        onClick={() => updateStatusMutation.mutate({ id: a.id, status: "distributed" })}>
                                        <PackageCheck className="h-3 w-3" />
                                      </Button>
                                    )}
                                    {a.status === "distributed" && (
                                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-gray-600"
                                        title="Mark Returned"
                                        onClick={() => updateStatusMutation.mutate({ id: a.id, status: "returned" })}>
                                        <RotateCcw className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Perlengkapan ke {selectedPilgrimIds.size} Jemaah</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium mb-2 block">Pilih Perlengkapan</label>
            <Select value={bulkEquipmentId} onValueChange={setBulkEquipmentId}>
              <SelectTrigger><SelectValue placeholder="Pilih item perlengkapan..." /></SelectTrigger>
              <SelectContent>
                {equipment.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} (Stok: {e.totalStock})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {bulkEquipmentId && (
              <p className="text-sm text-muted-foreground mt-2">
                Perlengkapan ini akan ditetapkan ke {selectedPilgrimIds.size} jemaah dengan status "pending".
                Jemaah yang sudah memiliki item ini akan diskip.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialog(false)}>Batal</Button>
            <Button disabled={!bulkEquipmentId || bulkAssignMutation.isPending} onClick={handleBulkAssign}>
              {bulkAssignMutation.isPending ? "Memproses..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
