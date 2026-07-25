import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, BookOpen, Loader2, Save, X } from "lucide-react";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";

interface ItineraryDay {
  id: string;
  day_number: number;
  title: string | null;
  description: string | null;
  image_url: string | null;
}

interface Itinerary {
  id: string;
  title: string | null;
  notes: string | null;
  days: ItineraryDay[];
}

interface Props {
  departureId: string;
  departureLabel: string;
}

const DepartureItineraryPanel = ({ departureId, departureLabel }: Props) => {
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [toDeleteDay, setToDeleteDay] = useState<ItineraryDay | null>(null);

  // Add day form
  const [addingDay, setAddingDay] = useState(false);
  const [dayForm, setDayForm] = useState({ day_number: 1, title: "", description: "", image_url: "" });

  // Edit day
  const [editingDay, setEditingDay] = useState<ItineraryDay | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", image_url: "" });

  useEffect(() => {
    loadItinerary();
  }, [departureId]);

  const loadItinerary = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ itinerary: Itinerary | null }>(
        `/api/packages/itinerary/${encodeURIComponent(departureId)}`,
      );
      const itin = data?.itinerary ?? null;
      setItinerary(itin);
      if (itin) {
        setTitle(itin.title ?? "");
        setNotes(itin.notes ?? "");
        setDayForm((f) => ({ ...f, day_number: (itin.days.length || 0) + 1 }));
      }
    } catch {
      toast.error("Gagal memuat itinerary");
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/admin/itineraries", {
        method: "POST",
        body: JSON.stringify({
          departure_id: departureId,
          title: title || null,
          notes: notes || null,
        }),
      });
      toast.success("Itinerary dibuat");
      loadItinerary();
    } catch (e: any) {
      toast.error(e.message || "Gagal membuat itinerary");
    }
    setSaving(false);
  };

  const handleSaveMeta = async () => {
    if (!itinerary) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/itineraries/${itinerary.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: title || null, notes: notes || null }),
      });
      toast.success("Itinerary diperbarui");
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  const handleAddDay = async () => {
    if (!itinerary) return;
    setSaving(true);
    try {
      await apiFetch("/api/admin/itineraries/days", {
        method: "POST",
        body: JSON.stringify({
          itinerary_id: itinerary.id,
          day_number: dayForm.day_number,
          title: dayForm.title || null,
          description: dayForm.description || null,
          image_url: dayForm.image_url || null,
        }),
      });
      toast.success("Hari ditambahkan");
      setAddingDay(false);
      setDayForm((f) => ({ day_number: f.day_number + 1, title: "", description: "", image_url: "" }));
      loadItinerary();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  const handleEditDay = async () => {
    if (!editingDay) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/itineraries/days/${editingDay.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editForm.title || null,
          description: editForm.description || null,
          image_url: editForm.image_url || null,
        }),
      });
      toast.success("Hari diperbarui");
      setEditingDay(null);
      loadItinerary();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  const handleDeleteDay = async () => {
    if (!toDeleteDay) return;
    try {
      await apiFetch(`/api/admin/itineraries/days/${toDeleteDay.id}`, { method: "DELETE" });
      toast.success("Hari dihapus");
      loadItinerary();
    } catch (e: any) {
      toast.error(e.message);
    }
    setToDeleteDay(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground font-medium">{departureLabel}</p>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !itinerary ? (
        /* ── No itinerary yet ── */
        <div className="space-y-4">
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Belum ada itinerary untuk keberangkatan ini</p>
          </div>
          <div className="space-y-3 bg-muted/40 rounded-lg p-4">
            <p className="text-sm font-medium">Buat Itinerary Baru</p>
            <div>
              <Label className="text-xs">Judul Itinerary (opsional)</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Program Umroh 9 Hari"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Catatan (opsional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan program perjalanan"
                rows={2}
                className="mt-1"
              />
            </div>
            <Button onClick={handleCreate} disabled={saving} className="gradient-gold text-primary">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Buat Itinerary
            </Button>
          </div>
        </div>
      ) : (
        /* ── Itinerary exists ── */
        <div className="space-y-5">
          {/* Meta */}
          <div className="bg-muted/40 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Info Program</p>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={handleSaveMeta}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Simpan
              </Button>
            </div>
            <div>
              <Label className="text-xs">Judul</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Program Umroh 9 Hari"
                className="mt-1 h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Catatan</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1"
                placeholder="Misal: Jadwal dapat berubah sesuai kondisi"
              />
            </div>
          </div>

          {/* Days */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">{itinerary.days.length} Hari Program</p>
              <Button
                size="sm"
                className="h-7 text-xs gap-1 gradient-gold text-primary"
                onClick={() => setAddingDay(true)}
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Hari
              </Button>
            </div>

            {itinerary.days.length === 0 && !addingDay && (
              <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                <p className="text-sm">Belum ada hari program. Klik "Tambah Hari" untuk mulai.</p>
              </div>
            )}

            <div className="space-y-2">
              {itinerary.days.map((day) => (
                <div key={day.id} className="border border-border rounded-lg overflow-hidden bg-card">
                  {editingDay?.id === day.id ? (
                    /* ── Edit form ── */
                    <div className="p-4 space-y-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold">Edit Hari {day.day_number}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setEditingDay(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div>
                        <Label className="text-xs">Judul</Label>
                        <Input
                          value={editForm.title}
                          onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                          placeholder="Contoh: Tiba di Madinah"
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Deskripsi Program</Label>
                        <Textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                          rows={4}
                          className="mt-1 text-sm"
                          placeholder="Detail kegiatan hari ini..."
                        />
                      </div>
                      <div>
                        <Label className="text-xs">URL Foto (opsional)</Label>
                        <Input
                          value={editForm.image_url}
                          onChange={(e) => setEditForm((f) => ({ ...f, image_url: e.target.value }))}
                          placeholder="https://..."
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="gradient-gold text-primary"
                          onClick={handleEditDay}
                          disabled={saving}
                        >
                          {saving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                          ) : (
                            <Save className="w-3.5 h-3.5 mr-1" />
                          )}
                          Simpan
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingDay(null)}>
                          Batal
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ── Day row ── */
                    <div className="flex items-start gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-gold">{day.day_number}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-tight">
                          {day.title ? (
                            day.title
                          ) : (
                            <span className="text-muted-foreground font-normal italic">Tanpa judul</span>
                          )}
                        </p>
                        {day.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-line">
                            {day.description}
                          </p>
                        )}
                        {day.image_url && (
                          <a
                            href={day.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary mt-1 truncate block hover:underline"
                          >
                            📷 Foto terlampir
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Edit hari"
                          onClick={() => {
                            setEditingDay(day);
                            setEditForm({
                              title: day.title ?? "",
                              description: day.description ?? "",
                              image_url: day.image_url ?? "",
                            });
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          title="Hapus hari"
                          onClick={() => setToDeleteDay(day)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* ── Add day inline form ── */}
              {addingDay && (
                <div className="border border-primary/40 rounded-lg p-4 space-y-3 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-primary">Tambah Hari Baru</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setAddingDay(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nomor Hari</Label>
                      <Input
                        type="number"
                        value={dayForm.day_number}
                        onChange={(e) =>
                          setDayForm((f) => ({ ...f, day_number: parseInt(e.target.value) || 1 }))
                        }
                        className="mt-1 h-8 text-sm"
                        min={1}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Judul</Label>
                      <Input
                        value={dayForm.title}
                        onChange={(e) => setDayForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="Contoh: Tiba di Madinah"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Deskripsi Program</Label>
                    <Textarea
                      value={dayForm.description}
                      onChange={(e) => setDayForm((f) => ({ ...f, description: e.target.value }))}
                      rows={4}
                      className="mt-1 text-sm"
                      placeholder="Detail kegiatan hari ini..."
                    />
                  </div>
                  <div>
                    <Label className="text-xs">URL Foto (opsional)</Label>
                    <Input
                      value={dayForm.image_url}
                      onChange={(e) => setDayForm((f) => ({ ...f, image_url: e.target.value }))}
                      placeholder="https://..."
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="gradient-gold text-primary"
                      onClick={handleAddDay}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      ) : (
                        <Plus className="w-3.5 h-3.5 mr-1" />
                      )}
                      Tambahkan
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setAddingDay(false)}>
                      Batal
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <DeleteAlertDialog
        open={!!toDeleteDay}
        onOpenChange={(o) => !o && setToDeleteDay(null)}
        onConfirm={handleDeleteDay}
        title={`Hapus Hari ${toDeleteDay?.day_number}?`}
        description="Program hari ini akan dihapus dari itinerary secara permanen."
      />
    </div>
  );
};

export default DepartureItineraryPanel;
