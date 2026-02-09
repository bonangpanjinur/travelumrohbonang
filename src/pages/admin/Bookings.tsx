import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BookingTable, { Booking } from "@/components/admin/BookingTable";
import BookingFilters from "@/components/admin/BookingFilters";

const AdminBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, [filter]);

  const fetchBookings = async () => {
    let query = supabase
      .from("bookings")
      .select(`
        id, booking_code, total_price, status, created_at, package_id, pic_type, pic_id,
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
      await supabase
        .from("payments")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("booking_id", bookingId);

      toast({ title: "Pembayaran diverifikasi!" });
      fetchBookings();
    }
  };

  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Booking</h1>
        <BookingFilters filter={filter} onFilterChange={setFilter} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Belum ada booking</div>
      ) : (
        <BookingTable
          bookings={bookings}
          expandedId={expandedId}
          onToggleExpand={handleToggleExpand}
          onVerifyPayment={handleVerifyPayment}
        />
      )}
    </div>
  );
};

export default AdminBookings;
