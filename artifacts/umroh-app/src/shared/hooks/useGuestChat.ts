/**
 * useGuestChat — Sprint 5 (chat_architecture.md §6 Sprint 5)
 *
 * Hook untuk tamu / calon jemaah (belum punya akun).
 * - Cek localStorage untuk vins_guest_chat_token
 * - Jika ada → resume conversation via POST /api/chat/start (X-Guest-Token header)
 * - Jika tidak ada → expose startChat({name, phone, email}) untuk membuat sesi baru
 * - Subscribe Supabase realtime untuk pesan baru (INSERT on conversation_messages)
 * - Send pesan via POST /api/chat/conversations/:id/messages
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/shared/integrations/supabase/client";

export const GUEST_TOKEN_KEY = "vins_guest_chat_token";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GuestMessage {
  id: string;
  conversationId: string;
  senderType: "admin" | "member" | "guest";
  senderId: string | null;
  senderName: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export type GuestChatStatus = "idle" | "loading" | "ready" | "error";

// ── Internal fetch (no JWT, optional X-Guest-Token) ───────────────────────────

async function guestFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("X-Guest-Token", token);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(
      (body as { error?: string }).error ?? `HTTP ${res.status}`,
    );
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useGuestChat() {
  const [guestToken, setGuestToken] = useState<string | null>(
    () => localStorage.getItem(GUEST_TOKEN_KEY),
  );
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [status, setStatus] = useState<GuestChatStatus>(
    // If we already have a token, start loading immediately
    () => (localStorage.getItem(GUEST_TOKEN_KEY) ? "loading" : "idle"),
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Unique mount ID — prevents duplicate Supabase channels under React Strict Mode
  const mountId = useMemo(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    [],
  );

  // ── Auto-resume if localStorage token exists ───────────────────────────────
  useEffect(() => {
    if (!guestToken) return;
    let cancelled = false;

    async function resume() {
      try {
        const result = await guestFetch<{
          conversationId: string;
          resumed: boolean;
        }>(
          "/api/chat/start",
          { method: "POST", body: JSON.stringify({}) },
          guestToken!,
        );
        if (!cancelled) {
          setConversationId(result.conversationId);
          setStatus("ready");
        }
      } catch (err) {
        if (!cancelled) {
          // Token is stale — clear and fall back to form
          console.warn("[useGuestChat] resume failed, clearing token:", err);
          localStorage.removeItem(GUEST_TOKEN_KEY);
          setGuestToken(null);
          setStatus("idle");
        }
      }
    }

    resume();
    return () => {
      cancelled = true;
    };
  }, [guestToken]);

  // ── Fetch messages once conversationId is known ────────────────────────────
  const fetchMessages = useCallback(
    async (id: string, token: string) => {
      try {
        const result = await guestFetch<{ data: GuestMessage[] }>(
          `/api/chat/conversations/${id}/messages`,
          {},
          token,
        );
        const msgs = result.data ?? [];
        // Merge: pertahankan pesan lokal (optimistic) yang belum ada di server
        setMessages((prev) => {
          const ids = new Set(msgs.map((m) => m.id));
          const pending = prev.filter((m) => !ids.has(m.id) && m.id.startsWith("local-"));
          return [...msgs, ...pending];
        });
        // FIX: initialise unread count from actual DB state (admin messages not yet read)
        const unread = msgs.filter((m) => m.senderType === "admin" && !m.isRead).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error("[useGuestChat] fetchMessages:", err);
      }
    },
    [],
  );

  useEffect(() => {
    if (!conversationId || !guestToken) return;
    fetchMessages(conversationId, guestToken);
  }, [conversationId, guestToken, fetchMessages]);

  // ── Polling fallback — 5 s ────────────────────────────────────────────────
  // Realtime bisa tidak tersedia (tabel belum masuk publication, koneksi WS
  // diblokir jaringan). Polling ringan memastikan balasan admin tetap masuk.
  useEffect(() => {
    if (!conversationId || !guestToken) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      fetchMessages(conversationId, guestToken);
    }, 5_000);
    return () => clearInterval(interval);
  }, [conversationId, guestToken, fetchMessages]);


  // ── Supabase realtime — new messages ──────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`guest-chat-${conversationId}-${mountId}`)
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
          const msg: GuestMessage = {
            id:             raw.id as string,
            conversationId: (raw.conversation_id ?? raw.conversationId) as string,
            senderType:     (raw.sender_type    ?? raw.senderType)     as GuestMessage["senderType"],
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
          // Count unread only for messages from admin
          if (msg.senderType === "admin") {
            setUnreadCount((c) => c + 1);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, mountId]);

  // ── Start new guest session (called from form submit) ─────────────────────
  const startChat = useCallback(
    async (params: { name: string; phone: string; email?: string }) => {
      setStatus("loading");
      setError(null);
      try {
        const result = await guestFetch<{
          conversationId: string;
          guestToken: string;
          resumed: boolean;
        }>("/api/chat/start", {
          method: "POST",
          body: JSON.stringify({
            name: params.name,
            phone: params.phone,
            email: params.email,
          }),
        });
        localStorage.setItem(GUEST_TOKEN_KEY, result.guestToken);
        setGuestToken(result.guestToken);
        setConversationId(result.conversationId);
        setStatus("ready");
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Gagal memulai chat";
        setError(msg);
        setStatus("idle");
      }
    },
    [],
  );

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (message: string) => {
      if (!conversationId || !guestToken || !message.trim()) return;
      await guestFetch(
        `/api/chat/conversations/${conversationId}/messages`,
        { method: "POST", body: JSON.stringify({ message }) },
        guestToken,
      );
      // Realtime subscription will append the message
    },
    [conversationId, guestToken],
  );

  // ── Mark as read ──────────────────────────────────────────────────────────
  const markRead = useCallback(async () => {
    if (!conversationId || !guestToken) return;
    setUnreadCount(0);
    await guestFetch(
      `/api/chat/conversations/${conversationId}/read`,
      { method: "PATCH" },
      guestToken,
    ).catch(() => {});
  }, [conversationId, guestToken]);

  return {
    /** true if a token exists in localStorage (returning visitor) */
    hasExistingSession: !!guestToken,
    status,
    error,
    conversationId,
    messages,
    unreadCount,
    startChat,
    sendMessage,
    markRead,
  };
}
