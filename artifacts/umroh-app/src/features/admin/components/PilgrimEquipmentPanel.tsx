/**
 * PL-F01 — Equipment assignment panel for a booking.
 * Shows all equipment distributed to each pilgrim in this booking.
 * Allows staff to add/update/remove assignments.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import { useToast } from "@/shared/hooks/use-toast";
import { Plus, Trash2, Package, CheckCircle2, RotateCcw, Users, Search, ClipboardCheck } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Pilgrim {
  id: string;
  name: string;
}

interface EquipmentItem {
  id: string;
  name: string;
  category: string | null;
}

interface Assignment {
  id: string;
  pilgrimId: string;
  equipmentId: string;
  status: string;
  pilgrimName: string | null;
  equipmentName: string | null;
  equipmentCategory: string | null;
  distributedAt: string | null;
  distributedBy: string | null;
}

// ─── Status label helpers ─────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending:     { label: "Menunggu", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  distributed: { label: "Diserahkan", className: "bg-green-100 text-green-800 border-green-300" },
  returned:    { label: "Dikembalikan", className: "bg-blue-100 text-blue-800 border-blue-300" },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_LABELS[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
interface PilgrimEquipmentPanelProps {
  bookingId: string;
  pilgrims: Pilgrim[];
}

const PilgrimEquipmentPanel = ({ bookingId, pilgrims }: PilgrimEquipmentPanelProps) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newPilgrimId, setNewPilgrimId] = useState("");
  const [newEquipmentId, setNewEquipmentId] = useState("");
  const [bulkEquipmentId, setBulkEquipmentId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch all assignments for this booking
  const { data: assignData, isLoading } = useQuery({
    queryKey: ["pilgrim-equipment", bookingId],
    queryFn: () =>
      apiFetch<{ data: Assignment[] }>(`/api/admin/pilgrim-equipment?bookingId=${bookingId}`),
    enabled: !!bookingId,
  });

  // Fetch equipment catalog
  const { data: eqData } = useQuery({
    queryKey: ["equipment-list-for-assignment"],
    queryFn: () => apiFetch<{ data: EquipmentItem[] }>("/api/admin/masterdata/equipment"),
    staleTime: 60_000,
  });

  const assignments = assignData?.data ?? [];
  const equipmentList = eqData?.data ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ["pilgrim-equipment", bookingId] });

  // Mutations
  const addMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/admin/pilgrim-equipment", {
        method: "POST",
        body: JSON.stringify({ pilgrimId: newPilgrimId, equipmentId: newEquipmentId, bookingId }),
      }),
    onSuccess: () => {
      toast({ title: "Perlengkapan ditetapkan" });
      setNewPilgrimId("");
      setNewEquipmentId("");
      invalidate();
    },
    onError: (e: any) => toast({ title: "Gagal menetapkan", description: e?.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/api/admin/pilgrim-equipment/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => { toast({ title: "Status diperbarui" }); invalidate(); },
    onError: (e: any) => toast({ title: "Gagal update status", description: e?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/pilgrim-equipment/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Penetapan dihapus" }); invalidate(); },
    onError: (e: any) => toast({ title: "Gagal hapus", description: e?.message, variant: "destructive" }),
  });

  const bulkAssignMutation = useMutation({
    mutationFn: (equipmentId: string) =>
      apiFetch("/api/admin/pilgrim-equipment/bulk-assign", {
        method: "POST",
        body: JSON.stringify({
          assignments: pilgrims.map((p) => ({
            pilgrimId: p.id,
            equipmentId,
            bookingId,
          })),
        }),
      }),
    onSuccess: (res: any) => {
      toast({
        title: `Berhasil: ${res.inserted} jemaah`,
        description: res.skipped ? `${res.skipped} sudah ada, dilewati` : undefined,
      });
      setBulkEquipmentId("");
      invalidate();
    },
    onError: (e: any) => toast({ title: "Gagal bulk assign", description: e?.message, variant: "destructive" }),
  });

  const canAdd = newPilgrimId && newEquipmentId;
  const normalizedSearch = search.trim().toLowerCase();
  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch = !normalizedSearch || [assignment.pilgrimName, assignment.equipmentName, assignment.equipmentCategory]
      .some((value) => value?.toLowerCase().includes(normalizedSearch));
    return matchesSearch && (statusFilter === "all" || assignment.status === statusFilter);
  });
  const pendingCount = assignments.filter((a) => a.status === "pending").length;
  const distributedCount = assignments.filter((a) => a.status === "distributed").length;
  const returnedCount = assignments.filter((a) => a.status === "returned").length;

  return (
    <div className="mt-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2"><Package className="h-4 w-4 text-primary" /></div>
            <div>
              <h4 className="font-semibold text-sm">Perlengkapan Jemaah</h4>
              <p className="text-xs text-muted-foreground">Kelola penetapan dan serah-terima perlengkapan.</p>
            </div>
            <Badge variant="outline" className="text-xs">{assignments.length} item</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          <span><strong>{distributedCount}</strong> diserahkan</span>
          <span className="text-muted-foreground">/</span>
          <span><strong>{pendingCount}</strong> menunggu</span>
        </div>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => setStatusFilter("pending")} className={`rounded-lg border p-2 text-left transition ${statusFilter === "pending" ? "border-yellow-400 bg-yellow-50" : "bg-background hover:bg-muted/40"}`}>
          <p className="text-[11px] text-muted-foreground">Menunggu</p><p className="text-lg font-semibold text-yellow-700">{pendingCount}</p>
        </button>
        <button type="button" onClick={() => setStatusFilter("distributed")} className={`rounded-lg border p-2 text-left transition ${statusFilter === "distributed" ? "border-green-400 bg-green-50" : "bg-background hover:bg-muted/40"}`}>
          <p className="text-[11px] text-muted-foreground">Diserahkan</p><p className="text-lg font-semibold text-green-700">{distributedCount}</p>
        </button>
        <button type="button" onClick={() => setStatusFilter("returned")} className={`rounded-lg border p-2 text-left transition ${statusFilter === "returned" ? "border-blue-400 bg-blue-50" : "bg-background hover:bg-muted/40"}`}>
          <p className="text-[11px] text-muted-foreground">Dikembalikan</p><p className="text-lg font-semibold text-blue-700">{returnedCount}</p>
        </button>
      </div>

      {/* Add new assignment — per jemaah */}
      <div className="flex flex-wrap gap-2 mb-2 p-3 border rounded-lg bg-muted/30">
        <p className="w-full text-xs font-medium text-muted-foreground mb-1">Tambah per jemaah</p>
        <Select value={newPilgrimId} onValueChange={setNewPilgrimId}>
          <SelectTrigger className="w-[180px] h-8 text-sm">
            <SelectValue placeholder="Pilih jemaah" />
          </SelectTrigger>
          <SelectContent>
            {pilgrims.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={newEquipmentId} onValueChange={setNewEquipmentId}>
          <SelectTrigger className="w-[180px] h-8 text-sm">
            <SelectValue placeholder="Pilih perlengkapan" />
          </SelectTrigger>
          <SelectContent>
            {equipmentList.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}{e.category ? ` (${e.category})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          disabled={!canAdd || addMutation.isPending}
          onClick={() => addMutation.mutate()}
          className="h-8"
        >
          <Plus className="w-3 h-3 mr-1" /> Tambah
        </Button>
      </div>

      {/* Bulk assign — satu item ke SEMUA jemaah */}
      {pilgrims.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 border border-primary/20 rounded-lg bg-primary/5">
          <p className="w-full text-xs font-medium text-primary mb-1 flex items-center gap-1.5">
            <Users className="w-3 h-3" /> Assign ke semua {pilgrims.length} jemaah sekaligus
          </p>
          <Select value={bulkEquipmentId} onValueChange={setBulkEquipmentId}>
            <SelectTrigger className="w-[220px] h-8 text-sm">
              <SelectValue placeholder="Pilih perlengkapan" />
            </SelectTrigger>
            <SelectContent>
              {equipmentList.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}{e.category ? ` (${e.category})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!bulkEquipmentId || bulkAssignMutation.isPending}
            onClick={() => bulkAssignMutation.mutate(bulkEquipmentId)}
            className="h-8"
          >
            {bulkAssignMutation.isPending
              ? <span className="w-3 h-3 mr-1 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
              : <Users className="w-3 h-3 mr-1" />}
            Assign Semua
          </Button>
        </div>
      )}

      {/* Filter daftar perlengkapan */}
      <div className="mb-3 flex flex-col gap-2 rounded-lg border bg-background p-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari jemaah atau perlengkapan..." className="h-9 pl-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-full text-sm sm:w-[170px]"><SelectValue placeholder="Semua status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="pending">Menunggu</SelectItem>
            <SelectItem value="distributed">Diserahkan</SelectItem>
            <SelectItem value="returned">Dikembalikan</SelectItem>
          </SelectContent>
        </Select>
        {(search || statusFilter !== "all") && <Button type="button" variant="ghost" size="sm" className="h-9" onClick={() => { setSearch(""); setStatusFilter("all"); }}>Reset</Button>}
      </div>

      {/* Assignments table */}
      {isLoading ? (
        <div className="text-center py-4 text-sm text-muted-foreground">Memuat...</div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Belum ada perlengkapan yang ditetapkan.
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">Tidak ada perlengkapan yang cocok</p>
          <p className="mt-1 text-xs text-muted-foreground">Coba ubah kata kunci atau filter status.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-auto text-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jemaah</TableHead>
                <TableHead>Perlengkapan</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.pilgrimName ?? "-"}</TableCell>
                  <TableCell>{a.equipmentName ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{a.equipmentCategory ?? "-"}</TableCell>
                  <TableCell><StatusBadge status={a.status} /></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {a.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => statusMutation.mutate({ id: a.id, status: "distributed" })}
                          title="Tandai sebagai diserahkan"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Serahkan
                        </Button>
                      )}
                      {a.status === "distributed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => statusMutation.mutate({ id: a.id, status: "returned" })}
                          title="Tandai sebagai dikembalikan"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" /> Kembalikan
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(a.id)}
                        title="Hapus penetapan"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default PilgrimEquipmentPanel;
