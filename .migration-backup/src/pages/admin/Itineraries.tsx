import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GripVertical, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import DeleteAlertDialog from "@/components/admin/DeleteAlertDialog";

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

  const fetchData = async () => {
    const [itinerariesRes, departuresRes] = await Promise.all([
      supabase
        .from("itineraries")
        .select(`
          *,
          departure:package_departures(id, departure_date, package:packages(title)),
          days:itinerary_days(*)
        `)
        .order("created_at", { ascending: false }),
      supabase
        .from("package_departures")
        .select("id, departure_date, package:packages(title)")
        .eq("status", "active")
        .order("departure_date", { ascending: true }),
    ]);

    const itinerariesData = (itinerariesRes.data || []).map((it: any) => ({
      ...it,
      days: (it.days || []).sort((a: ItineraryDay, b: ItineraryDay) => a.day_number - b.day_number),
    }));

    setItineraries(itinerariesData);
    setDepartures((departuresRes.data as unknown as Departure[]) || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editing) {
      const { error } = await supabase
        .from("itineraries")
        .update({
          departure_id: form.departure_id,
          title: form.title || null,
          notes: form.notes || null,
        })
        .eq("id", editing.id);

      if (error) {
        toast({ title: "Gagal mengupdate", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Itinerary diupdate!" });
        fetchData();
        setIsOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase.from("itineraries").insert({
        departure_id: form.departure_id,
        title: form.title || null,
        notes: form.notes || null,
      });

      if (error) {
        toast({ title: "Gagal membuat itinerary", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Itinerary ditambahkan!" });
        fetchData();
        setIsOpen(false);
        resetForm();
      }
    }
  };

  const handleDaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItinerary) return;

    if (editingDay) {
      const { error } = await supabase
        .from("itinerary_days")
        .update({
          day_number: dayForm.day_number,
          title: dayForm.title || null,
          description: dayForm.description || null,
          image_url: dayForm.image_url || null,
        })
        .eq("id", editingDay.id);

      if (error) {
        toast({ title: "Gagal mengupdate", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Hari diupdate!" });
        fetchData();
        setIsDayOpen(false);
        resetDayForm();
      }
    } else {
      const { error } = await supabase.from("itinerary_days").insert({
        itinerary_id: selectedItinerary.id,
        day_number: dayForm.day_number,
        title: dayForm.title || null,
        description: dayForm.description || null,
        image_url: dayForm.image_url || null,
      });

      if (error) {
        toast({ title: "Gagal menambahkan hari", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Hari ditambahkan!" });
        fetchData();
        setIsDayOpen(false);
        resetDayForm();
      }
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

  const handleDelete = async (id: string) => {
    setDeleteTargetId(id);
    setDeleteType("itinerary");
  };

  const handleDeleteDay = async (id: string) => {
    setDeleteTargetId(id);
    setDeleteType("day");
  };

  const executeDelete = async () => {
    if (!deleteTargetId) return;
    if (deleteType === "itinerary") {
      const { error } = await supabase.from("itineraries").delete().eq("id", deleteTargetId);
      if (error) {
        toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Itinerary dihapus" });
        fetchData();
        if (selectedItinerary?.id === deleteTargetId) setSelectedItinerary(null);
      }
    } else {
      const { error } = await supabase.from("itinerary_days").delete().eq("id", deleteTargetId);
      if (error) {
        toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Hari dihapus" });
        fetchData();
      }
    }
    setDeleteTargetId(null);
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ departure_id: "", title: "", notes: "" });
  };

  const resetDayForm = () => {
    setEditingDay(null);
    setDayForm({ day_number: 1, title: "", description: "", image_url: "" });
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

  return (
    <div>
      <DeleteAlertDialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)} onConfirm={() => { executeDelete(); }} title="Hapus data ini?" />
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
                <Select value={form.departure_id} onValueChange={(val) => setForm({ ...form, departure_id: val })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih keberangkatan" />
                  </SelectTrigger>
                  <SelectContent>
                    {departures.map((dep) => (
                      <SelectItem key={dep.id} value={dep.id}>
                        {dep.package?.title} - {format(new Date(dep.departure_date), "d MMM yyyy", { locale: localeId })}
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
              <Label>URL Gambar (opsional)</Label>
              <Input
                value={dayForm.image_url}
                onChange={(e) => setDayForm({ ...dayForm, image_url: e.target.value })}
                placeholder="https://..."
                className="mt-1"
              />
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
        </div>
      ) : itineraries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Belum ada itinerary</div>
      ) : (
        <div className="space-y-6">
          {itineraries.map((it) => {
            // Refresh selected if data changed
            const currentData = selectedItinerary?.id === it.id ? it : null;

            return (
              <Card key={it.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50 flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-gold" />
                      {it.title || "Itinerary"}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4" />
                      {it.departure?.package?.title} -{" "}
                      {format(new Date(it.departure?.departure_date || ""), "d MMM yyyy", { locale: localeId })}
                    </div>
                  </div>
                  <div className="flex gap-2">
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
                  {it.days.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Belum ada jadwal hari. Klik "Tambah Hari" untuk memulai.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {it.days.map((day) => (
                        <div
                          key={day.id}
                          className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <GripVertical className="w-4 h-4" />
                            <span className="w-16 font-bold text-gold">Hari {day.day_number}</span>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold">{day.title || "-"}</div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{day.description}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedItinerary(it); handleEditDay(day); }}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteDay(day.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminItineraries;
