import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import PackageCommissions from "@/components/admin/PackageCommissions";

interface Package {
  id: string;
  title: string;
  slug: string;
  description: string;
  package_type: string;
  duration_days: number;
  minimum_dp: number;
  dp_deadline_days: number;
  full_deadline_days: number;
  is_active: boolean;
  created_at: string;
}

const AdminPackages = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [expandedCommission, setExpandedCommission] = useState<string | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    package_type: "",
    duration_days: 9,
    minimum_dp: 0,
    dp_deadline_days: 30,
    full_deadline_days: 7,
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    const { data } = await supabase
      .from("packages")
      .select("*")
      .order("created_at", { ascending: false });
    setPackages(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const slug = form.slug || form.title.toLowerCase().replace(/\s+/g, "-");

    if (editing) {
      const { error } = await supabase
        .from("packages")
        .update({ ...form, slug })
        .eq("id", editing.id);

      if (error) {
        toast({ title: "Gagal mengupdate", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Paket diupdate!" });
        fetchPackages();
        setIsOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase.from("packages").insert({ ...form, slug });

      if (error) {
        toast({ title: "Gagal membuat paket", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Paket ditambahkan!" });
        fetchPackages();
        setIsOpen(false);
        resetForm();
      }
    }
  };

  const handleEdit = (pkg: Package) => {
    setEditing(pkg);
    setForm({
      title: pkg.title,
      slug: pkg.slug,
      description: pkg.description || "",
      package_type: pkg.package_type || "",
      duration_days: pkg.duration_days,
      minimum_dp: pkg.minimum_dp || 0,
      dp_deadline_days: pkg.dp_deadline_days || 30,
      full_deadline_days: pkg.full_deadline_days || 7,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus paket ini?")) return;

    const { error } = await supabase.from("packages").delete().eq("id", id);
    if (error) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Paket dihapus" });
      fetchPackages();
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ title: "", slug: "", description: "", package_type: "", duration_days: 9, minimum_dp: 0, dp_deadline_days: 30, full_deadline_days: 7 });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Paket</h1>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-primary">
              <Plus className="w-4 h-4 mr-2" /> Tambah Paket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Paket" : "Tambah Paket Baru"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nama Paket *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="auto-generated jika kosong"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Tipe Paket</Label>
                <Input
                  value={form.package_type}
                  onChange={(e) => setForm({ ...form, package_type: e.target.value })}
                  placeholder="VIP, Reguler, Hemat"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Durasi (hari)</Label>
                <Input
                  type="number"
                  value={form.duration_days}
                  onChange={(e) => setForm({ ...form, duration_days: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Minimal DP (Rp)</Label>
                <Input
                  type="number"
                  value={form.minimum_dp}
                  onChange={(e) => setForm({ ...form, minimum_dp: parseInt(e.target.value) || 0 })}
                  placeholder="0 = tidak ada minimal DP"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Deadline DP (hari sebelum berangkat)</Label>
                  <Input
                    type="number"
                    value={form.dp_deadline_days}
                    onChange={(e) => setForm({ ...form, dp_deadline_days: parseInt(e.target.value) || 30 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Deadline Pelunasan (hari sebelum berangkat)</Label>
                  <Input
                    type="number"
                    value={form.full_deadline_days}
                    onChange={(e) => setForm({ ...form, full_deadline_days: parseInt(e.target.value) || 7 })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label>Deskripsi</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
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

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Belum ada paket</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Paket</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Durasi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => (
                <React.Fragment key={pkg.id}>
                  <TableRow>
                    <TableCell className="font-semibold">{pkg.title}</TableCell>
                    <TableCell>{pkg.package_type || "-"}</TableCell>
                    <TableCell>{pkg.duration_days} hari</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${pkg.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                        {pkg.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setExpandedCommission(expandedCommission === pkg.id ? null : pkg.id)}
                          title="Komisi"
                        >
                          {expandedCommission === pkg.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                        <Link to={`/paket/${pkg.slug}`} target="_blank">
                          <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(pkg)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(pkg.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedCommission === pkg.id && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-muted/50 p-4">
                        <PackageCommissions packageId={pkg.id} packageTitle={pkg.title} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminPackages;
