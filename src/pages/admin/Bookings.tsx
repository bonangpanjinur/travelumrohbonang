import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Eye, CheckCircle } from "lucide-react";

interface Booking {
  id: string;
  booking_code: string;
  total_price: number;
  status: string;
  created_at: string;
  package: { title: string } | null;
  departure: { departure_date: string } | null;
  profile: { name: string; email: string } | null;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  waiting_payment: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  waiting_payment: "Menunggu Pembayaran",
  paid: "Lunas",
  cancelled: "Dibatalkan",
};

const AdminBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, [filter]);

  const fetchBookings = async () => {
    let query = supabase
      .from("bookings")
      .select(`
        id, booking_code, total_price, status, created_at,
        package:packages(title),
        departure:package_departures(departure_date),
        profile:profiles(name, email)
      `)
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;
    setBookings((data as unknown as Booking[]) || []);
    setLoading(false);
  };

  const handleVerifyPayment = async (bookingId: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "paid" })
      .eq("id", bookingId);

    if (error) {
      toast({ title: "Gagal verifikasi", variant: "destructive" });
    } else {
      // Also update payment
      await supabase
        .from("payments")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("booking_id", bookingId);

      toast({ title: "Pembayaran diverifikasi!" });
      fetchBookings();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Booking</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="waiting_payment">Menunggu Pembayaran</SelectItem>
            <SelectItem value="paid">Lunas</SelectItem>
            <SelectItem value="cancelled">Dibatalkan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Belum ada booking</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Paket</TableHead>
                <TableHead>Keberangkatan</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-sm">{b.booking_code}</TableCell>
                  <TableCell>
                    <div className="font-semibold">{b.profile?.name || "-"}</div>
                    <div className="text-xs text-muted-foreground">{b.profile?.email}</div>
                  </TableCell>
                  <TableCell>{b.package?.title || "-"}</TableCell>
                  <TableCell>
                    {b.departure?.departure_date
                      ? format(new Date(b.departure.departure_date), "d MMM yyyy", { locale: localeId })
                      : "-"}
                  </TableCell>
                  <TableCell className="font-semibold">
                    Rp {b.total_price.toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[b.status]}>{statusLabels[b.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {b.status === "waiting_payment" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerifyPayment(b.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Verifikasi
                        </Button>
                      )}
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

export default AdminBookings;
