/**
 * O-9: Visa Tracking — status pengajuan visa per jemaah
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { toast } from "sonner";
import { FileText, Plus, CheckCheck, AlertTriangle } from "lucide-react";

interface VisaApp {
  id: string; bookingId: string; pilgrimId: string;
  status: string; submittedAt: string | null; approvedAt: string | null;
  expiryDate: string | null; rejectionReason: string | null;
  visaNumber: string | null; notes: string | null;
  pilgrimName: string; pilgrimPassportNumber: string | null;
  pilgrimGender: string | null; bookingCode: string; departureId: string | null;
}

interface Departure { id: string; departureDate: string; packageTitle: string; }

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:      { label: "Draft",       color: "bg-gray-100 text-gray-700" },
  submitted:  { label: "Diajukan",    color: "bg-blue-100 text-blue-700" },
  processing: { label: "Diproses",    color: "bg-yellow-100 text-yellow-700" },
  approved:   { label: "Disetujui",   color: "bg-green-100 text-green-700" },
  rejected:   { label: "Ditolak",     color: "bg-red-100 text-red-700" },
  expired:    { label: "Expired",     color: "bg-orange-100 text-orange-700" },
};

export default function VisaTracking() {
  const qc = useQueryClient();
  const [departureId, setDepartureId] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editVisa, setEditVisa] = useState<VisaApp | null>(null);
  const [editForm, setEditForm] = useState<Partial<VisaApp>>({});
  const [bulkStatus, setBulkStatus] = useState("");

  const { data: departures = [] } = useQuery<Departure[]>({
    queryKey: ["departures-list"],
    queryFn: () => apiFetch<{ data: Departure[] }>("/api/admin/departures?limit=100").then((r: any) => r.data ?? r),
  });

  const params = new URLSearchParams();
  if (departureId !== "all") params.set("departureId", departureId);
  if (statusFilter !== "all") params.set("status", statusFilter);

  const { data: result, isLoading } = useQuery<{ data: VisaApp[] }>({
    queryKey: ["visa", departureId, statusFilter],
    queryFn: () => apiFetch(`/api/admin/visa?${params}`),
  });

  const visas = (result?.data ?? []).filter((v) => {
    if (!search) return true;
    return v.pilgrimName.toLowerCase().includes(search.toLowerCase()) ||
      v.bookingCode.toLowerCase().includes(search.toLowerCase());
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      apiFetch(`/api/admin/visa/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visa"] });
      setEditVisa(null);
      toast.success("Status visa diperbarui");
    },
    onError: (e: any) => toast.error(e.message || "Gagal memperbarui"),
  });

  const bulkMutation = useMutation({
    mutationFn: (body: any) => apiFetch("/api/admin/visa/bulk-update", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visa"] });
      setSelected(new Set()); setBulkStatus("");
      toast.success("Status bulk diperbarui");
    },
    onError: (e: any) => toast.error(e.message || "Gagal bulk update"),
  });

  const toggleAll = () => {
    if (selected.size === visas.length) setSelected(new Set());
    else setSelected(new Set(visas.map((v) => v.id)));
  };

  const openEdit = (v: VisaApp) => { setEditVisa(v); setEditForm(v); };

  // Expiry warning: visa expiring within 90 days before departure
  const today = new Date();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tracking Visa</h1>
          <p className="text-muted-foreground text-sm">Status pengajuan visa per jemaah keberangkatan</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={departureId} onValueChange={setDepartureId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Semua Keberangkatan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Keberangkatan</SelectItem>
            {departures.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>
                {d.packageTitle ?? d.package_title ?? "?"} — {d.departureDate ?? d.departure_date}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Semua Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Cari nama / kode booking..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-3 pb-3 flex items-center gap-3">
            <span className="text-sm font-medium">{selected.size} jemaah dipilih</span>
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Ubah status..." /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" disabled={!bulkStatus || bulkMutation.isPending}
              onClick={() => bulkMutation.mutate({ ids: [...selected], status: bulkStatus })}>
              <CheckCheck className="h-4 w-4 mr-1" />Terapkan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary badges */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const cnt = visas.filter((v) => v.status === status).length;
          if (cnt === 0) return null;
          return (
            <span key={status} className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.color}`}>
              {cfg.label}: {cnt}
            </span>
          );
        })}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Memuat...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="py-3 px-4 w-8">
                      <Checkbox checked={selected.size > 0 && selected.size === visas.length} onCheckedChange={toggleAll} />
                    </th>
                    <th className="py-3 px-4 text-left font-medium">Jemaah</th>
                    <th className="py-3 px-4 text-left font-medium">Passport</th>
                    <th className="py-3 px-4 text-left font-medium">Booking</th>
                    <th className="py-3 px-4 text-left font-medium">Status</th>
                    <th className="py-3 px-4 text-left font-medium">No. Visa</th>
                    <th className="py-3 px-4 text-left font-medium">Diajukan</th>
                    <th className="py-3 px-4 text-left font-medium">Expired</th>
                    <th className="py-3 px-4 text-left font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {visas.length === 0 ? (
                    <tr><td colSpan={9} className="py-10 text-center text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Tidak ada data visa
                    </td></tr>
                  ) : visas.map((v) => {
                    const cfg = STATUS_CONFIG[v.status] ?? { label: v.status, color: "bg-gray-100 text-gray-700" };
                    const expiring = v.expiryDate && new Date(v.expiryDate) < new Date(Date.now() + 90 * 86400000);
                    return (
                      <tr key={v.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-2 px-4">
                          <Checkbox checked={selected.has(v.id)}
                            onCheckedChange={(c) => {
                              const s = new Set(selected);
                              c ? s.add(v.id) : s.delete(v.id);
                              setSelected(s);
                            }} />
                        </td>
                        <td className="py-2 px-4">
                          <p className="font-medium">{v.pilgrimName}</p>
                          <p className="text-xs text-muted-foreground">{v.pilgrimGender}</p>
                        </td>
                        <td className="py-2 px-4 font-mono text-xs">{v.pilgrimPassportNumber ?? "-"}</td>
                        <td className="py-2 px-4 font-mono text-xs">{v.bookingCode}</td>
                        <td className="py-2 px-4">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                        </td>
                        <td className="py-2 px-4 font-mono text-xs">{v.visaNumber ?? "-"}</td>
                        <td className="py-2 px-4 text-xs text-muted-foreground">
                          {v.submittedAt ? new Date(v.submittedAt).toLocaleDateString("id-ID") : "-"}
                        </td>
                        <td className="py-2 px-4 text-xs">
                          {v.expiryDate ? (
                            <span className={expiring ? "text-orange-600 font-medium" : "text-muted-foreground"}>
                              {expiring && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                              {new Date(v.expiryDate).toLocaleDateString("id-ID")}
                            </span>
                          ) : "-"}
                        </td>
                        <td className="py-2 px-4">
                          <Button size="sm" variant="outline" onClick={() => openEdit(v)}>Edit</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editVisa} onOpenChange={(o) => !o && setEditVisa(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Visa — {editVisa?.pilgrimName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">No. Visa</label>
              <Input value={editForm.visaNumber ?? ""} onChange={(e) => setEditForm({ ...editForm, visaNumber: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tanggal Pengajuan</label>
              <Input type="date" value={editForm.submittedAt?.slice(0, 10) ?? ""} onChange={(e) => setEditForm({ ...editForm, submittedAt: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tanggal Approved</label>
              <Input type="date" value={editForm.approvedAt?.slice(0, 10) ?? ""} onChange={(e) => setEditForm({ ...editForm, approvedAt: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tanggal Expired</label>
              <Input type="date" value={editForm.expiryDate ?? ""} onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })} />
            </div>
            {editForm.status === "rejected" && (
              <div>
                <label className="text-sm font-medium mb-1 block">Alasan Penolakan</label>
                <Input value={editForm.rejectionReason ?? ""} onChange={(e) => setEditForm({ ...editForm, rejectionReason: e.target.value })} />
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">Catatan</label>
              <Input value={editForm.notes ?? ""} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditVisa(null)}>Batal</Button>
            <Button disabled={updateMutation.isPending}
              onClick={() => editVisa && updateMutation.mutate({ id: editVisa.id, body: editForm })}>
              {updateMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
