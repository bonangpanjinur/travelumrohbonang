import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Package, CreditCard, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useAdminNotifications, type AdminNotif } from "@/features/admin/hooks/useAdminNotifications";

const NotifIcon = ({ type }: { type: AdminNotif["type"] }) =>
  type === "booking" ? (
    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
      <Package className="w-4 h-4 text-primary" />
    </div>
  ) : (
    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
      <CreditCard className="w-4 h-4 text-amber-500" />
    </div>
  );

interface NotifRowProps {
  notif: AdminNotif;
  onClick: (n: AdminNotif) => void;
}

const NotifRow = ({ notif, onClick }: NotifRowProps) => (
  <button
    onClick={() => onClick(notif)}
    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/60 transition-colors border-b last:border-b-0 group ${
      !notif.is_read ? "bg-primary/[0.03]" : ""
    }`}
  >
    <NotifIcon type={notif.type} />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className={`text-sm font-semibold truncate ${notif.is_read ? "text-muted-foreground" : "text-foreground"}`}>
          {notif.title}
        </p>
        {!notif.is_read && (
          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-0.5 truncate">{notif.message}</p>
      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
        {(() => {
          const d = new Date(notif.created_at);
          return isNaN(d.getTime())
            ? "-"
            : formatDistanceToNow(d, { addSuffix: true, locale: localeId });
        })()}
      </p>
    </div>
    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground flex-shrink-0 mt-0.5 transition-colors" />
  </button>
);

const EmptyState = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
    <Bell className="w-8 h-8 mb-2 opacity-30" />
    <p className="text-sm">{label}</p>
  </div>
);

const AdminNotificationBell = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    loading,
    unreadCount,
    unreadBookings,
    unreadPayments,
    markAsRead,
    markAllAsRead,
    refetch,
  } = useAdminNotifications();

  const bookingNotifs = notifications.filter((n) => n.type === "booking");
  const paymentNotifs = notifications.filter((n) => n.type === "payment");

  const handleClick = (notif: AdminNotif) => {
    markAsRead(notif.id);
    navigate(notif.link);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label="Notifikasi admin"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[360px] p-0 shadow-xl" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Notifikasi Admin</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                {unreadCount} baru
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => refetch()}
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={markAllAsRead}
              >
                <Check className="w-3 h-3 mr-1" />
                Baca semua
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all">
          <TabsList className="w-full rounded-none border-b h-9 bg-transparent p-0 gap-0">
            <TabsTrigger
              value="all"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs h-full"
            >
              Semua
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0 h-3.5">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="bookings"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs h-full"
            >
              Booking
              {unreadBookings > 0 && (
                <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0 h-3.5">
                  {unreadBookings}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent text-xs h-full"
            >
              Pembayaran
              {unreadPayments > 0 && (
                <Badge className="ml-1 text-[9px] px-1 py-0 h-3.5 bg-amber-500">
                  {unreadPayments}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <ScrollArea className="h-72">
              {loading ? (
                <div className="flex justify-center py-10">
                  <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <EmptyState label="Belum ada notifikasi" />
              ) : (
                notifications.map((n) => (
                  <NotifRow key={n.id} notif={n} onClick={handleClick} />
                ))
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="bookings" className="mt-0">
            <ScrollArea className="h-72">
              {bookingNotifs.length === 0 ? (
                <EmptyState label="Belum ada booking baru" />
              ) : (
                bookingNotifs.map((n) => (
                  <NotifRow key={n.id} notif={n} onClick={handleClick} />
                ))
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="payments" className="mt-0">
            <ScrollArea className="h-72">
              {paymentNotifs.length === 0 ? (
                <EmptyState label="Tidak ada pembayaran pending" />
              ) : (
                paymentNotifs.map((n) => (
                  <NotifRow key={n.id} notif={n} onClick={handleClick} />
                ))
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="border-t p-2 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => { navigate("/admin/bookings"); setIsOpen(false); }}
          >
            <Package className="w-3.5 h-3.5 mr-1.5" />
            Lihat Booking
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => { navigate("/admin/payments"); setIsOpen(false); }}
          >
            <CreditCard className="w-3.5 h-3.5 mr-1.5" />
            Verifikasi Bayar
            {unreadPayments > 0 && (
              <Badge className="ml-1 text-[9px] px-1 py-0 h-3.5 bg-amber-500">
                {unreadPayments}
              </Badge>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AdminNotificationBell;
