import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { useToast } from "@/shared/hooks/use-toast";
import { Plus, Pencil, Trash2, Star, Search } from "lucide-react";
import AdminPagination from "@/features/admin/components/AdminPagination";
import { useAdminPagination } from "@/features/admin/hooks/useAdminPagination";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";
import { useDeleteConfirm } from "@/features/admin/hooks/useDeleteConfirm";

interface Hotel {
  id: string;
  name: string;
  city: string;
  stars: number;
}

const AdminHotels = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Hotel | null>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const { isDeleteOpen, requestDelete, cancelDelete, confirmDelete } = useDeleteConfirm();

  const filteredHotels = hotels.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.city?.toLowerCase().includes(search.toLowerCase())
  );

  const { page, setPage, totalPages, totalCount, paginatedItems, pageSize, resetPage } = useAdminPagination(filteredHotels);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { resetPage(); }, [search]);

  const [form, setForm] = useState({ name: "", city: "", stars: 5 });

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    try {
      const res = await apiFetch<{ data: Hotel[] }>("/api/admin/masterdata/hotels");
      setHotels(res.data || []);
    } catch {
      toast({ title: "Gagal memuat hotel", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editing) {
        await apiFetch(`/api/admin/masterdata/hotels/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
        toast({ title: "Hotel diupdate!" });
      } else {
        await apiFetch("/api/admin/masterdata/hotels", {
          method: "POST",
          body: JSON.stringify(form),
        });
        toast({ title: "Hotel ditambahkan!" });
      }
      fetchHotels();
      setIsOpen(false);
      resetForm();
    } catch {
      toast({ title: "Gagal menyimpan", variant: "destructive" });
    }
  };

  const handleEdit = (hotel: Hotel) => {
    setEditing(hotel);
    setForm({ name: hotel.name, city: hotel.city || "", stars: hotel.stars || 5 });
    setIsOpen(true);
  };

  const executeDelete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/masterdata/hotels/${id}`, { method: "DELETE" });
      toast({ title: "Hotel dihapus" });
      fetchHotels();
    } catch {
      toast({ title: "Gagal menghapus", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ name: "", city: "", stars: 5 });
  };

  return (
    <div>
      <DeleteAlertDialog open={isDeleteOpen} onOpenChange={cancelDelete} onConfirm={() => confirmDelete(executeDelete)} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Hotel</h1>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari hotel..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-64" />
          </div>
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
                  <Input type="number" min={1} max={5} value={form.stars} onChange={(e) => setForm({ ...form, stars: parseInt(e.target.value) })} className="mt-1" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                  <Button type="submit" className="gradient-gold text-primary">Simpan</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
        </div>
      ) : filteredHotels.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">{search ? "Tidak ditemukan hotel" : "Belum ada hotel"}</div>
      ) : (
        <>
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
                {paginatedItems.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-semibold">{h.name}</TableCell>
                    <TableCell>{h.city || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        {[...Array(h.stars || 0)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-gold text-gold" />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(h)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => requestDelete(h.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <AdminPagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};

export default AdminHotels;
