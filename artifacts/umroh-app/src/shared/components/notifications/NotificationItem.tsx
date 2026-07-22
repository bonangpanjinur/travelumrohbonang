import { Bell, AlertCircle, Clock, CreditCard, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { type Notification } from "@/shared/hooks/useNotifications";

interface NotificationItemProps {
  notification: Notification;
  onClick: (notification: Notification) => void;
}

const getIcon = (type: string) => {
  switch (type) {
    case "dp_reminder":
      return <Clock className="w-4 h-4 text-warning" />;
    case "full_reminder":
      return <CreditCard className="w-4 h-4 text-primary" />;
    case "overdue":
      return <AlertCircle className="w-4 h-4 text-destructive" />;
    default:
      return <Bell className="w-4 h-4 text-muted-foreground" />;
  }
};

const NotificationItem = ({ notification, onClick }: NotificationItemProps) => {
  return (
    <button
      onClick={() => onClick(notification)}
      className={`w-full p-4 text-left hover:bg-muted/50 transition-colors cursor-pointer group ${
        !notification.is_read ? "bg-gold/5" : ""
      }`}
    >
      <div className="flex gap-3 items-start">
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
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          {!notification.is_read && (
            <div className="w-2 h-2 rounded-full bg-gold" />
          )}
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
        </div>
      </div>
    </button>
  );
};

export default NotificationItem;
