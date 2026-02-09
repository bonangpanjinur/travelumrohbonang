import { Bell } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Notification } from "@/hooks/useNotifications";
import NotificationItem from "./NotificationItem";

interface NotificationListProps {
  notifications: Notification[];
  loading: boolean;
  onNotificationClick: (notification: Notification) => void;
}

const NotificationList = ({ 
  notifications, 
  loading, 
  onNotificationClick 
}: NotificationListProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Bell className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">Belum ada notifikasi</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-80">
      <div className="divide-y">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClick={onNotificationClick}
          />
        ))}
      </div>
    </ScrollArea>
  );
};

export default NotificationList;
