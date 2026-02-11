import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Calendar, Users, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Package {
  id: string;
  title: string;
}

interface Muthawif {
  id: string;
  name: string;
}

interface Departure {
  id: string;
  package_id: string;
  departure_date: string;
  return_date: string | null;
  quota: number;
  remaining_quota: number;
  status: string;
  muthawif_id: string | null;
  package: Package | null;
  prices: DeparturePrice[];
}

interface DeparturePrice {
  id: string;
  room_type: string;
  price: number;
}

const ROOM_TYPES = ["quad", "triple", "double"];

const AdminDepartures = () => {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [muthawifs, setMuthawifs] = useState<Muthawif[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Departure | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    package_id: "",
    departure_date: "",
    return_date: "",
    quota: 45,
    status: "active",
    muthawif_id: "",
    prices: {
      quad: 0,
      triple: 0,
      double: 0,
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [departuresRes, packagesRes, muthawifRes] = await Promise.all([
      supabase
        .from("package_departures")
        .select(`
          *,
          package:packages(id, title),
          prices:departure_prices(id, room_type, price)
        `)
        .order("departure_date", { ascending: true }),
      supabase.from("packages").select("id, title").eq("is_active", true),
      supabase.from("muthawifs").select("id, name").order("name"),
    ]);

    setDepartures((departuresRes.data as unknown as Departure[]) || []);
    setPackages(packagesRes.data || []);
    setMuthawifs(muthawifRes.data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editing) {
      // Update departure
      // Calculate remaining_quota adjustment: only change if quota changed
      const quotaDiff = form.quota - editing.quota;
      const newRemainingQuota = editing.remaining_quota + quotaDiff;

      const { error } = await supabase
        .from("package_departures")
        .update({
          package_id: form.package_id,
          departure_date: form.departure_date,
          return_date: form.return_date || null,
          quota: form.quota,
          remaining_quota: newRemainingQuota,
          status: form.status,
          muthawif_id: form.muthawif_id || null,
        })
        .eq("id", editing.id);

      if (error) {
        toast({ title: "Gagal mengupdate", description: error.message, variant: "destructive" });
        return;
      }

      // Update prices
      for (const roomType of ROOM_TYPES) {
        const price = form.prices[roomType as keyof typeof form.prices];
        const existingPrice = editing.prices.find((p) => p.room_type === roomType);

        if (existingPrice) {
          await supabase.from("departure_prices").update({ price }).eq("id", existingPrice.id);
        } else {
          await supabase.from("departure_prices").insert({
            departure_id: editing.id,
            room_type: roomType,
            price,
          });
        }
      }

      toast({ title: "Keberangkatan diupdate!" });
    } else {
      // Create departure
      const { data, error } = await supabase
        .from("package_departures")
        .insert({
          package_id: form.package_id,
          departure_date: form.departure_date,
          return_date: form.return_date || null,
          quota: form.quota,
          remaining_quota: form.quota,
          status: form.status,
          muthawif_id: form.muthawif_id || null,
        })
        .select()
        .single();

      if (error) {
        toast({ title: "Gagal membuat keberangkatan", description: error.message, variant: "destructive" });
        return;
      }

      // Create prices
      const pricesData = ROOM_TYPES.map((roomType) => ({
        departure_id: data.id,
        room_type: roomType,
        price: form.prices[roomType as keyof typeof form.prices],
      }));

      await supabase.from("departure_prices").insert(pricesData);
      toast({ title: "Keberangkatan ditambahkan!" });
    }

    fetchData();
    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (dep: Departure) => {
    setEditing(dep);
    const priceMap = { quad: 0, triple: 0, double: 0 };
    dep.prices.forEach((p) => {
      priceMap[p.room_type as keyof typeof priceMap] = p.price;
    });

    setForm({
      package_id: dep.package_id,
      departure_date: dep.departure_date,
      return_date: dep.return_date || "",
      quota: dep.quota,
      status: dep.status || "active",
      muthawif_id: dep.muthawif_id || "",
      prices: priceMap,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus keberangkatan ini?")) return;

    await supabase.from("departure_prices").delete().eq("departure_id", id);
    const { error } = await supabase.from("package_departures").delete().eq("id", id);

    if (error) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Keberangkatan dihapus" });
      fetchData();
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      package_id: "",
      departure_date: "",
      return_date: "",
      quota: 45,
      status: "active",
      muthawif_id: "",
      prices: { quad: 0, triple: 0, double: 0 },
    });
  };

  const formatPrice = (price: number) => `Rp ${price.toLocaleString("id-ID")}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Keberangkatan</h1>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-primary">
              <Plus className="w-4 h-4 mr-2" /> Tambah Keberangkatan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Keberangkatan" : "Tambah Keberangkatan Baru"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Paket *</Label>
                <Select value={form.package_id} onValueChange={(val) => setForm({ ...form, package_id: val })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih paket" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>{pkg.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tanggal Berangkat *</Label>
                  <Input
                    type="date"
                    value={form.departure_date}
                    onChange={(e) => setForm({ ...form, departure_date: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Tanggal Pulang</Label>
                  <Input
                    type="date"
                    value={form.return_date}
                    onChange={(e) => setForm({ ...form, return_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kuota</Label>
                  <Input
                    type="number"
                    value={form.quota}
                    onChange={(e) => setForm({ ...form, quota: parseInt(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="closed">Ditutup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Muthawif</Label>
                <Select value={form.muthawif_id} onValueChange={(val) => setForm({ ...form, muthawif_id: val })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih muthawif (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {muthawifs.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4" /> Harga per Tipe Kamar
                </Label>
                <div className="space-y-3">
                  {ROOM_TYPES.map((type) => (
                    <div key={type} className="flex items-center gap-3">
                      <Label className="w-20 capitalize">{type}</Label>
                      <Input
                        type="number"
                        value={form.prices[type as keyof typeof form.prices]}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            prices: { ...form.prices, [type]: parseInt(e.target.value) || 0 },
                          })
                        }
                        placeholder="Harga"
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
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
      ) : departures.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Belum ada keberangkatan</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paket</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Kuota</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departures.map((dep) => (
                <TableRow key={dep.id}>
                  <TableCell className="font-semibold">{dep.package?.title || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {format(new Date(dep.departure_date), "d MMM yyyy", { locale: localeId })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      {dep.remaining_quota}/{dep.quota}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm space-y-1">
                      {dep.prices.map((p) => (
                        <div key={p.id} className="flex gap-2">
                          <span className="capitalize text-muted-foreground w-12">{p.room_type}:</span>
                          <span>{formatPrice(p.price)}</span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      dep.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}>
                      {dep.status === "active" ? "Aktif" : "Ditutup"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(dep)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(dep.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
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

export default AdminDepartures;
