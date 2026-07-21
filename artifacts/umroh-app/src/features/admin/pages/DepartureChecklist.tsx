/**
 * O-11: Pre-departure Checklist Otomatis
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { toast } from "sonner";
import { ClipboardList, Wand2, Plus, Trash2 } from "lucide-react";

interface ChecklistItem {
  id: string; departureId: string; hMinus: number;
  category: string | null; item: string; isDone: boolean;
  doneBy: string | null; doneAt: string | null; notes: string | null;
}

interface ChecklistResult {
  data: ChecklistItem[];
  stats: { total: number; done: number; remaining: number };
}

interface Departure { id: string; departureDate: string; packageTitle?: string; package_title?: string; }

const H_MINUS_LABELS: Record<number, string> = {
  60: "H-60 (2 Bulan Sebelum)", 30: "H-30 (1 Bulan Sebelum)",
  14: "H-14 (2 Minggu Sebelum)", 7: "H-7 (1 Minggu Sebelum)", 3: "H-3 (3 Hari Sebelum)", 0: "Lainnya",
};

const CATEGORY_COLORS: Record<string, string> = {
  dokumen: "bg-blue-100 text-blue-700",
  hotel: "bg-purple-100 text-purple-700",
  keuangan: "bg-green-100 text-green-700",
  distribusi: "bg-orange-100 text-orange-700",
  briefing: "bg-yellow-100 text-yellow-700",
  transportasi: "bg-red-100 text-red-700",
  visa: "bg-indigo-100 text-indigo-700",
  penempatan: "bg-pink-100 text-pink-700",
  checkin: "bg-teal-100 text-teal-700",
};

export default function DepartureChecklist() {
  const qc = useQueryClient();
  const [departureId, setDepartureId] = useState("all");
  const [addDialog, setAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({ item: "", hMinus: 0, category: "", notes: "" });

  const { data: departures = [] } = useQuery<Departure[]>({
    queryKey: ["departures-list"],
    queryFn: () => apiFetch<any>("/api/admin/departures?limit=100").then((r) => r.data ?? r),
  });

  const { data: result, isLoading } = useQuery<ChecklistResult>({
    queryKey: ["checklist", departureId],
    queryFn: () => apiFetch(`/api/admin/checklist?departureId=${departureId}`),
    enabled: departureId !== "all",
  });

  const generateMutation = useMutation({
    mutationFn: () => apiFetch(`/api/admin/checklist/generate/${departureId}`, { method: "POST" }),
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ["checklist"] });
      toast.success(`${d.inserted} item checklist dibuat (${d.skipped} sudah ada)`);
    },
    onError: (e: any) => toast.error(e.message || "Gagal generate"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isDone }: { id: string; isDone: boolean }) =>
      apiFetch(`/api/admin/checklist/${id}`, { method: "PATCH", body: JSON.stringify({ isDone }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklist"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/checklist/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["checklist"] }); toast.success("Item dihapus"); },
    onError: (e: any) => toast.error(e.message),
  });

  const addMutation = useMutation({
    mutationFn: (body: any) => apiFetch("/api/admin/checklist", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist"] });
      setAddDialog(false);
      setAddForm({ item: "", hMinus: 0, category: "", notes: "" });
      toast.success("Item ditambahkan");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const items = result?.data ?? [];
  const stats = result?.stats;

  // Group by hMinus
  const hMinusGroups = [60, 30, 14, 7, 3, 0].map((hm) => ({
    hMinus: hm,
    label: H_MINUS_LABELS[hm] ?? `H-${hm}`,
    items: items.filter((i) => i.hMinus === hm),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Checklist Keberangkatan</h1>
          <p className="text-muted-foreground text-sm">Daftar persiapan H-60 sampai H-3 sebelum berangkat</p>
        </div>
        {departureId !== "all" && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              <Wand2 className="h-4 w-4 mr-2" />Generate Otomatis
            </Button>
            <Button onClick={() => setAddDialog(true)}><Plus className="h-4 w-4 mr-2" />Tambah Item</Button>
          </div>
        )}
      </div>

      {/* Select Departure */}
      <Select value={departureId} onValueChange={setDepartureId}>
        <SelectTrigger className="w-72"><SelectValue placeholder="Pilih Keberangkatan..." /></SelectTrigger>
        <SelectContent>
          {departures.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.packageTitle ?? d.package_title ?? "?"} — {d.departureDate}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {departureId === "all" ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Pilih keberangkatan untuk melihat checklist</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Memuat...</div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="mb-3">Belum ada checklist. Klik "Generate Otomatis" untuk membuat.</p>
            <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              <Wand2 className="h-4 w-4 mr-2" />Generate Checklist Standar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Progress */}
          {stats && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Progress Keseluruhan</span>
                  <span className="text-sm text-muted-foreground">{stats.done}/{stats.total} selesai</span>
                </div>
                <Progress value={stats.total > 0 ? (stats.done / stats.total) * 100 : 0} className="h-2" />
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="text-green-600">{stats.done} selesai</span>
                  <span>{stats.remaining} tersisa</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grouped by H- */}
          {hMinusGroups.map(({ hMinus, label, items: gItems }) => {
            const doneCount = gItems.filter((i) => i.isDone).length;
            return (
              <Card key={hMinus}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{label}</span>
                    <Badge variant={doneCount === gItems.length ? "default" : "secondary"} className="text-xs">
                      {doneCount}/{gItems.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {gItems.map((item) => (
                      <div key={item.id} className={`flex items-start gap-3 p-3 rounded-lg border ${item.isDone ? "bg-green-50/50 border-green-200" : "bg-muted/20"}`}>
                        <Checkbox
                          checked={item.isDone}
                          onCheckedChange={(c) => toggleMutation.mutate({ id: item.id, isDone: !!c })}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${item.isDone ? "line-through text-muted-foreground" : "font-medium"}`}>
                            {item.item}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {item.category && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${CATEGORY_COLORS[item.category] ?? "bg-gray-100 text-gray-700"}`}>
                                {item.category}
                              </span>
                            )}
                            {item.isDone && item.doneAt && (
                              <span className="text-xs text-muted-foreground">
                                Selesai: {new Date(item.doneAt).toLocaleDateString("id-ID")}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                          onClick={() => { if (confirm("Hapus item ini?")) deleteMutation.mutate(item.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </>
      )}

      {/* Add Item Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Item Checklist</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Item Checklist *</label>
              <Input value={addForm.item} onChange={(e) => setAddForm({ ...addForm, item: e.target.value })} placeholder="Deskripsi item..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">H-</label>
                <Select value={String(addForm.hMinus)} onValueChange={(v) => setAddForm({ ...addForm, hMinus: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[60, 30, 14, 7, 3, 0].map((h) => <SelectItem key={h} value={String(h)}>H-{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Kategori</label>
                <Input value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} placeholder="dokumen, hotel..." />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Batal</Button>
            <Button disabled={!addForm.item || addMutation.isPending}
              onClick={() => addMutation.mutate({ ...addForm, departureId })}>
              {addMutation.isPending ? "Menyimpan..." : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
