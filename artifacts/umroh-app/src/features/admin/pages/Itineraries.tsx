import { useEffect, useState, useCallback, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useToast } from "@/shared/hooks/use-toast";
import { Plus, Pencil, Trash2, GripVertical, Calendar, MapPin, Upload, Loader2, X, Eye, Copy } from "lucide-react";
import { id as localeId } from "date-fns/locale";
import { safeFormatDate } from "@/lib/utils";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";

interface Departure {
  id: string;
  departure_date: string;
  package: { title: string } | null;
}

interface ItineraryDay {
  id: string;
  day_number: number;
  title: string | null;
  description: string | null;
  image_url: string | null;
}

interface Itinerary {
  id: string;
  departure_id: string;
  title: string | null;
  notes: string | null;
  is_active: boolean;
  departure: Departure | null;
  days: ItineraryDay[];
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Map the flat departure row returned by GET /api/admin/departures
 * into the shape this page expects: { id, departure_date, package: { title } }
 */
function mapApiDeparture(d: any): Departure {
  return {
    id: d.id,
    departure_date: d.departure_date ?? d.departureDate ?? "",
    package: d.package ?? (d.packageTitle ? { title: d.packageTitle } : null),
  };
}

// ─── SortableDayItem ─────────────────────────────────────────────────────────

function SortableDayItem({
  day,
  onEdit,
  onDelete,
}: {
  day: ItineraryDay;
  onEdit: (d: ItineraryDay) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: day.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-4 p-4 border rounded-lg bg-background hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-0.5 rounded hover:bg-muted"
          aria-label="Seret untuk mengurutkan"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="w-16 font-bold text-gold">Hari {day.day_number}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold">{day.title || "-"}</div>
        <p className="text-sm text-muted-foreground line-clamp-2">{day.description}</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => onEdit(day)}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(day.id)}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

// ─── component ───────────────────────────────────────────────────────────────

const AdminItineraries = () => {
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isDayOpen, setIsDayOpen] = useState(false);
  const [editing, setEditing] = useState<Itinerary | null>(null);
  const [editingDay, setEditingDay] = useState<ItineraryDay | null>(null);
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);
  const { toast } = useToast();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<"itinerary" | "day">("itinerary");
  const [uploadingImg, setUploadingImg] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);
  // IT-F02: Preview mode — set id of itinerary currently in preview
  const [previewId, setPreviewId] = useState<string | null>(null);
  // IT-F01: Copy-to-departure
  const [copySourceId, setCopySourceId] = useState<string | null>(null);
  const [copyTargetDep, setCopyTargetDep] = useState<string>("");
  const [copying, setCopying] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const [form, setForm] = useState({
    departure_id: "",
    title: "",
    notes: "",
  });

  const [dayForm, setDayForm] = useState({
    day_number: 1,
    title: "",
    description: "",
    image_url: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  // ── fetch ─────────────────────────────────────────────────────────────────

  const fetchData = async () => {
    const [itinerariesResult, departuresResult] = await Promise.allSettled([
      apiFetch<any[]>("/api/admin/itineraries"),
      apiFetch<{ data: any[] }>("/api/admin/departures"),
    ]);

    if (itinerariesResult.status === "fulfilled") {
      const raw: any[] = Array.isArray(itinerariesResult.value) ? itinerariesResult.value : [];
      setItineraries(
        raw.map((it: any) => ({
          ...it,
          days: (it.days || []).sort(
            (a: ItineraryDay, b: ItineraryDay) => a.day_number - b.day_number,
          ),
        })),
      );
    } else {
      console.error("[itineraries] fetch error:", itinerariesResult.reason);
      toast({
        title: "Gagal memuat itinerary",
        description: (itinerariesResult.reason as any)?.message ?? "Periksa koneksi atau coba lagi.",
        variant: "destructive",
      });
    }

    if (departuresResult.status === "fulfilled") {
      const raw: any[] = Array.isArray(departuresResult.value?.data)
        ? departuresResult.value.data
        : Array.isArray(departuresResult.value)
        ? (departuresResult.value as any)
        : [];
      setDepartures(raw.map(mapApiDeparture));
    } else {
      console.error("[itineraries] departures fetch error:", departuresResult.reason);
      toast({
        title: "Gagal memuat keberangkatan",
        description: (departuresResult.reason as any)?.message,
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  // ── itinerary CRUD ────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.departure_id) {
      toast({ title: "Keberangkatan wajib dipilih", variant: "destructive" });
      return;
    }
    try {
      if (editing) {
        await apiFetch(`/api/admin/itineraries/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            departure_id: form.departure_id,
            title: form.title || null,
            notes: form.notes || null,
          }),
        });
        toast({ title: "Itinerary diupdate!" });
      } else {
        await apiFetch("/api/admin/itineraries", {
          method: "POST",
          body: JSON.stringify({
            departure_id: form.departure_id,
            title: form.title || null,
            notes: form.notes || null,
          }),
        });
        toast({ title: "Itinerary ditambahkan!" });
      }
      fetchData();
      setIsOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Gagal menyimpan itinerary", description: err?.message, variant: "destructive" });
    }
  };

  // ── day CRUD ──────────────────────────────────────────────────────────────

  const handleDaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItinerary) return;
    try {
      if (editingDay) {
        await apiFetch(`/api/admin/itineraries/days/${editingDay.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            day_number: dayForm.day_number,
            title: dayForm.title || null,
            description: dayForm.description || null,
            image_url: dayForm.image_url || null,
          }),
        });
        toast({ title: "Hari diupdate!" });
      } else {
        await apiFetch("/api/admin/itineraries/days", {
          method: "POST",
          body: JSON.stringify({
            itinerary_id: selectedItinerary.id,
            day_number: dayForm.day_number,
            title: dayForm.title || null,
            description: dayForm.description || null,
            image_url: dayForm.image_url || null,
          }),
        });
        toast({ title: "Hari ditambahkan!" });
      }
      fetchData();
      setIsDayOpen(false);
      resetDayForm();
    } catch (err: any) {
      toast({ title: "Gagal menyimpan hari", description: err?.message, variant: "destructive" });
    }
  };

  const handleEdit = (it: Itinerary) => {
    setEditing(it);
    setForm({
      departure_id: it.departure_id,
      title: it.title || "",
      notes: it.notes || "",
    });
    setIsOpen(true);
  };

  const handleEditDay = (day: ItineraryDay) => {
    setEditingDay(day);
    setDayForm({
      day_number: day.day_number,
      title: day.title || "",
      description: day.description || "",
      image_url: day.image_url || "",
    });
    setIsDayOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
    setDeleteType("itinerary");
  };

  const handleDeleteDay = (id: string) => {
    setDeleteTargetId(id);
    setDeleteType("day");
  };

  const executeDelete = async () => {
    if (!deleteTargetId) return;
    try {
      if (deleteType === "itinerary") {
        await apiFetch(`/api/admin/itineraries/${deleteTargetId}`, { method: "DELETE" });
        toast({ title: "Itinerary dihapus" });
        if (selectedItinerary?.id === deleteTargetId) setSelectedItinerary(null);
      } else {
        await apiFetch(`/api/admin/itineraries/days/${deleteTargetId}`, { method: "DELETE" });
        toast({ title: "Hari dihapus" });
      }
      fetchData();
    } catch (err: any) {
      toast({ title: "Gagal menghapus", description: err?.message, variant: "destructive" });
    }
    setDeleteTargetId(null);
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ departure_id: "", title: "", notes: "" });
  };

  // IT-F01: Copy-to-departure handler
  const handleCopyItinerary = async () => {
    if (!copySourceId || !copyTargetDep) {
      toast({ title: "Pilih keberangkatan tujuan terlebih dahulu", variant: "destructive" });
      return;
    }
    setCopying(true);
    try {
      const res = await apiFetch<{ id: string; departure_id: string; days_copied: number }>(
        `/api/admin/itineraries/${copySourceId}/copy-to-departure`,
        { method: "POST", body: JSON.stringify({ departure_id: copyTargetDep }) },
      );
      toast({ title: `Itinerary berhasil disalin! ${res.days_copied} hari disalin ke keberangkatan baru.` });
      fetchData();
      setCopySourceId(null);
      setCopyTargetDep("");
    } catch (err: any) {
      toast({ title: "Gagal menyalin itinerary", description: err?.message, variant: "destructive" });
    } finally {
      setCopying(false);
    }
  };

  const resetDayForm = () => {
    setEditingDay(null);
    setDayForm({ day_number: 1, title: "", description: "", image_url: "" });
    if (imgInputRef.current) imgInputRef.current.value = "";
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch<{ url: string }>("/api/admin/uploads/image", {
        method: "POST",
        body: fd,
      });
      setDayForm((prev) => ({ ...prev, image_url: res.url }));
      toast({ title: "Gambar berhasil diupload" });
    } catch (err: any) {
      toast({ title: "Gagal upload gambar", description: err?.message, variant: "destructive" });
    } finally {
      setUploadingImg(false);
      if (imgInputRef.current) imgInputRef.current.value = "";
    }
  };

  const openAddDay = (it: Itinerary) => {
    setSelectedItinerary(it);
    setDayForm({
      day_number: (it.days?.length || 0) + 1,
      title: "",
      description: "",
      image_url: "",
    });
    setIsDayOpen(true);
  };

  // ── DnD reorder ───────────────────────────────────────────────────────────

  const handleDragEnd = useCallback(
    async (event: DragEndEvent, itinerary: Itinerary) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = itinerary.days.findIndex((d) => d.id === active.id);
      const newIndex = itinerary.days.findIndex((d) => d.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      // Optimistic update: reorder locally and renumber
      const reordered = arrayMove(itinerary.days, oldIndex, newIndex).map(
        (day, idx) => ({ ...day, day_number: idx + 1 }),
      );

      setItineraries((prev) =>
        prev.map((it) =>
          it.id === itinerary.id ? { ...it, days: reordered } : it,
        ),
      );

      try {
        await apiFetch(`/api/admin/itineraries/${itinerary.id}/reorder-days`, {
          method: "PATCH",
          body: JSON.stringify({
            days: reordered.map((d) => ({ id: d.id, day_number: d.day_number })),
          }),
        });
      } catch (err: any) {
        toast({ title: "Gagal menyimpan urutan", description: err?.message, variant: "destructive" });
        fetchData(); // rollback on failure
      }
    },
    [toast],
  );

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <DeleteAlertDialog
        open={!!deleteTargetId}
        onOpenChange={() => setDeleteTargetId(null)}
        onConfirm={executeDelete}
        title="Hapus data ini?"
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Itinerary Builder</h1>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-primary">
              <Plus className="w-4 h-4 mr-2" /> Buat Itinerary
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Itinerary" : "Buat Itinerary Baru"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Keberangkatan *</Label>
                <Select
                  value={form.departure_id}
                  onValueChange={(val) => setForm({ ...form, departure_id: val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih keberangkatan" />
                  </SelectTrigger>
                  <SelectContent>
                    {departures.length === 0 && (
                      <SelectItem value="__none__" disabled>
                        Belum ada keberangkatan aktif
                      </SelectItem>
                    )}
                    {departures.map((dep) => (
                      <SelectItem key={dep.id} value={dep.id}>
                        {dep.package?.title ?? "—"} &mdash;{" "}
                        {safeFormatDate(dep.departure_date, "d MMM yyyy", { locale: localeId })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Judul Itinerary</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Contoh: Itinerary Standar"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Catatan</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                <Button type="submit" className="gradient-gold text-primary">Simpan</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* IT-F01: Copy-to-departure dialog */}
      <Dialog open={!!copySourceId} onOpenChange={(open) => { if (!open) { setCopySourceId(null); setCopyTargetDep(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salin Itinerary ke Keberangkatan Lain</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pilih keberangkatan tujuan. Semua hari dari itinerary ini akan disalin ke keberangkatan yang dipilih.
            </p>
            <div>
              <Label>Keberangkatan Tujuan *</Label>
              <Select value={copyTargetDep} onValueChange={setCopyTargetDep}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih keberangkatan..." />
                </SelectTrigger>
                <SelectContent>
                  {departures.map((dep) => (
                    <SelectItem key={dep.id} value={dep.id}>
                      {dep.package?.title ?? "—"} — {safeFormatDate(dep.departure_date, "d MMM yyyy", { locale: localeId })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setCopySourceId(null); setCopyTargetDep(""); }}>
                Batal
              </Button>
              <Button
                onClick={handleCopyItinerary}
                disabled={!copyTargetDep || copying}
                className="gradient-gold text-primary"
              >
                {copying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Copy className="w-4 h-4 mr-2" />}
                {copying ? "Menyalin..." : "Salin Itinerary"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Day Form Dialog */}
      <Dialog open={isDayOpen} onOpenChange={(open) => { setIsDayOpen(open); if (!open) resetDayForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDay ? "Edit Hari" : "Tambah Hari"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDaySubmit} className="space-y-4">
            <div>
              <Label>Hari Ke-</Label>
              <Input
                type="number"
                min="1"
                value={dayForm.day_number}
                onChange={(e) => setDayForm({ ...dayForm, day_number: parseInt(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Judul</Label>
              <Input
                value={dayForm.title}
                onChange={(e) => setDayForm({ ...dayForm, title: e.target.value })}
                placeholder="Contoh: Kedatangan di Madinah"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Deskripsi Kegiatan</Label>
              <Textarea
                value={dayForm.description}
                onChange={(e) => setDayForm({ ...dayForm, description: e.target.value })}
                className="mt-1"
                rows={4}
                placeholder="Deskripsi lengkap aktivitas hari ini..."
              />
            </div>
            <div>
              <Label>Gambar Hari (opsional)</Label>
              <input
                ref={imgInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
              />
              <div className="mt-1 space-y-2">
                <div className="flex gap-2 items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingImg}
                    onClick={() => imgInputRef.current?.click()}
                  >
                    {uploadingImg
                      ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      : <Upload className="w-4 h-4 mr-1" />}
                    {uploadingImg ? "Mengupload..." : "Pilih Gambar"}
                  </Button>
                  {dayForm.image_url && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDayForm({ ...dayForm, image_url: "" })}>
                      <X className="w-4 h-4" /> Hapus
                    </Button>
                  )}
                </div>
                <Input
                  value={dayForm.image_url}
                  onChange={(e) => setDayForm({ ...dayForm, image_url: e.target.value })}
                  placeholder="Atau tempel URL gambar langsung..."
                  className="text-sm"
                />
                {dayForm.image_url && (
                  <img src={dayForm.image_url} alt="Preview" className="rounded-lg object-cover h-28 w-full border" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDayOpen(false)}>Batal</Button>
              <Button type="submit" className="gradient-gold text-primary">Simpan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold" />
        </div>
      ) : itineraries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Belum ada itinerary</div>
      ) : (
        <div className="space-y-6">
          {itineraries.map((it) => (
            <Card key={it.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50 flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-gold" />
                    {it.title || "Itinerary"}
                  </CardTitle>
                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4" />
                    {it.departure?.package?.title ?? "—"} &mdash;{" "}
                    {safeFormatDate(it.departure?.departure_date, "d MMM yyyy", { locale: localeId })}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {/* IT-F02: Toggle preview mode */}
                  <Button
                    variant={previewId === it.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewId(previewId === it.id ? null : it.id)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    {previewId === it.id ? "Tutup Preview" : "Preview"}
                  </Button>
                  {/* IT-F01: Copy to another departure */}
                  <Button variant="outline" size="sm" onClick={() => { setCopySourceId(it.id); setCopyTargetDep(""); }}>
                    <Copy className="w-4 h-4 mr-1" /> Salin
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openAddDay(it)}>
                    <Plus className="w-4 h-4 mr-1" /> Tambah Hari
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(it)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(it.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {/* IT-F02: Preview mode — read-only tampilan jemaah */}
                {previewId === it.id ? (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                      Mode Preview — tampilan seperti yang dilihat jemaah
                    </p>
                    {it.days.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">Belum ada jadwal hari.</p>
                    ) : (
                      it.days.map((day) => (
                        <div key={day.id} className="border rounded-lg p-4">
                          <div className="font-bold text-gold mb-1">Hari {day.day_number} — {day.title || "—"}</div>
                          {day.image_url && (
                            <img src={day.image_url} alt={day.title ?? ""} className="rounded-lg h-32 object-cover w-full mb-2" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          )}
                          {day.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{day.description}</p>}
                        </div>
                      ))
                    )}
                  </div>
                ) : it.days.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Belum ada jadwal hari. Klik "Tambah Hari" untuk memulai.
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleDragEnd(e, it)}
                  >
                    <SortableContext
                      items={it.days.map((d) => d.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {it.days.map((day) => (
                          <SortableDayItem
                            key={day.id}
                            day={day}
                            onEdit={(d) => { setSelectedItinerary(it); handleEditDay(d); }}
                            onDelete={handleDeleteDay}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminItineraries;
