import { Bell, AlertCircle, Clock, CreditCard } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Notification } from "@/hooks/useNotifications";

interface NotificationItemProps {
  notification: Notification;
  onClick: (notification: Notification) => void;
}

const getIcon = (type: string) => {
  switch (type) {
    case "dp_reminder":
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case "full_reminder":
      return <CreditCard className="w-4 h-4 text-blue-500" />;
    case "overdue":
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Bell className="w-4 h-4 text-muted-foreground" />;
  }
};

const NotificationItem = ({ notification, onClick }: NotificationItemProps) => {
  return (
    <button
      onClick={() => onClick(notification)}
      className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
        !notification.is_read ? "bg-gold/5" : ""
      }`}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium truncate ${
              !notification.is_read ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: localeId,
            })}
          </p>
        </div>
        {!notification.is_read && (
          <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0 mt-1.5" />
        )}
      </div>
    </button>
  );
};

export default NotificationItem;
