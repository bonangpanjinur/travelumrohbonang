import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Airport {
  id: string;
  name: string;
  city: string | null;
  code: string | null;
}

const AdminAirports = () => {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Airport | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({ name: "", city: "", code: "" });

  useEffect(() => {
    fetchAirports();
  }, []);

  const fetchAirports = async () => {
    const { data } = await supabase.from("airports").select("*").order("name");
    setAirports(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await supabase.from("airports").update(form).eq("id", editing.id);
      toast({ title: "Bandara diupdate!" });
    } else {
      await supabase.from("airports").insert(form);
      toast({ title: "Bandara ditambahkan!" });
    }
    fetchAirports();
    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (airport: Airport) => {
    setEditing(airport);
    setForm({ name: airport.name, city: airport.city || "", code: airport.code || "" });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin?")) return;
    await supabase.from("airports").delete().eq("id", id);
    toast({ title: "Bandara dihapus" });
    fetchAirports();
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ name: "", city: "", code: "" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Bandara</h1>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-primary"><Plus className="w-4 h-4 mr-2" /> Tambah</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Bandara" : "Tambah Bandara"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nama Bandara *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" />
              </div>
              <div>
                <Label>Kota</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Kode (CGK, SUB, dll)</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="mt-1" />
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
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div></div>
      ) : airports.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Belum ada bandara</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Bandara</TableHead>
                <TableHead>Kota</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {airports.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-semibold">{a.name}</TableCell>
                  <TableCell>{a.city || "-"}</TableCell>
                  <TableCell>{a.code || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(a)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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

export default AdminAirports;
