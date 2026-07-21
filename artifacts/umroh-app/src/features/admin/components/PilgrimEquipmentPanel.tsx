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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import { useToast } from "@/shared/hooks/use-toast";
import { Plus, Trash2, Package, CheckCircle2, RotateCcw, Users } from "lucide-react";

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

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-4 h-4 text-primary" />
        <h4 className="font-semibold text-sm">Perlengkapan Jemaah</h4>
        <Badge variant="outline" className="text-xs">{assignments.length} item</Badge>
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

      {/* Assignments table */}
      {isLoading ? (
        <div className="text-center py-4 text-sm text-muted-foreground">Memuat...</div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Belum ada perlengkapan yang ditetapkan.
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
              {assignments.map((a) => (
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
