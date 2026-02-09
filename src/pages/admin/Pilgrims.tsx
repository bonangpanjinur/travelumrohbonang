import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Eye, Users, Calendar, Phone, Mail, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface Pilgrim {
  id: string;
  name: string;
  nik: string | null;
  phone: string | null;
  email: string | null;
  gender: string | null;
  birth_date: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  booking_id: string | null;
  created_at: string;
  booking?: {
    id: string;
    booking_code: string;
    status: string;
    total_price: number;
    package?: { title: string } | null;
    departure?: { departure_date: string } | null;
  } | null;
}

const AdminPilgrims = () => {
  const [pilgrims, setPilgrims] = useState<Pilgrim[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPilgrim, setSelectedPilgrim] = useState<Pilgrim | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPilgrims();
  }, []);

  const fetchPilgrims = async () => {
    const { data, error } = await supabase
      .from("booking_pilgrims")
      .select(`
        *,
        booking:bookings(
          id, booking_code, status, total_price,
          package:packages(title),
          departure:package_departures(departure_date)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Gagal memuat data", description: error.message, variant: "destructive" });
    } else {
      setPilgrims((data as unknown as Pilgrim[]) || []);
    }
    setLoading(false);
  };

  const filteredPilgrims = pilgrims.filter((p) => {
    const searchLower = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(searchLower) ||
      p.nik?.toLowerCase().includes(searchLower) ||
      p.passport_number?.toLowerCase().includes(searchLower) ||
      p.phone?.toLowerCase().includes(searchLower) ||
      p.email?.toLowerCase().includes(searchLower) ||
      p.booking?.booking_code?.toLowerCase().includes(searchLower)
    );
  });

  const showDetail = (pilgrim: Pilgrim) => {
    setSelectedPilgrim(pilgrim);
    setDetailOpen(true);
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "confirmed": return "bg-success/10 text-success border-success/20";
      case "pending": return "bg-warning/10 text-warning border-warning/20";
      case "cancelled": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Daftar Jemaah</h1>
          <p className="text-muted-foreground">Total {pilgrims.length} jemaah terdaftar</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, NIK, paspor, booking..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
        </div>
      ) : filteredPilgrims.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            {search ? "Tidak ada jemaah yang cocok dengan pencarian" : "Belum ada data jemaah"}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Jemaah</TableHead>
                  <TableHead>NIK / Paspor</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead>Kode Booking</TableHead>
                  <TableHead>Paket</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPilgrims.map((pilgrim) => (
                  <TableRow key={pilgrim.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{pilgrim.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {pilgrim.gender === "male" ? "Laki-laki" : pilgrim.gender === "female" ? "Perempuan" : "-"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>NIK: {pilgrim.nik || "-"}</p>
                        <p>Paspor: {pilgrim.passport_number || "-"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{pilgrim.phone || "-"}</p>
                        <p className="text-muted-foreground">{pilgrim.email || "-"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {pilgrim.booking?.booking_code || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{pilgrim.booking?.package?.title || "-"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(pilgrim.booking?.status)}>
                        {pilgrim.booking?.status || "draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => showDetail(pilgrim)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Jemaah</DialogTitle>
          </DialogHeader>
          {selectedPilgrim && (
            <div className="space-y-6">
              {/* Personal Info */}
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-3">INFORMASI PRIBADI</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">{selectedPilgrim.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedPilgrim.gender === "male" ? "Laki-laki" : selectedPilgrim.gender === "female" ? "Perempuan" : "Tidak disebutkan"}
                      </p>
                    </div>
                  </div>
                  {selectedPilgrim.birth_date && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <p>{format(new Date(selectedPilgrim.birth_date), "dd MMMM yyyy", { locale: idLocale })}</p>
                    </div>
                  )}
                  {selectedPilgrim.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                      <p>{selectedPilgrim.phone}</p>
                    </div>
                  )}
                  {selectedPilgrim.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <p>{selectedPilgrim.email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-3">DOKUMEN</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">NIK</p>
                      <p className="font-mono">{selectedPilgrim.nik || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">No. Paspor</p>
                      <p className="font-mono">{selectedPilgrim.passport_number || "-"}</p>
                    </div>
                  </div>
                  {selectedPilgrim.passport_expiry && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Masa Berlaku Paspor</p>
                        <p>{format(new Date(selectedPilgrim.passport_expiry), "dd MMMM yyyy", { locale: idLocale })}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Info */}
              {selectedPilgrim.booking && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-3">INFORMASI BOOKING</h4>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kode Booking</span>
                      <span className="font-mono font-semibold">{selectedPilgrim.booking.booking_code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paket</span>
                      <span>{selectedPilgrim.booking.package?.title || "-"}</span>
                    </div>
                    {selectedPilgrim.booking.departure?.departure_date && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Keberangkatan</span>
                        <span>{format(new Date(selectedPilgrim.booking.departure.departure_date), "dd MMM yyyy", { locale: idLocale })}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge className={getStatusColor(selectedPilgrim.booking.status)}>
                        {selectedPilgrim.booking.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-muted-foreground">Total Harga</span>
                      <span className="font-semibold">
                        Rp {selectedPilgrim.booking.total_price?.toLocaleString("id-ID") || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPilgrims;
