import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Package, CreditCard, RefreshCw, Check, Filter } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { formatDistanceToNow, format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useAdminNotifications, type AdminNotif } from "@/features/admin/hooks/useAdminNotifications";

const TYPE_LABEL: Record<AdminNotif["type"], string> = {
  booking: "Booking Baru",
  payment: "Pembayaran Pending",
};

const TYPE_COLOR: Record<AdminNotif["type"], string> = {
  booking: "bg-primary/10 text-primary",
  payment: "bg-amber-500/10 text-amber-600",
};

const NotifCard = ({
  notif,
  onRead,
  onNavigate,
}: {
  notif: AdminNotif;
  onRead: (id: string) => void;
  onNavigate: (notif: AdminNotif) => void;
}) => (
  <div
    className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${
      !notif.is_read
        ? "bg-primary/[0.03] border-primary/20"
        : "bg-card border-border"
    }`}
    onClick={() => onNavigate(notif)}
  >
    {/* Icon */}
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
        notif.type === "booking" ? "bg-primary/10" : "bg-amber-500/10"
      }`}
    >
      {notif.type === "booking" ? (
        <Package className="w-5 h-5 text-primary" />
      ) : (
        <CreditCard className="w-5 h-5 text-amber-500" />
      )}
    </div>

    {/* Body */}
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 h-4 ${TYPE_COLOR[notif.type]}`}
            >
              {TYPE_LABEL[notif.type]}
            </Badge>
            {notif.booking_code && (
              <span className="text-xs text-muted-foreground font-mono">
                #{notif.booking_code}
              </span>
            )}
            {!notif.is_read && (
              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
            )}
          </div>
          <p className={`text-sm font-semibold mt-1 ${notif.is_read ? "text-muted-foreground" : "text-foreground"}`}>
            {notif.title}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{notif.message}</p>
          {notif.amount && (
            <p className="text-sm font-bold text-amber-600 mt-0.5">
              Rp {notif.amount.toLocaleString("id-ID")}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {format(new Date(notif.created_at), "d MMM, HH:mm", { locale: localeId })}
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            {formatDistanceToNow(new Date(notif.created_at), {
              addSuffix: true,
              locale: localeId,
            })}
          </span>
          {!notif.is_read && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2 mt-1"
              onClick={(e) => {
                e.stopPropagation();
                onRead(notif.id);
              }}
            >
              <Check className="w-3 h-3 mr-1" />
              Baca
            </Button>
          )}
        </div>
      </div>
    </div>
  </div>
);

const AdminNotificationsPage = () => {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<"newest" | "unread">("newest");

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

  const sortedNotifs = (list: AdminNotif[]) => {
    if (sortBy === "unread") {
      return [...list].sort((a, b) => {
        if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
    return [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  };

  const handleNavigate = (notif: AdminNotif) => {
    markAsRead(notif.id);
    navigate(notif.link);
  };

  const bookingNotifs = notifications.filter((n) => n.type === "booking");
  const paymentNotifs = notifications.filter((n) => n.type === "payment");

  const renderList = (list: AdminNotif[]) => {
    const sorted = sortedNotifs(list);
    if (sorted.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Bell className="w-12 h-12 mb-3 opacity-20" />
          <p className="font-medium">Tidak ada notifikasi</p>
          <p className="text-sm mt-1">Semua sudah tertangani 🎉</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {sorted.map((n) => (
          <NotifCard
            key={n.id}
            notif={n}
            onRead={markAsRead}
            onNavigate={handleNavigate}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Pusat Notifikasi
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Notifikasi real-time booking baru dan pembayaran yang butuh verifikasi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[150px] h-9 text-sm">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Terbaru dulu</SelectItem>
              <SelectItem value="unread">Belum dibaca dulu</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => refetch()} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="h-9 text-sm" onClick={markAllAsRead}>
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Tandai semua dibaca
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Bell className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Notifikasi</p>
                <p className="text-xl font-bold">{notifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={unreadBookings > 0 ? "border-primary/30" : ""}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Booking Baru</p>
                <p className="text-xl font-bold">
                  {unreadBookings > 0 ? (
                    <span className="text-primary">{unreadBookings} belum dibaca</span>
                  ) : (
                    bookingNotifs.length
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={unreadPayments > 0 ? "border-amber-400/50" : ""}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <CreditCard className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Butuh Verifikasi</p>
                <p className="text-xl font-bold">
                  {unreadPayments > 0 ? (
                    <span className="text-amber-500">{paymentNotifs.length} pending</span>
                  ) : (
                    paymentNotifs.length
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification List */}
      <Card>
        <CardHeader className="pb-0">
          <Tabs defaultValue="all">
            <div className="flex items-center justify-between gap-4">
              <TabsList className="bg-transparent p-0 gap-1">
                <TabsTrigger
                  value="all"
                  className="text-sm data-[state=active]:bg-muted rounded-lg px-3 h-8"
                >
                  Semua
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="bookings"
                  className="text-sm data-[state=active]:bg-muted rounded-lg px-3 h-8"
                >
                  Booking
                  {unreadBookings > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">
                      {unreadBookings}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="payments"
                  className="text-sm data-[state=active]:bg-muted rounded-lg px-3 h-8"
                >
                  Pembayaran
                  {unreadPayments > 0 && (
                    <Badge className="ml-1.5 text-[10px] px-1.5 py-0 h-4 bg-amber-500">
                      {unreadPayments}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <CardDescription className="text-xs">
                Real-time via Supabase
                <span className="inline-flex items-center gap-1 ml-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </CardDescription>
            </div>

            <TabsContent value="all" className="mt-4">
              {loading ? (
                <div className="flex justify-center py-16">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                renderList(notifications)
              )}
            </TabsContent>

            <TabsContent value="bookings" className="mt-4">
              {renderList(bookingNotifs)}
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              {renderList(paymentNotifs)}
            </TabsContent>
          </Tabs>
        </CardHeader>
        <CardContent className="pt-2" />
      </Card>

      {/* Quick-action footer */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => navigate("/admin/bookings")}
        >
          <Package className="w-4 h-4 mr-2" />
          Kelola Semua Booking
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => navigate("/admin/payments")}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Verifikasi Pembayaran
          {unreadPayments > 0 && (
            <Badge className="ml-2 bg-amber-500 text-white text-[10px] px-1.5 py-0 h-4">
              {paymentNotifs.length}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AdminNotificationsPage;
