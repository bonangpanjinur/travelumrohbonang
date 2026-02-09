import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Airline {
  id: string;
  name: string;
  logo_url: string | null;
}

const AdminAirlines = () => {
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Airline | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({ name: "", logo_url: "" });

  useEffect(() => {
    fetchAirlines();
  }, []);

  const fetchAirlines = async () => {
    const { data } = await supabase.from("airlines").select("*").order("name");
    setAirlines(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editing) {
      const { error } = await supabase.from("airlines").update(form).eq("id", editing.id);
      if (!error) {
        toast({ title: "Maskapai diupdate!" });
        fetchAirlines();
        setIsOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase.from("airlines").insert(form);
      if (!error) {
        toast({ title: "Maskapai ditambahkan!" });
        fetchAirlines();
        setIsOpen(false);
        resetForm();
      }
    }
  };

  const handleEdit = (airline: Airline) => {
    setEditing(airline);
    setForm({ name: airline.name, logo_url: airline.logo_url || "" });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus?")) return;
    await supabase.from("airlines").delete().eq("id", id);
    toast({ title: "Maskapai dihapus" });
    fetchAirlines();
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ name: "", logo_url: "" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Maskapai</h1>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-primary"><Plus className="w-4 h-4 mr-2" /> Tambah</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Maskapai" : "Tambah Maskapai"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nama Maskapai *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" />
              </div>
              <div>
                <Label>Logo URL</Label>
                <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." className="mt-1" />
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
      ) : airlines.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Belum ada maskapai</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Maskapai</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {airlines.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-semibold">{a.name}</TableCell>
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

export default AdminAirlines;
