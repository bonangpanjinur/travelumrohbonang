import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  category_id: string | null;
  hotel_makkah_id: string | null;
  hotel_madinah_id: string | null;
  airline_id: string | null;
  airport_id: string | null;
}

interface Option { id: string; name: string; }

const AdminPackages = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [expandedCommission, setExpandedCommission] = useState<string | null>(null);
  const { toast } = useToast();

  const [categories, setCategories] = useState<Option[]>([]);
  const [hotels, setHotels] = useState<(Option & { city: string | null })[]>([]);
  const [airlines, setAirlines] = useState<Option[]>([]);
  const [airports, setAirports] = useState<(Option & { code: string | null })[]>([]);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    package_type: "",
    duration_days: 9,
    minimum_dp: 0,
    dp_deadline_days: 30,
    full_deadline_days: 7,
    category_id: "",
    hotel_makkah_id: "",
    hotel_madinah_id: "",
    airline_id: "",
    airport_id: "",
  });

  useEffect(() => {
    fetchPackages();
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    const [catRes, hotelRes, airlineRes, airportRes] = await Promise.all([
      supabase.from("package_categories").select("id, name").order("sort_order"),
      supabase.from("hotels").select("id, name, city").order("name"),
      supabase.from("airlines").select("id, name").order("name"),
      supabase.from("airports").select("id, name, code").order("name"),
    ]);
    setCategories(catRes.data || []);
    setHotels(hotelRes.data || []);
    setAirlines(airlineRes.data || []);
    setAirports(airportRes.data || []);
  };

  const fetchPackages = async () => {
    const { data } = await supabase
      .from("packages")
      .select("*")
      .order("created_at", { ascending: false });
    setPackages(data || []);
    setLoading(false);
  };

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      title: form.title,
      slug: form.slug || form.title.toLowerCase().replace(/\s+/g, "-"),
      description: form.description || null,
      package_type: form.package_type || null,
      duration_days: form.duration_days,
      category_id: form.category_id || null,
      hotel_makkah_id: form.hotel_makkah_id || null,
      hotel_madinah_id: form.hotel_madinah_id || null,
      airline_id: form.airline_id || null,
      airport_id: form.airport_id || null,
    };
    if (form.minimum_dp !== 0) payload.minimum_dp = form.minimum_dp;
    if (form.dp_deadline_days !== 30) payload.dp_deadline_days = form.dp_deadline_days;
    if (form.full_deadline_days !== 7) payload.full_deadline_days = form.full_deadline_days;
    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();

    if (editing) {
      const { error } = await supabase.from("packages").update(payload as any).eq("id", editing.id);
      if (error) {
        toast({ title: "Gagal mengupdate", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Paket diupdate!" });
        fetchPackages();
        setIsOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase.from("packages").insert(payload as any);
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
      category_id: pkg.category_id || "",
      hotel_makkah_id: pkg.hotel_makkah_id || "",
      hotel_madinah_id: pkg.hotel_madinah_id || "",
      airline_id: pkg.airline_id || "",
      airport_id: pkg.airport_id || "",
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
    setForm({ title: "", slug: "", description: "", package_type: "", duration_days: 9, minimum_dp: 0, dp_deadline_days: 30, full_deadline_days: 7, category_id: "", hotel_makkah_id: "", hotel_madinah_id: "", airline_id: "", airport_id: "" });
  };

  const makkahHotels = hotels.filter(h => h.city === "Makkah");
  const madinahHotels = hotels.filter(h => h.city === "Madinah");

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
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Paket" : "Tambah Paket Baru"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nama Paket *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="mt-1" />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated jika kosong" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kategori</Label>
                  <Select value={form.category_id || undefined} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {categories.filter(c => c.id).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipe Paket</Label>
                  <Input value={form.package_type} onChange={(e) => setForm({ ...form, package_type: e.target.value })} placeholder="VIP, Reguler, Hemat" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Hotel Makkah</Label>
                  <Select value={form.hotel_makkah_id || undefined} onValueChange={(v) => setForm({ ...form, hotel_makkah_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Hotel" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {makkahHotels.filter(h => h.id).map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Hotel Madinah</Label>
                  <Select value={form.hotel_madinah_id || undefined} onValueChange={(v) => setForm({ ...form, hotel_madinah_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Hotel" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {madinahHotels.filter(h => h.id).map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Maskapai</Label>
                  <Select value={form.airline_id || undefined} onValueChange={(v) => setForm({ ...form, airline_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Maskapai" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {airlines.filter(a => a.id).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Bandara</Label>
                  <Select value={form.airport_id || undefined} onValueChange={(v) => setForm({ ...form, airport_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Bandara" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {airports.filter(a => a.id).map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.code})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Durasi (hari)</Label>
                <Input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: parseInt(e.target.value) })} className="mt-1" />
              </div>
              <div>
                <Label>Minimal DP (Rp)</Label>
                <Input type="number" value={form.minimum_dp} onChange={(e) => setForm({ ...form, minimum_dp: parseInt(e.target.value) || 0 })} placeholder="0 = tidak ada minimal DP" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Deadline DP (hari)</Label>
                  <Input type="number" value={form.dp_deadline_days} onChange={(e) => setForm({ ...form, dp_deadline_days: parseInt(e.target.value) || 30 })} className="mt-1" />
                </div>
                <div>
                  <Label>Deadline Pelunasan (hari)</Label>
                  <Input type="number" value={form.full_deadline_days} onChange={(e) => setForm({ ...form, full_deadline_days: parseInt(e.target.value) || 7 })} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Deskripsi</Label>
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
                        <Button variant="ghost" size="icon" onClick={() => setExpandedCommission(expandedCommission === pkg.id ? null : pkg.id)} title="Komisi">
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
