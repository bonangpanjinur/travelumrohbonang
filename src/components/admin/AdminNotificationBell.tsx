import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface AdminNotification {
  id: string;
  type: "booking" | "payment";
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  booking_code?: string;
}

const AdminNotificationBell = () => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    // Fetch recent bookings as notifications
    const [bookingsRes, paymentsRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, booking_code, created_at, status, profile:profiles!bookings_user_id_profiles_fkey(name)")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("payments")
        .select("id, amount, status, created_at, booking:bookings(booking_code)")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const items: AdminNotification[] = [];

    (bookingsRes.data || []).forEach((b: any) => {
      items.push({
        id: `booking-${b.id}`,
        type: "booking",
        title: `Booking Baru: ${b.booking_code}`,
        message: `${b.profile?.name || "User"} membuat booking baru`,
        created_at: b.created_at,
        is_read: false,
        booking_code: b.booking_code,
      });
    });

    (paymentsRes.data || []).forEach((p: any) => {
      items.push({
        id: `payment-${p.id}`,
        type: "payment",
        title: `Pembayaran Menunggu Verifikasi`,
        message: `Rp ${p.amount?.toLocaleString("id-ID")} - ${p.booking?.booking_code || ""}`,
        created_at: p.created_at,
        is_read: false,
      });
    });

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setNotifications(items.slice(0, 10));
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const pendingPayments = notifications.filter((n) => n.type === "payment").length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          {pendingPayments > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
              {pendingPayments > 9 ? "9+" : pendingPayments}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notifikasi Admin</h3>
          {pendingPayments > 0 && (
            <span className="text-xs text-destructive font-medium">{pendingPayments} pembayaran pending</span>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada notifikasi</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  navigate(n.type === "payment" ? "/admin/payments" : "/admin/bookings");
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-muted/50 border-b last:border-b-0 transition-colors"
              >
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {format(new Date(n.created_at), "d MMM yyyy, HH:mm", { locale: localeId })}
                </p>
              </button>
            ))
          )}
        </div>
        <div className="p-3 border-t flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => { navigate("/admin/bookings"); setIsOpen(false); }}>
            Lihat Booking
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => { navigate("/admin/payments"); setIsOpen(false); }}>
            Lihat Pembayaran
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AdminNotificationBell;
