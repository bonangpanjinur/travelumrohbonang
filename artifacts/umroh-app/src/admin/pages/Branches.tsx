import { useEffect, useState } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/shared/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import DeleteAlertDialog from "@/admin/components/DeleteAlertDialog";

interface Branch {
  id: string;
  name: string;
  slug: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: string | null;
  image_url: string | null;
  map_url: string | null;
  description: string | null;
  is_active: boolean;
}

const empty = {
  name: "",
  slug: "",
  address: "",
  phone: "",
  email: "",
  city: "",
  region: "",
  postal_code: "",
  country: "ID",
  latitude: "",
  longitude: "",
  opening_hours: "",
  image_url: "",
  map_url: "",
  description: "",
};

const AdminBranches = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const { toast } = useToast();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...empty });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    const { data } = await supabase.from("branches").select("*").order("name");
    setBranches((data as Branch[]) || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      name: form.name,
      slug: form.slug || null,
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      city: form.city || null,
      region: form.region || null,
      postal_code: form.postal_code || null,
      country: form.country || "ID",
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      opening_hours: form.opening_hours || null,
      image_url: form.image_url || null,
      map_url: form.map_url || null,
      description: form.description || null,
    };
    if (editing) {
      await supabase.from("branches").update(payload as any).eq("id", editing.id);
      toast({ title: "Cabang diupdate!" });
    } else {
      await supabase.from("branches").insert(payload as any);
      toast({ title: "Cabang ditambahkan!" });
    }
    fetchBranches();
    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (b: Branch) => {
    setEditing(b);
    setForm({
      name: b.name || "",
      slug: b.slug || "",
      address: b.address || "",
      phone: b.phone || "",
      email: b.email || "",
      city: b.city || "",
      region: b.region || "",
      postal_code: b.postal_code || "",
      country: b.country || "ID",
      latitude: b.latitude != null ? String(b.latitude) : "",
      longitude: b.longitude != null ? String(b.longitude) : "",
      opening_hours: b.opening_hours || "",
      image_url: b.image_url || "",
      map_url: b.map_url || "",
      description: b.description || "",
    });
    setIsOpen(true);
  };

  const executeDelete = async (id: string) => {
    await supabase.from("branches").delete().eq("id", id);
    toast({ title: "Cabang dihapus" });
    fetchBranches();
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ ...empty });
  };

  return (
    <div>
      <DeleteAlertDialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)} onConfirm={() => { if (deleteTargetId) executeDelete(deleteTargetId); setDeleteTargetId(null); }} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Cabang</h1>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-primary"><Plus className="w-4 h-4 mr-2" /> Tambah</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Cabang" : "Tambah Cabang"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nama Cabang *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" />
                </div>
                <div>
                  <Label>Slug (SEO URL)</Label>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="jakarta-pusat" className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Alamat (jalan)</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Kota</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Provinsi</Label>
                  <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Kode Pos</Label>
                  <Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Negara (ISO)</Label>
                  <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="ID" className="mt-1" />
                </div>
                <div>
                  <Label>Latitude</Label>
                  <Input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="-6.2088" className="mt-1" />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="106.8456" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Telepon</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Jam Operasional (format schema.org)</Label>
                <Input value={form.opening_hours} onChange={(e) => setForm({ ...form, opening_hours: e.target.value })} placeholder="Mo-Sa 09:00-17:00" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>URL Gambar</Label>
                  <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>URL Google Maps</Label>
                  <Input value={form.map_url} onChange={(e) => setForm({ ...form, map_url: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Deskripsi singkat</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" rows={3} />
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
                <TableHead>Kota</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-semibold">{b.name}</TableCell>
                  <TableCell>{b.city || "-"}</TableCell>
                  <TableCell>{b.phone || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{b.slug || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(b)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTargetId(b.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
