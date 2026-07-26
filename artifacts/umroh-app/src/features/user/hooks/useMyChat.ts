/**
 * useMyChat — Sprint 4 (chat_architecture.md §6)
 *
 * Hook untuk jemaah yang sudah login.
 * - Buat atau resume conversation (type='member') via POST /api/chat/start
 * - Fetch pesan via GET /api/chat/conversations/:id/messages
 * - Subscribe Supabase realtime untuk pesan baru
 * - Send pesan via POST /api/chat/conversations/:id/messages
 * - Mark as read via PATCH /api/chat/conversations/:id/read
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import { apiFetch } from "@/shared/lib/apiClient";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MyChatMessage {
  id: string;
  conversationId: string;
  senderType: "admin" | "member" | "guest";
  senderId: string | null;
  senderName: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMyChat() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MyChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [startError, setStartError] = useState<string | null>(null);

  // Unique mount ID to prevent duplicate Supabase channels under React Strict Mode
  const mountId = useMemo(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    [],
  );

  // ── Start / resume conversation ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const result = await apiFetch<{ conversationId: string; resumed: boolean }>(
          "/api/chat/start",
          { method: "POST", body: JSON.stringify({}) },
        );
        if (!cancelled) {
          setConversationId(result.conversationId);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[useMyChat] start error:", err);
          setStartError("Gagal memulai sesi chat. Silakan coba lagi.");
          setLoading(false);
        }
      }
    }

    start();
    return () => { cancelled = true; };
  }, []);

  // ── Fetch messages once conversationId is known ────────────────────────────
  const fetchMessages = useCallback(async (id: string) => {
    try {
      const result = await apiFetch<{ data: MyChatMessage[] }>(
        `/api/chat/conversations/${id}/messages`,
      );
      setMessages(result.data ?? []);
    } catch (err) {
      console.error("[useMyChat] fetchMessages:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    fetchMessages(conversationId);
  }, [conversationId, fetchMessages]);

  // ── Supabase realtime — new messages in this conversation ──────────────────
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`my-chat-${conversationId}-${mountId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // Supabase Realtime delivers raw DB column names (snake_case);
          // map to the camelCase interface before use.
          const raw = payload.new as Record<string, unknown>;
          const msg: MyChatMessage = {
            id:             raw.id as string,
            conversationId: (raw.conversation_id ?? raw.conversationId) as string,
            senderType:     (raw.sender_type    ?? raw.senderType)     as MyChatMessage["senderType"],
            senderId:       (raw.sender_id      ?? raw.senderId)       as string | null,
            senderName:     (raw.sender_name    ?? raw.senderName)     as string,
            message:        raw.message as string,
            isRead:         (raw.is_read        ?? raw.isRead)         as boolean,
            createdAt:      (raw.created_at     ?? raw.createdAt)      as string,
          };
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, mountId]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (message: string) => {
      if (!conversationId || !message.trim()) return;
      await apiFetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      // Realtime subscription will append the message automatically
    },
    [conversationId],
  );

  const markRead = useCallback(async () => {
    if (!conversationId) return;
    await apiFetch(`/api/chat/conversations/${conversationId}/read`, {
      method: "PATCH",
    }).catch(() => {});
  }, [conversationId]);

  return {
    conversationId,
    messages,
    loading,
    startError,
    sendMessage,
    markRead,
  };
}
