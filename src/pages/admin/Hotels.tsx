import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Star } from "lucide-react";

interface Hotel {
  id: string;
  name: string;
  city: string;
  star: number;
}

const AdminHotels = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Hotel | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({ name: "", city: "", star: 5 });

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    const { data } = await supabase.from("hotels").select("*").order("name");
    setHotels(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editing) {
      const { error } = await supabase.from("hotels").update(form).eq("id", editing.id);
      if (error) {
        toast({ title: "Gagal mengupdate", variant: "destructive" });
      } else {
        toast({ title: "Hotel diupdate!" });
        fetchHotels();
        setIsOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase.from("hotels").insert(form);
      if (error) {
        toast({ title: "Gagal menambahkan", variant: "destructive" });
      } else {
        toast({ title: "Hotel ditambahkan!" });
        fetchHotels();
        setIsOpen(false);
        resetForm();
      }
    }
  };

  const handleEdit = (hotel: Hotel) => {
    setEditing(hotel);
    setForm({ name: hotel.name, city: hotel.city || "", star: hotel.star || 5 });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus hotel ini?")) return;
    await supabase.from("hotels").delete().eq("id", id);
    toast({ title: "Hotel dihapus" });
    fetchHotels();
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ name: "", city: "", star: 5 });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Hotel</h1>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-primary">
              <Plus className="w-4 h-4 mr-2" /> Tambah Hotel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Hotel" : "Tambah Hotel"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nama Hotel *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" />
              </div>
              <div>
                <Label>Kota</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Makkah / Madinah" className="mt-1" />
              </div>
              <div>
                <Label>Bintang</Label>
                <Input type="number" min={1} max={5} value={form.star} onChange={(e) => setForm({ ...form, star: parseInt(e.target.value) })} className="mt-1" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                <Button type="submit" className="gradient-gold text-primary">Simpan</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
        </div>
      ) : hotels.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Belum ada hotel</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Hotel</TableHead>
                <TableHead>Kota</TableHead>
                <TableHead>Bintang</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hotels.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-semibold">{h.name}</TableCell>
                  <TableCell>{h.city || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-0.5">
                      {[...Array(h.star || 0)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-gold text-gold" />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(h)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(h.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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

export default AdminHotels;
