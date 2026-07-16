import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/shared/integrations/supabase/client";
import { apiFetch } from "@/shared/lib/apiClient";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

/** Safely format a date string; returns "-" if null/invalid. */
function safeDistanceToNow(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  try {
    return formatDistanceToNow(d, { addSuffix: true, locale: localeId });
  } catch {
    return "-";
  }
}

export type AdminNotifType = "booking" | "payment";

export interface AdminNotif {
  id: string;
  type: AdminNotifType;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  link: string;
  booking_code?: string;
  amount?: number;
  user_name?: string;
  payment_status?: string;
}

const STORAGE_KEY = "admin_notif_read_ids";
const MAX_ITEMS = 40;

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    // Keep only the last 200 to avoid unbounded growth
    const arr = Array.from(ids).slice(-200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {}
}

function buildBookingNotif(b: any): AdminNotif {
  return {
    id: `booking-${b.id}`,
    type: "booking",
    title: "Booking Baru",
    message: `${b.profile?.name || b.user_name || "Jamaah"} — ${b.booking_code || b.id.slice(0, 8)}`,
    created_at: b.created_at,
    is_read: false,
    link: "/admin/bookings",
    booking_code: b.booking_code,
    user_name: b.profile?.name || b.user_name,
  };
}

function buildPaymentNotif(p: any): AdminNotif {
  const bookingCode = p.booking?.booking_code || p.booking_code || "";
  return {
    id: `payment-${p.id}`,
    type: "payment",
    title: "Pembayaran Butuh Verifikasi",
    message: `Rp ${(p.amount || 0).toLocaleString("id-ID")}${bookingCode ? ` — ${bookingCode}` : ""}`,
    created_at: p.created_at,
    is_read: false,
    link: "/admin/payments",
    booking_code: bookingCode,
    amount: p.amount,
    payment_status: p.status,
  };
}

function applyReadState(items: AdminNotif[], readIds: Set<string>): AdminNotif[] {
  return items.map((n) => ({ ...n, is_read: readIds.has(n.id) }));
}

export function useAdminNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AdminNotif[]>([]);
  const [loading, setLoading] = useState(true);
  const readIdsRef = useRef<Set<string>>(getReadIds());
  // Track which notification IDs we've already toasted so HMR doesn't re-toast
  const toastedRef = useRef<Set<string>>(new Set());
  // Unique ID per hook mount — prevents "cannot add listeners after subscribe()" when
  // React Strict Mode or fast-refresh re-runs the effect before the previous cleanup finishes.
  const mountId = useMemo(() => `${Date.now()}-${Math.random().toString(36).slice(2)}`, []);

  const showToast = useCallback((notif: AdminNotif) => {
    if (toastedRef.current.has(notif.id)) return;
    toastedRef.current.add(notif.id);

    const ago = safeDistanceToNow(notif.created_at);

    if (notif.type === "booking") {
      toast.success(notif.title, {
        description: `${notif.message} · ${ago}`,
        duration: 6000,
        action: { label: "Lihat", onClick: () => navigate(notif.link) },
      });
    } else {
      toast.warning(notif.title, {
        description: `${notif.message} · ${ago}`,
        duration: 8000,
        action: { label: "Verifikasi", onClick: () => navigate(notif.link) },
      });
    }
  }, [navigate]);

  const fetchAll = useCallback(async () => {
    try {
      // Bookings: use Express API to avoid FK embed requirement on PostgREST.
      // Direct Supabase query with profile:profiles!bookings_user_id_profiles_fkey(name)
      // returns 400 when the FK constraint is missing in the live DB.
      const bookingsResult = await apiFetch<{ data: Array<{
        id: string; bookingCode: string; createdAt: string; userName: string | null;
      }> }>("/api/admin/bookings?limit=20").catch(() => ({ data: [] as any[] }));

      // Payments: two-step query — avoids the FK embed booking:bookings(booking_code)
      const { data: rawPayments } = await supabase
        .from("payments")
        .select("id, amount, status, created_at, booking_id")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(MAX_ITEMS / 2);

      // Resolve booking_code for each payment via a separate .in() query
      const bookingIds = (rawPayments || []).map((p: any) => p.booking_id).filter(Boolean);
      let bookingCodeMap: Map<string, string> = new Map();
      if (bookingIds.length > 0) {
        const { data: bkRows } = await supabase
          .from("bookings")
          .select("id, booking_code")
          .in("id", bookingIds);
        bookingCodeMap = new Map((bkRows || []).map((b: any) => [b.id, b.booking_code]));
      }

      const paymentsWithCode = (rawPayments || []).map((p: any) => ({
        ...p,
        booking: { booking_code: bookingCodeMap.get(p.booking_id) || "" },
      }));

      const bookingNotifs: AdminNotif[] = (bookingsResult.data || []).map((b) =>
        buildBookingNotif({
          id: b.id,
          booking_code: b.bookingCode,
          created_at: b.createdAt,
          profile: { name: b.userName || "" },
        })
      );
      const paymentNotifs: AdminNotif[] = paymentsWithCode.map(buildPaymentNotif);

      const toMs = (s: string) => { const t = new Date(s).getTime(); return isNaN(t) ? 0 : t; };
      const all = [...bookingNotifs, ...paymentNotifs].sort(
        (a, b) => toMs(b.created_at) - toMs(a.created_at)
      );

      setNotifications(applyReadState(all, readIdsRef.current));
    } catch (err) {
      console.error("[useAdminNotifications] fetchAll error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    // ── Real-time: new bookings ─────────────────────────────────────────────
    const bookingChannel = supabase
      .channel(`admin-realtime-bookings-${mountId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookings" },
        async (payload) => {
          const b = payload.new as any;

          // Fetch the profile name for richer messaging
          let user_name = "";
          if (b.user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("name")
              .eq("id", b.user_id)
              .maybeSingle();
            user_name = profile?.name || "";
          }

          const notif = buildBookingNotif({ ...b, user_name });
          notif.is_read = readIdsRef.current.has(notif.id);

          setNotifications((prev) => {
            if (prev.find((n) => n.id === notif.id)) return prev;
            return [notif, ...prev].slice(0, MAX_ITEMS);
          });

          if (!notif.is_read) showToast(notif);
        }
      )
      .subscribe();

    // ── Real-time: new/updated payments needing verification ────────────────
    const paymentChannel = supabase
      .channel(`admin-realtime-payments-${mountId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "payments" },
        async (payload) => {
          const p = payload.new as any;
          if (p.status !== "pending") return;

          let booking_code = "";
          if (p.booking_id) {
            const { data: bk } = await supabase
              .from("bookings")
              .select("booking_code")
              .eq("id", p.booking_id)
              .maybeSingle();
            booking_code = bk?.booking_code || "";
          }

          const notif = buildPaymentNotif({ ...p, booking_code });
          notif.is_read = readIdsRef.current.has(notif.id);

          setNotifications((prev) => {
            if (prev.find((n) => n.id === notif.id)) return prev;
            return [notif, ...prev].slice(0, MAX_ITEMS);
          });

          if (!notif.is_read) showToast(notif);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "payments" },
        async (payload) => {
          const p = payload.new as any;
          const old = payload.old as any;
          // Only trigger if it just became pending (e.g. proof uploaded)
          if (p.status !== "pending" || old.status === "pending") return;

          let booking_code = "";
          if (p.booking_id) {
            const { data: bk } = await supabase
              .from("bookings")
              .select("booking_code")
              .eq("id", p.booking_id)
              .maybeSingle();
            booking_code = bk?.booking_code || "";
          }

          const notif = buildPaymentNotif({ ...p, booking_code });
          notif.is_read = readIdsRef.current.has(notif.id);

          setNotifications((prev) => {
            const without = prev.filter((n) => n.id !== notif.id);
            return [notif, ...without].slice(0, MAX_ITEMS);
          });

          if (!notif.is_read) showToast(notif);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingChannel);
      supabase.removeChannel(paymentChannel);
    };
  }, [fetchAll, showToast, mountId]);

  const markAsRead = useCallback((id: string) => {
    readIdsRef.current.add(id);
    saveReadIds(readIdsRef.current);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      prev.forEach((n) => readIdsRef.current.add(n.id));
      saveReadIds(readIdsRef.current);
      return prev.map((n) => ({ ...n, is_read: true }));
    });
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const unreadBookings = notifications.filter((n) => !n.is_read && n.type === "booking").length;
  const unreadPayments = notifications.filter((n) => !n.is_read && n.type === "payment").length;

  return {
    notifications,
    loading,
    unreadCount,
    unreadBookings,
    unreadPayments,
    markAsRead,
    markAllAsRead,
    refetch: fetchAll,
  };
}
