/**
 * AdminFloatingChat — Sprint 3 upgrade (chat_architecture.md §6)
 *
 * Rendered via ReactDOM.createPortal → document.body so it is never clipped
 * by stacking contexts, overflow:hidden, or CSS transforms in the admin tree.
 *
 * Changes vs Sprint 1 version:
 *  - Fetch conversations from GET /api/admin/conversations (not /api/admin/chats)
 *  - ConversationList shows name + type label, not booking code
 *  - MiniChatBox uses GET/POST /api/admin/conversations/:id/messages
 *  - Polling 20 s removed → Supabase realtime for unread badge + new messages
 *  - Type labels: "(Tamu)", "(Member)", "(Booking)"
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/shared/integrations/supabase/client";
import { apiFetch } from "@/shared/lib/apiClient";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  ChevronLeft,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { format } from "date-fns";
import { useAuth } from "@/shared/hooks/useAuth";
import { toast } from "sonner";
import type { AdminConversation, ConvMessage } from "../hooks/useAdminInbox";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDisplayName(conv: AdminConversation): string {
  if (conv.type === "guest") return conv.guest_name ?? "Tamu";
  if (conv.type === "member") return conv.member_name ?? "Jemaah";
  return `Booking #${conv.booking_id?.slice(0, 8) ?? ""}`;
}

function getTypeLabel(type: AdminConversation["type"]): string {
  if (type === "guest") return "Tamu";
  if (type === "member") return "Member";
  return "Booking";
}

function getTypeBadgeCls(type: AdminConversation["type"]): string {
  if (type === "guest") return "bg-orange-100 text-orange-700";
  if (type === "member") return "bg-blue-100 text-blue-700";
  return "bg-purple-100 text-purple-700";
}

// ─── MiniChatBox ─────────────────────────────────────────────────────────────

function MiniChatBox({ conv }: { conv: AdminConversation }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ConvMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const mountId = useMemo(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    [],
  );

  const load = useCallback(async () => {
    try {
      const { data } = await apiFetch<{ data: ConvMessage[] }>(
        `/api/admin/conversations/${conv.id}/messages`,
      );
      setMessages(data ?? []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [conv.id]);

  // Initial load + mark as read
  useEffect(() => {
    setLoading(true);
    load();
    apiFetch(`/api/admin/conversations/${conv.id}/read`, {
      method: "PATCH",
    }).catch(() => {});
  }, [conv.id, load]);

  // Realtime subscription — new messages in this conversation
  useEffect(() => {
    const channel = supabase
      .channel(`fab-conv-${conv.id}-${mountId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${conv.id}`,
        },
        (payload) => {
          const msg = payload.new as ConvMessage;
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conv.id, mountId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    if (!text.trim() || !user || sending) return;
    setSending(true);
    try {
      await apiFetch(`/api/admin/conversations/${conv.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ message: text.trim() }),
      });
      setText("");
    } catch {
      toast.error("Gagal mengirim pesan");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Belum ada pesan.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderType === "admin";
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <div className="text-[10px] opacity-60 mb-0.5">
                    {m.senderName} ·{" "}
                    {m.createdAt
                      ? format(new Date(m.createdAt), "HH:mm")
                      : ""}
                  </div>
                  <div className="whitespace-pre-wrap break-words">
                    {m.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      <div className="border-t border-border p-2 flex gap-2 bg-background">
        {conv.status === "closed" ? (
          <p className="text-xs text-muted-foreground text-center w-full py-1">
            Percakapan ditutup
          </p>
        ) : (
          <>
            <Input
              placeholder="Balas pesan..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && send()
              }
              disabled={sending}
              className="text-sm"
            />
            <Button
              onClick={send}
              disabled={sending || !text.trim()}
              size="icon"
              className="shrink-0"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── ConversationList ─────────────────────────────────────────────────────────

function ConversationList({
  conversations,
  loading,
  onSelect,
  onRefresh,
}: {
  conversations: AdminConversation[];
  loading: boolean;
  onSelect: (c: AdminConversation) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      getDisplayName(c).toLowerCase().includes(q) ||
      (c.guest_phone ?? "").toLowerCase().includes(q) ||
      (c.last_message_preview ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-border flex gap-1">
        <Input
          placeholder="Cari nama, HP, pesan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-xs h-8"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onRefresh}
          title="Refresh"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && conversations.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Belum ada percakapan
          </p>
        ) : (
          filtered.map((c) => {
            const name = getDisplayName(c);
            const hasUnread = (c.unread_admin ?? 0) > 0;
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                className="w-full text-left p-2.5 rounded-lg border border-border hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {hasUnread && (
                      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                    )}
                    <span className="font-medium text-xs truncate">
                      {name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span
                      className={`text-[10px] px-1 py-0.5 rounded font-medium ${getTypeBadgeCls(c.type)}`}
                    >
                      {getTypeLabel(c.type)}
                    </span>
                    {hasUnread && (
                      <span className="bg-red-500 text-white text-[10px] rounded-full px-1 min-w-[16px] text-center">
                        {c.unread_admin}
                      </span>
                    )}
                  </div>
                </div>
                {c.guest_phone && (
                  <div className="text-[10px] text-muted-foreground mb-0.5">
                    {c.guest_phone}
                  </div>
                )}
                {c.last_message_preview && (
                  <div className="text-xs text-muted-foreground truncate">
                    {c.last_message_preview}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const AdminFloatingChat = () => {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AdminConversation | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);

  const mountId = useMemo(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    [],
  );

  // ── Fetch conversation list ────────────────────────────────────────────────
  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await apiFetch<{
        data: AdminConversation[];
        total: number;
      }>("/api/admin/conversations?status=open&limit=50");
      const list = result.data ?? [];
      setConversations(list);
      setTotalUnread(list.reduce((n, c) => n + (c.unread_admin ?? 0), 0));
    } catch {
      /* silent — FAB still renders */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ── Realtime: new/updated conversations → update badge & list ────────────
  useEffect(() => {
    const channel = supabase
      .channel(`fab-inbox-${mountId}`)
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
          setTotalUnread((n) => n + (conv.unread_admin ?? 0));
        },
      )
      // Conversation updated (unread_admin, last_message_preview, status…)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        (payload) => {
          const updated = payload.new as AdminConversation;
          setConversations((prev) => {
            const next = prev.map((c) =>
              c.id === updated.id ? { ...c, ...updated } : c,
            );
            setTotalUnread(
              next.reduce((n, c) => n + (c.unread_admin ?? 0), 0),
            );
            return next;
          });
          // Keep selected in sync
          setSelected((sel) =>
            sel?.id === updated.id ? { ...sel, ...updated } : sel,
          );
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [mountId]);

  // Reset unread when panel is opened
  useEffect(() => {
    if (open) setTotalUnread(0);
  }, [open]);

  const handleSelect = (conv: AdminConversation) => {
    setSelected(conv);
    // Optimistically clear this conversation's unread from the badge
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conv.id ? { ...c, unread_admin: 0 } : c,
      ),
    );
    setTotalUnread((n) => Math.max(0, n - (conv.unread_admin ?? 0)));
  };

  // ── Portal render ─────────────────────────────────────────────────────────
  return createPortal(
    <>
      {/* ── FAB trigger ─────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Tutup chat" : "Chat Inbox"}
        style={{ zIndex: 9999 }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center hover:opacity-90 active:scale-95 transition-all"
      >
        {open ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}

        {/* unread badge */}
        {totalUnread > 0 && !open && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow pointer-events-none">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {/* ── Chat panel ──────────────────────────────────────────────────── */}
      {open && (
        <div
          style={{ zIndex: 9998 }}
          className="fixed bottom-24 right-6 w-[360px] max-w-[calc(100vw-3rem)] h-[480px] max-h-[calc(100vh-7rem)] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary text-primary-foreground rounded-t-2xl shrink-0">
            {selected ? (
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setSelected(null)}
                  className="hover:opacity-70 transition-opacity shrink-0"
                  aria-label="Kembali"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {getDisplayName(selected)}
                  </div>
                  <div className="text-[10px] opacity-70">
                    ({getTypeLabel(selected.type)})
                    {selected.guest_phone
                      ? ` · ${selected.guest_phone}`
                      : ""}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span className="text-sm font-semibold">Chat Inbox</span>
                {conversations.length > 0 && (
                  <span className="text-[10px] opacity-70">
                    ({conversations.length})
                  </span>
                )}
              </div>
            )}
            <button
              onClick={() => setOpen(false)}
              aria-label="Tutup"
              className="hover:opacity-70 transition-opacity shrink-0 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* body */}
          <div className="flex-1 min-h-0">
            {selected ? (
              <MiniChatBox conv={selected} />
            ) : (
              <ConversationList
                conversations={conversations}
                loading={loading}
                onSelect={handleSelect}
                onRefresh={() => loadConversations()}
              />
            )}
          </div>
        </div>
      )}
    </>,
    document.body,
  );
};

export default AdminFloatingChat;
