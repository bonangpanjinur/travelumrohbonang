/**
 * useAdminInbox — Sprint 2 + Sprint 6 Polish (chat_architecture.md §6)
 *
 * Fetches all conversations for the admin inbox and subscribes to Supabase
 * realtime for live updates (new conversations + new messages → badge update).
 *
 * Fixes applied:
 * - Realtime enabled in all environments (removed DEV guard; polling covers dev)
 * - snake_case → camelCase mapping on realtime INSERT payloads
 * - markConversationRead() updates local state immediately (no refetch needed)
 * - Polling fallback: conversations every 15 s, messages every 5 s
 * - Optimistic update on admin sendMessage
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
  assignedToMe: boolean;
  search: string;
}

function mapRealtimeConversation(raw: Record<string, unknown>): AdminConversation {
  return {
    id: raw.id as string,
    type: raw.type as AdminConversation["type"],
    status: raw.status as AdminConversation["status"],
    user_id: (raw.user_id ?? null) as string | null,
    guest_name: (raw.guest_name ?? null) as string | null,
    guest_phone: (raw.guest_phone ?? null) as string | null,
    guest_email: (raw.guest_email ?? null) as string | null,
    guest_token: null,
    booking_id: (raw.booking_id ?? null) as string | null,
    assigned_admin_id: (raw.assigned_admin_id ?? null) as string | null,
    last_message_at: (raw.last_message_at ?? null) as string | null,
    last_message_preview: (raw.last_message_preview ?? null) as string | null,
    unread_admin: Number(raw.unread_admin ?? 0),
    unread_user: Number(raw.unread_user ?? 0),
    created_at: raw.created_at as string,
    member_name: null,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAdminInbox() {
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InboxFilter>({
    type: "all",
    status: "open",
    unreadOnly: false,
    assignedToMe: false,
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
      if (active.assignedToMe) params.set("assigned_to_me", "true");
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

  // ── Polling fallback — 15 s interval (covers dev + realtime outages) ────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      fetchConversations(filter);
    }, 15_000);
    return () => clearInterval(interval);
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
          const conv = mapRealtimeConversation(payload.new as Record<string, unknown>);
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

  // ── Mark conversation read locally + via API ──────────────────────────────
  const markConversationRead = useCallback(async (id: string) => {
    // Optimistic: clear badge immediately so it doesn't linger
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread_admin: 0 } : c)),
    );
    await apiFetch(`/api/admin/conversations/${id}/read`, {
      method: "PATCH",
    }).catch(() => {});
  }, []);

  const totalUnread = conversations.reduce((n, c) => n + (c.unread_admin ?? 0), 0);

  return {
    conversations,
    loading,
    filter,
    setFilter,
    totalUnread,
    refetch: fetchConversations,
    markConversationRead,
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

  // Silent fetch (no loading spinner) used for polling so UI doesn't flicker
  const silentFetch = useCallback(async (id: string) => {
    try {
      const result = await apiFetch<{ data: ConvMessage[] }>(
        `/api/admin/conversations/${id}/messages`,
      );
      setMessages(result.data ?? []);
    } catch {
      // Polling errors are silent
    }
  }, []);

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

  // Initial fetch + realtime subscription
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    fetchMessages(conversationId);

    // Subscribe to new messages in this conversation.
    // Realtime is always enabled; polling (below) provides dev/fallback coverage.
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
          // FIX: Supabase Realtime delivers raw snake_case — map to camelCase
          const raw = payload.new as Record<string, unknown>;
          const msg: ConvMessage = {
            id:             raw.id as string,
            conversationId: (raw.conversation_id ?? raw.conversationId) as string,
            senderType:     (raw.sender_type    ?? raw.senderType)     as ConvMessage["senderType"],
            senderId:       (raw.sender_id      ?? raw.senderId)       as string | null,
            senderName:     (raw.sender_name    ?? raw.senderName)     as string,
            message:        raw.message as string,
            isRead:         (raw.is_read        ?? raw.isRead)         as boolean,
            createdAt:      (raw.created_at     ?? raw.createdAt)      as string,
          };
          setMessages((prev) => {
            // Deduplicate: replace optimistic temp message if IDs differ but
            // content is the same (sender + message + close timestamp).
            // Simpler: just skip if real ID already present.
            if (prev.find((m) => m.id === msg.id)) return prev;
            // Replace temp optimistic entry if present (senderType admin, temp id)
            const withoutTemp = prev.filter(
              (m) => !(m.id.startsWith("temp-") && m.senderType === "admin" && m.message === msg.message),
            );
            return [...withoutTemp, msg];
          });
        },
      )
      // Listen for isRead updates on messages (for ✓✓ ticks)
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

  // ── Polling fallback — 5 s, silent (covers dev + realtime outages) ──────────
  useEffect(() => {
    if (!conversationId) return;
    const interval = setInterval(() => silentFetch(conversationId), 5_000);
    return () => clearInterval(interval);
  }, [conversationId, silentFetch]);

  // ── Send with optimistic update ────────────────────────────────────────────
  const sendMessage = useCallback(
    async (message: string, optimisticSenderName = "Admin") => {
      if (!conversationId || !message.trim()) return;

      const tempId = `temp-${Date.now()}`;
      const tempMsg: ConvMessage = {
        id: tempId,
        conversationId,
        senderType: "admin",
        senderId: null,
        senderName: optimisticSenderName,
        message: message.trim(),
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      // Append immediately so the admin sees their own message at once
      setMessages((prev) => [...prev, tempMsg]);

      try {
        const result = await apiFetch<{ data: ConvMessage }>(
          `/api/admin/conversations/${conversationId}/messages`,
          { method: "POST", body: JSON.stringify({ message }) },
        );
        // Replace temp with confirmed server message
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? result.data : m)),
        );
      } catch (err) {
        // Roll back optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        throw err;
      }
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
