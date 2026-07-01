import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/shared/integrations/supabase/client";
import { useAuth } from "@/shared/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Button } from "@/components/ui/button";

interface Notif {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  booking_id: string | null;
  created_at: string;
}

const RecentNotifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setItems((data || []) as Notif[]);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("dashboard-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleClick = async (n: Notif) => {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    }
    if (n.booking_id) {
      navigate(`/booking/payment/${n.booking_id}`);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notifikasi Terbaru
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground text-center">Memuat...</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">
            Belum ada notifikasi.
          </p>
        ) : (
          <ul className="divide-y">
            {items.map((n) => (
              <li
                key={n.id}
                onClick={() => handleClick(n)}
                className={`p-4 cursor-pointer hover:bg-muted/40 transition-colors ${
                  !n.is_read ? "bg-info/5" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm truncate">{n.title}</h4>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-info shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {n.message}
                    </p>
                    <span className="text-[11px] text-muted-foreground/70 mt-1 block">
                      {formatDistanceToNow(new Date(n.created_at), {
                        locale: localeId,
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  {n.is_read && <Check className="h-4 w-4 text-success shrink-0 mt-1" />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentNotifications;
