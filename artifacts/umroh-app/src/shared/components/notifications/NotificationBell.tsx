import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { useAuth } from "@/shared/hooks/useAuth";
import { useNotifications, type Notification } from "@/shared/hooks/useNotifications";
import NotificationList from "./NotificationList";

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const { 
    notifications, 
    loading, 
    unreadCount, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications();

  const getNotificationLink = (notification: Notification): string => {
    // If booking_id is set, prefer the payment page
    if (notification.booking_id) {
      return `/booking/payment/${notification.booking_id}`;
    }
    // Infer destination from notification title keywords
    const title = (notification.title || "").toLowerCase();
    const type  = (notification.type  || "").toLowerCase();
    if (
      title.includes("tabungan") ||
      title.includes("setoran") ||
      type  === "savings"
    ) return "/tabungan";
    if (
      title.includes("dokumen") ||
      type  === "document"
    ) return "/my-documents";
    if (
      title.includes("cicilan") ||
      title.includes("pembayaran") ||
      title.includes("pelunasan") ||
      title.includes("bukti") ||
      title.includes("lunas") ||
      type  === "dp_reminder" ||
      type  === "full_reminder" ||
      type  === "overdue"
    ) return "/my-bookings";
    // Default — booking list is the most relevant catch-all
    return "/my-bookings";
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    const link = getNotificationLink(notification);
    navigate(link);
    setIsOpen(false);
  };

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative text-primary-foreground hover:text-gold hover:bg-primary-foreground/10"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifikasi</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={markAllAsRead}
            >
              <Check className="w-3 h-3 mr-1" />
              Tandai semua dibaca
            </Button>
          )}
        </div>

        <NotificationList
          notifications={notifications}
          loading={loading}
          onNotificationClick={handleNotificationClick}
        />

        {notifications.length > 0 && (
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => {
                navigate("/my-bookings");
                setIsOpen(false);
              }}
            >
              Lihat Semua Booking
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
