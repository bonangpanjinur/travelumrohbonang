import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  AlertTriangle, Plus, Search, Trash2, Edit2,
  CheckCircle2, Clock, XCircle, MapPin, User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/shared/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";

// ── Types ──────────────────────────────────────────────────────────────────
type Severity = "low" | "medium" | "high" | "critical";
type Status = "open" | "in_progress" | "resolved" | "closed";
type IncidentType = "kesehatan" | "kehilangan" | "ketinggalan" | "keamanan" | "lainnya";

interface Incident {
  id: string;
  departureId: string | null;
  pilgrimId: string | null;
  type: IncidentType;
  title: string;
  description: string;
  status: Status;
  severity: Severity;
  location: string | null;
  handledBy: string | null;
  resolution: string | null;
  reportedBy: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  pilgrimName: string | null;
  departureDate: string | null;
  packageTitle: string | null;
}

interface Departure {
  id: string;
  departureDate: string;
  packageTitle?: string | null;
  package?: { title: string } | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const safeFormat = (value: string | null | undefined, pattern: string) => {
  if (!value) return "-";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "-" : format(d, pattern, { locale: localeId });
};

const SEVERITY_CLASS: Record<Severity, string> = {
  critical: "border-red-300 bg-red-50 text-red-700",
  high: "border-orange-300 bg-orange-50 text-orange-700",
  medium: "border-yellow-300 bg-yellow-50 text-yellow-700",
  low: "border-blue-300 bg-blue-50 text-blue-700",
};

const STATUS_CLASS: Record<Status, string> = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

const STATUS_LABEL: Record<Status, string> = {
  open: "Terbuka",
  in_progress: "Ditangani",
  resolved: "Selesai",
  closed: "Ditutup",
};

const TYPE_LABEL: Record<IncidentType, string> = {
  kesehatan: "Kesehatan",
  kehilangan: "Kehilangan",
  ketinggalan: "Ketinggalan",
  keamanan: "Keamanan",
  lainnya: "Lainnya",
};

// ── Component ──────────────────────────────────────────────────────────────
const AdminIncidentManagement = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterDeparture, setFilterDeparture] = useState("__all__");
  const [filterStatus, setFilterStatus] = useState("__all__");
  const [filterType, setFilterType] = useState("__all__");
  const [search, setSearch] = useState("");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    type: "" as IncidentType | "",
    severity: "medium" as Severity,
    title: "",
    description: "",
    departureId: "__none__",
    pilgrimId: "",
    location: "",
    handledBy: "",
  });
  const [createLoading, setCreateLoading] = useState(false);

  // Update status dialog
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<Incident | null>(null);
  const [updateForm, setUpdateForm] = useState({
    status: "open" as Status,
    handledBy: "",
    resolution: "",
  });
  const [updateLoading, setUpdateLoading] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────
  const fetchDepartures = async () => {
    try {
      const res = await apiFetch<{ data: Departure[] }>("/api/admin/departures");
      setDepartures(res.data || []);
    } catch {
      // non-fatal
    }
  };

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDeparture !== "__all__") params.set("departureId", filterDeparture);
      if (filterStatus !== "__all__") params.set("status", filterStatus);
      if (filterType !== "__all__") params.set("type", filterType);
      if (search.trim()) params.set("search", search.trim());

      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await apiFetch<{ data: Incident[] } | Incident[]>(
        `/api/admin/incident-reports${query}`
      );
      const list = Array.isArray(res) ? res : (res as { data: Incident[] }).data ?? [];
      setIncidents(list);
    } catch (err: any) {
      toast.error("Gagal memuat insiden", { description: err?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartures();
  }, []);

  useEffect(() => {
    fetchIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDeparture, filterStatus, filterType, search]);

  // ── Stats ──────────────────────────────────────────────────────────────
  const total = incidents.length;
  const countOpen = incidents.filter((i) => i.status === "open").length;
  const countInProgress = incidents.filter((i) => i.status === "in_progress").length;
  const countResolved = incidents.filter((i) => i.status === "resolved").length;

  // ── Create ─────────────────────────────────────────────────────────────
  const resetCreateForm = () => {
    setCreateForm({
      type: "",
      severity: "medium",
      title: "",
      description: "",
      departureId: "__none__",
      pilgrimId: "",
      location: "",
      handledBy: "",
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.type || !createForm.title || !createForm.description) {
      toast.error("Tipe, judul, dan deskripsi wajib diisi");
      return;
    }
    setCreateLoading(true);
    try {
      const body: Record<string, string> = {
        type: createForm.type,
        severity: createForm.severity,
        title: createForm.title,
        description: createForm.description,
      };
      if (createForm.departureId && createForm.departureId !== "__none__")
        body.departureId = createForm.departureId;
      if (createForm.pilgrimId.trim()) body.pilgrimId = createForm.pilgrimId.trim();
      if (createForm.location.trim()) body.location = createForm.location.trim();
      if (createForm.handledBy.trim()) body.handledBy = createForm.handledBy.trim();

      await apiFetch("/api/admin/incident-reports", {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast.success("Laporan insiden berhasil dibuat");
      setCreateOpen(false);
      resetCreateForm();
      fetchIncidents();
    } catch (err: any) {
      toast.error("Gagal membuat laporan", { description: err?.message });
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Update ─────────────────────────────────────────────────────────────
  const openUpdateDialog = (incident: Incident) => {
    setUpdateTarget(incident);
    setUpdateForm({
      status: incident.status,
      handledBy: incident.handledBy ?? "",
      resolution: incident.resolution ?? "",
    });
    setUpdateOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateTarget) return;
    if (
      (updateForm.status === "resolved" || updateForm.status === "closed") &&
      !updateForm.resolution.trim()
    ) {
      toast.error("Resolusi wajib diisi untuk status Selesai atau Ditutup");
      return;
    }
    setUpdateLoading(true);
    try {
      const body: Record<string, string> = { status: updateForm.status };
      if (updateForm.handledBy.trim()) body.handledBy = updateForm.handledBy.trim();
      if (updateForm.resolution.trim()) body.resolution = updateForm.resolution.trim();

      await apiFetch(`/api/admin/incident-reports/${updateTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      toast.success("Status insiden berhasil diperbarui");
      setUpdateOpen(false);
      setUpdateTarget(null);
      fetchIncidents();
    } catch (err: any) {
      toast.error("Gagal memperbarui status", { description: err?.message });
    } finally {
      setUpdateLoading(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────
  const handleDelete = async (incident: Incident) => {
    if (
      !window.confirm(
        `Hapus insiden "${incident.title}"? Tindakan ini tidak dapat dibatalkan.`
      )
    )
      return;
    try {
      await apiFetch(`/api/admin/incident-reports/${incident.id}`, {
        method: "DELETE",
      });
      toast.success("Insiden berhasil dihapus");
      fetchIncidents();
    } catch (err: any) {
      toast.error("Gagal menghapus insiden", { description: err?.message });
    }
  };

  // ── Departure label helper ─────────────────────────────────────────────
  const departureLabel = (dep: Departure) => {
    const title = dep.packageTitle ?? dep.package?.title ?? "Paket";
    return `${title} — ${safeFormat(dep.departureDate, "dd/MM/yyyy")}`;
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-7 h-7 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold">Laporan Insiden</h1>
            <p className="text-sm text-muted-foreground">
              Kelola insiden selama keberangkatan umroh
            </p>
          </div>
        </div>
        <Button onClick={() => { resetCreateForm(); setCreateOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Buat Laporan
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Departure filter */}
        <Select value={filterDeparture} onValueChange={setFilterDeparture}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Semua Keberangkatan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Semua Keberangkatan</SelectItem>
            {departures.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {departureLabel(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Semua Status</SelectItem>
            <SelectItem value="open">Terbuka</SelectItem>
            <SelectItem value="in_progress">Ditangani</SelectItem>
            <SelectItem value="resolved">Selesai</SelectItem>
            <SelectItem value="closed">Ditutup</SelectItem>
          </SelectContent>
        </Select>

        {/* Type filter */}
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Semua Tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Semua Tipe</SelectItem>
            <SelectItem value="kesehatan">Kesehatan</SelectItem>
            <SelectItem value="kehilangan">Kehilangan</SelectItem>
            <SelectItem value="ketinggalan">Ketinggalan</SelectItem>
            <SelectItem value="keamanan">Keamanan</SelectItem>
            <SelectItem value="lainnya">Lainnya</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari insiden..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-700">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <XCircle className="w-4 h-4 text-red-500" /> Terbuka
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{countOpen}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="w-4 h-4 text-yellow-500" /> Ditangani
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{countInProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> Selesai
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{countResolved}</p>
          </CardContent>
        </Card>
      </div>

      {/* Incident list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat insiden...</p>
      ) : incidents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Tidak ada insiden</p>
            <p className="text-sm mt-1">Belum ada laporan insiden yang sesuai filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <Card key={incident.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4 px-5">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Left */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={SEVERITY_CLASS[incident.severity]}
                      >
                        {incident.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="secondary">
                        {TYPE_LABEL[incident.type]}
                      </Badge>
                    </div>
                    <p className="font-semibold text-sm leading-snug">{incident.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {incident.description}
                    </p>
                  </div>

                  {/* Middle */}
                  <div className="sm:w-56 space-y-1 text-xs text-muted-foreground shrink-0">
                    {incident.pilgrimName && (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{incident.pilgrimName}</span>
                      </div>
                    )}
                    {incident.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{incident.location}</span>
                      </div>
                    )}
                    {(incident.packageTitle || incident.departureDate) && (
                      <div className="text-xs text-muted-foreground">
                        {incident.packageTitle && (
                          <span className="font-medium text-foreground/70">
                            {incident.packageTitle}
                          </span>
                        )}
                        {incident.departureDate && (
                          <span>
                            {incident.packageTitle ? " — " : ""}
                            {safeFormat(incident.departureDate, "dd/MM/yyyy")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right */}
                  <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                    <div className="space-y-1 text-right">
                      <span
                        className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CLASS[incident.status]}`}
                      >
                        {STATUS_LABEL[incident.status]}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {safeFormat(incident.createdAt, "dd MMM yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title="Edit status"
                        onClick={() => openUpdateDialog(incident)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Hapus"
                        onClick={() => handleDelete(incident)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Laporan Insiden</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            {/* Type */}
            <div className="space-y-1.5">
              <Label htmlFor="c-type">Tipe Insiden *</Label>
              <Select
                value={createForm.type}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, type: v as IncidentType }))}
              >
                <SelectTrigger id="c-type">
                  <SelectValue placeholder="Pilih tipe insiden" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kesehatan">Kesehatan</SelectItem>
                  <SelectItem value="kehilangan">Kehilangan</SelectItem>
                  <SelectItem value="ketinggalan">Ketinggalan</SelectItem>
                  <SelectItem value="keamanan">Keamanan</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Severity */}
            <div className="space-y-1.5">
              <Label htmlFor="c-severity">Tingkat Keparahan</Label>
              <Select
                value={createForm.severity}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, severity: v as Severity }))}
              >
                <SelectTrigger id="c-severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="c-title">Judul *</Label>
              <Input
                id="c-title"
                value={createForm.title}
                onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Judul singkat insiden"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="c-desc">Deskripsi *</Label>
              <Textarea
                id="c-desc"
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Deskripsi lengkap insiden"
                rows={3}
                required
              />
            </div>

            {/* Departure */}
            <div className="space-y-1.5">
              <Label htmlFor="c-departure">Keberangkatan</Label>
              <Select
                value={createForm.departureId}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, departureId: v }))}
              >
                <SelectTrigger id="c-departure">
                  <SelectValue placeholder="Pilih keberangkatan (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Tidak dipilih</SelectItem>
                  {departures.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {departureLabel(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pilgrim ID */}
            <div className="space-y-1.5">
              <Label htmlFor="c-pilgrim">ID Jemaah</Label>
              <Input
                id="c-pilgrim"
                value={createForm.pilgrimId}
                onChange={(e) => setCreateForm((f) => ({ ...f, pilgrimId: e.target.value }))}
                placeholder="ID jemaah (opsional)"
              />
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <Label htmlFor="c-location">Lokasi</Label>
              <Input
                id="c-location"
                value={createForm.location}
                onChange={(e) => setCreateForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Lokasi kejadian (opsional)"
              />
            </div>

            {/* Handled By */}
            <div className="space-y-1.5">
              <Label htmlFor="c-handled">Ditangani Oleh</Label>
              <Input
                id="c-handled"
                value={createForm.handledBy}
                onChange={(e) => setCreateForm((f) => ({ ...f, handledBy: e.target.value }))}
                placeholder="Nama petugas (opsional)"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={createLoading}>
                {createLoading ? "Menyimpan..." : "Buat Laporan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Perbarui Status Insiden</DialogTitle>
          </DialogHeader>
          {updateTarget && (
            <form onSubmit={handleUpdate} className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground font-medium">
                {updateTarget.title}
              </p>

              {/* Status */}
              <div className="space-y-1.5">
                <Label htmlFor="u-status">Status</Label>
                <Select
                  value={updateForm.status}
                  onValueChange={(v) =>
                    setUpdateForm((f) => ({ ...f, status: v as Status }))
                  }
                >
                  <SelectTrigger id="u-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Terbuka</SelectItem>
                    <SelectItem value="in_progress">Ditangani</SelectItem>
                    <SelectItem value="resolved">Selesai</SelectItem>
                    <SelectItem value="closed">Ditutup</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Handled By */}
              <div className="space-y-1.5">
                <Label htmlFor="u-handled">Ditangani Oleh</Label>
                <Input
                  id="u-handled"
                  value={updateForm.handledBy}
                  onChange={(e) =>
                    setUpdateForm((f) => ({ ...f, handledBy: e.target.value }))
                  }
                  placeholder="Nama petugas"
                />
              </div>

              {/* Resolution */}
              <div className="space-y-1.5">
                <Label htmlFor="u-resolution">
                  Resolusi/Tindakan yang diambil
                  {(updateForm.status === "resolved" ||
                    updateForm.status === "closed") && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </Label>
                <Textarea
                  id="u-resolution"
                  value={updateForm.resolution}
                  onChange={(e) =>
                    setUpdateForm((f) => ({ ...f, resolution: e.target.value }))
                  }
                  placeholder="Tindakan/resolusi yang dilakukan"
                  rows={3}
                  required={
                    updateForm.status === "resolved" ||
                    updateForm.status === "closed"
                  }
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUpdateOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={updateLoading}>
                  {updateLoading ? "Menyimpan..." : "Simpan"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminIncidentManagement;
