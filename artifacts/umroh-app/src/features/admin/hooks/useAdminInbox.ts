/**
 * useAdminInbox — Sprint 2 + Sprint 6 Polish (chat_architecture.md §6)
 *
 * Fetches all conversations for the admin inbox and subscribes to Supabase
 * realtime for live updates (new conversations + new messages → badge update).
 *
 * Sprint 6 additions:
 * - Browser Notification API when admin tab is hidden
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import { apiFetch } from "@/shared/lib/apiClient";
import { useBrowserNotifications } from "./useBrowserNotifications";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConvType = "guest" | "member" | "booking" | "all";
export type ConvStatus = "open" | "closed" | "all";

/** Shape returned by GET /api/admin/conversations (raw SQL, snake_case) */
export interface AdminConversation {
  id: string;
  type: "guest" | "member" | "booking";
  status: "open" | "closed";
  user_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  guest_token: string | null;
  booking_id: string | null;
  assigned_admin_id: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_admin: number;
  unread_user: number;
  created_at: string;
  member_name: string | null;
}

/** Shape returned by GET /api/admin/conversations/:id/messages (Drizzle ORM, camelCase) */
export interface ConvMessage {
  id: string;
  conversationId: string;
  senderType: "admin" | "member" | "guest";
  senderId: string | null;
  senderName: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface InboxFilter {
  type: ConvType;
  status: ConvStatus;
  unreadOnly: boolean;
  search: string;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAdminInbox() {
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InboxFilter>({
    type: "all",
    status: "open",
    unreadOnly: false,
    search: "",
  });

  const { notify } = useBrowserNotifications();

  // Unique mount ID to avoid duplicate realtime channels under React Strict Mode
  const mountId = useMemo(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    [],
  );

  // Track the last notification we showed so we don't re-notify on re-render
  const notifiedMsgIds = useRef<Set<string>>(new Set());

  const fetchConversations = useCallback(async (f?: InboxFilter) => {
    const active = f ?? filter;
    try {
      const params = new URLSearchParams();
      if (active.type !== "all") params.set("type", active.type);
      if (active.status !== "all") params.set("status", active.status);
      if (active.unreadOnly) params.set("unread", "true");
      if (active.search) params.set("search", active.search);
      params.set("limit", "100");

      const result = await apiFetch<{ data: AdminConversation[]; total: number }>(
        `/api/admin/conversations?${params.toString()}`,
      );
      setConversations(result.data ?? []);
    } catch (err) {
      console.error("[useAdminInbox] fetchConversations:", err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch whenever filter changes
  useEffect(() => {
    setLoading(true);
    fetchConversations(filter);
  }, [filter, fetchConversations]);

  // ── Realtime subscriptions ─────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`admin-inbox-${mountId}`)
      // New conversation created
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations" },
        (payload) => {
          const conv = payload.new as AdminConversation;
          setConversations((prev) => {
            if (prev.find((c) => c.id === conv.id)) return prev;
            return [conv, ...prev];
          });
        },
      )
      // Conversation updated (e.g. last_message_preview, unread_admin)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        (payload) => {
          const updated = payload.new as AdminConversation;
          setConversations((prev) =>
            prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
          );
        },
      )
      // New message in any conversation → browser notification if tab hidden
      // NOTE: Supabase Realtime payload.new is raw DB row → snake_case column names
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversation_messages" },
        (payload) => {
          const msg = payload.new as {
            id: string;
            sender_type: string;
            sender_name: string;
            message: string;
          };
          // Only notify for messages from user/guest (not admin's own messages)
          if (msg.sender_type === "admin") return;
          if (notifiedMsgIds.current.has(msg.id)) return;
          notifiedMsgIds.current.add(msg.id);

          notify(
            `Pesan baru dari ${msg.sender_name}`,
            (msg.message ?? "").slice(0, 100),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mountId, notify]);

  const totalUnread = conversations.reduce((n, c) => n + (c.unread_admin ?? 0), 0);

  return {
    conversations,
    loading,
    filter,
    setFilter,
    totalUnread,
    refetch: fetchConversations,
  };
}

// ── Per-conversation messages hook ────────────────────────────────────────────

export function useConversationMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<ConvMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const mountId = useMemo(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    [],
  );

  const fetchMessages = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const result = await apiFetch<{ data: ConvMessage[] }>(
        `/api/admin/conversations/${id}/messages`,
      );
      setMessages(result.data ?? []);
    } catch (err) {
      console.error("[useConversationMessages] fetch:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    fetchMessages(conversationId);

    // Subscribe to new messages in this conversation
    const channel = supabase
      .channel(`conv-messages-${conversationId}-${mountId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as ConvMessage;
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        },
      )
      // Listen for isRead updates on messages (for ✓✓ ticks)
      // NOTE: Supabase Realtime payload.new is raw DB row → snake_case column names
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; is_read: boolean };
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, isRead: updated.is_read } : m)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchMessages, mountId]);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!conversationId || !message.trim()) return;
      await apiFetch(`/api/admin/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      // The realtime subscription will append the message automatically
    },
    [conversationId],
  );

  const markRead = useCallback(async () => {
    if (!conversationId) return;
    await apiFetch(`/api/admin/conversations/${conversationId}/read`, {
      method: "PATCH",
    }).catch(() => {});
  }, [conversationId]);

  return { messages, loading, sendMessage, markRead, refetch: fetchMessages };
}
