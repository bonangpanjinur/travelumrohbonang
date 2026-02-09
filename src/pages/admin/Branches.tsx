import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
}

const AdminBranches = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({ name: "", address: "", phone: "" });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    const { data } = await supabase.from("branches").select("*").order("name");
    setBranches(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await supabase.from("branches").update(form).eq("id", editing.id);
      toast({ title: "Cabang diupdate!" });
    } else {
      await supabase.from("branches").insert(form);
      toast({ title: "Cabang ditambahkan!" });
    }
    fetchBranches();
    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (branch: Branch) => {
    setEditing(branch);
    setForm({ name: branch.name, address: branch.address || "", phone: branch.phone || "" });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin?")) return;
    await supabase.from("branches").delete().eq("id", id);
    toast({ title: "Cabang dihapus" });
    fetchBranches();
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ name: "", address: "", phone: "" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Cabang</h1>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-primary"><Plus className="w-4 h-4 mr-2" /> Tambah</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Cabang" : "Tambah Cabang"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nama Cabang *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" />
              </div>
              <div>
                <Label>Alamat</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Telepon</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
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
      ) : branches.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Belum ada cabang</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Cabang</TableHead>
                <TableHead>Alamat</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-semibold">{b.name}</TableCell>
                  <TableCell>{b.address || "-"}</TableCell>
                  <TableCell>{b.phone || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(b)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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

export default AdminBranches;
