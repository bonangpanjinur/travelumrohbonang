/**
 * ChatInbox — Admin full-page chat inbox (Sprint 2 + Sprint 6 Polish)
 * Route: /admin/chat
 *
 * Sprint 6 additions:
 * - Timestamp format via chatTime utility ("Baru saja", "5 menit lalu", etc.)
 * - Read ticks ✓ / ✓✓ on admin messages
 * - Typing indicator via Supabase presence
 * - Error state & improved empty state
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getDayLabel, formatBubbleTime, formatConvTime } from "@/shared/lib/chatTime";
import { Send, Search, X, UserCheck, CheckCircle, MessageCircle, RefreshCw, Check } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/lib/utils";
import { apiFetch } from "@/shared/lib/apiClient";
import { supabase } from "@/shared/integrations/supabase/client";
import {
  useAdminInbox,
  useConversationMessages,
  type AdminConversation,
  type ConvType,
  type ConvMessage,
} from "../hooks/useAdminInbox";
import { useAuth } from "@/shared/hooks/useAuth";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function getTypeBadgeClass(type: AdminConversation["type"]): string {
  if (type === "guest") return "bg-orange-100 text-orange-700";
  if (type === "member") return "bg-blue-100 text-blue-700";
  return "bg-purple-100 text-purple-700";
}

// ── Conversation list item ────────────────────────────────────────────────────

function ConvItem({
  conv,
  selected,
  onClick,
}: {
  conv: AdminConversation;
  selected: boolean;
  onClick: () => void;
}) {
  const name = getDisplayName(conv);
  const hasUnread = conv.unread_admin > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors",
        selected && "bg-primary/5 border-l-2 border-l-primary",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {hasUnread && (
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            )}
            <span className={cn("font-medium text-sm truncate", hasUnread && "font-semibold")}>
              {name}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", getTypeBadgeClass(conv.type))}>
              {getTypeLabel(conv.type)}
            </span>
            {conv.guest_phone && (
              <span className="text-xs text-muted-foreground truncate">{conv.guest_phone}</span>
            )}
          </div>
          {conv.last_message_preview && (
            <p className="text-xs text-muted-foreground truncate mt-1">
              {conv.last_message_preview}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {formatConvTime(conv.last_message_at ?? conv.created_at)}
          </span>
          {hasUnread && (
            <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
              {conv.unread_admin}
            </span>
          )}
          {conv.status === "closed" && (
            <span className="text-xs text-muted-foreground">Selesai</span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Read tick ─────────────────────────────────────────────────────────────────

function ReadTick({ isRead }: { isRead: boolean }) {
  if (isRead) {
    // ✓✓ delivered/read
    return (
      <span className="inline-flex items-center gap-0 text-blue-300" title="Dibaca">
        <Check className="w-3 h-3 -mr-1.5" strokeWidth={3} />
        <Check className="w-3 h-3" strokeWidth={3} />
      </span>
    );
  }
  // ✓ sent
  return (
    <span className="inline-flex text-white/60" title="Terkirim">
      <Check className="w-3 h-3" strokeWidth={3} />
    </span>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ConvMessage }) {
  const isAdmin = msg.senderType === "admin";
  const bubbleTime = formatBubbleTime(msg.createdAt);

  return (
    <div className={cn("flex flex-col gap-0.5 mb-3", isAdmin ? "items-end" : "items-start")}>
      <span className="text-xs text-muted-foreground px-1">{msg.senderName}</span>
      <div
        className={cn(
          "max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words",
          isAdmin
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-gray-100 text-gray-900 rounded-tl-sm",
        )}
      >
        {msg.message}
      </div>
      <div className="flex items-center gap-1 px-1">
        <span className="text-xs text-muted-foreground">{bubbleTime}</span>
        {isAdmin && <ReadTick isRead={msg.isRead} />}
      </div>
    </div>
  );
}

// ── Day separator ─────────────────────────────────────────────────────────────

function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs text-muted-foreground bg-gray-50 px-2 whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-end gap-1.5 mb-3">
      <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 flex gap-1 items-center">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-xs text-muted-foreground mb-1">mengetik…</span>
    </div>
  );
}

// ── Right panel — chat window ─────────────────────────────────────────────────

function ChatPanel({
  conv,
  onClose,
  onAssign,
  onCloseConv,
  currentUserId,
}: {
  conv: AdminConversation;
  onClose: () => void;
  onAssign: (id: string) => void;
  onCloseConv: (id: string) => void;
  currentUserId?: string;
}) {
  const { messages, loading, sendMessage, markRead } = useConversationMessages(conv.id);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Keep a ref to the subscribed presence channel so broadcastTyping uses the same instance
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Unique channel ID per admin + conversation
  const presenceKey = useMemo(
    () => `admin-${currentUserId ?? "anon"}-${Date.now()}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conv.id, currentUserId],
  );

  const name = getDisplayName(conv);

  // Mark as read when panel is opened
  useEffect(() => {
    if (conv.unread_admin > 0) markRead();
  }, [conv.id, conv.unread_admin, markRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ── Supabase presence — typing indicator ──────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel(`chat-typing-${conv.id}`)
      .on("presence", { event: "sync" }, () => {
        const state = ch.presenceState<{ typing?: boolean; role?: string }>();
        const anyUserTyping = Object.values(state).some((presences) =>
          presences.some((p) => p.typing && p.role !== "admin"),
        );
        setPeerTyping(anyUserTyping);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        if (newPresences.some((p: any) => p.typing && p.role !== "admin")) {
          setPeerTyping(true);
        }
      })
      .on("presence", { event: "leave" }, () => {
        const state = ch.presenceState<{ typing?: boolean; role?: string }>();
        const anyUserTyping = Object.values(state).some((presences) =>
          presences.some((p) => p.typing && p.role !== "admin"),
        );
        setPeerTyping(anyUserTyping);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.track({ role: "admin", typing: false, key: presenceKey });
        }
      });

    // Store the subscribed channel instance in the ref
    presenceChannelRef.current = ch;

    return () => {
      presenceChannelRef.current = null;
      supabase.removeChannel(ch);
    };
  }, [conv.id, presenceKey]);

  // Broadcast typing state using the already-subscribed channel ref
  const broadcastTyping = useCallback(
    (typing: boolean) => {
      presenceChannelRef.current?.track({ role: "admin", typing, key: presenceKey });
    },
    [presenceKey],
  );

  const handleDraftChange = (val: string) => {
    setDraft(val);
    broadcastTyping(val.length > 0);
    clearTimeout(typingTimeout.current);
    if (val.length > 0) {
      typingTimeout.current = setTimeout(() => broadcastTyping(false), 3000);
    }
  };

  const handleSend = useCallback(async () => {
    if (!draft.trim() || sending) return;
    broadcastTyping(false);
    setSending(true);
    try {
      await sendMessage(draft.trim());
      setDraft("");
      textareaRef.current?.focus();
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setSending(false);
    }
  }, [draft, sending, sendMessage, broadcastTyping]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCloseConv = async () => {
    setClosing(true);
    try {
      await apiFetch(`/api/admin/conversations/${conv.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: conv.status === "open" ? "closed" : "open" }),
      });
      onCloseConv(conv.id);
    } catch (err) {
      console.error("Close failed:", err);
    } finally {
      setClosing(false);
    }
  };

  const handleAssign = async () => {
    if (!currentUserId) return;
    setAssigning(true);
    try {
      await apiFetch(`/api/admin/conversations/${conv.id}`, {
        method: "PATCH",
        body: JSON.stringify({ assignedAdminId: currentUserId }),
      });
      onAssign(conv.id);
    } catch (err) {
      console.error("Assign failed:", err);
    } finally {
      setAssigning(false);
    }
  };

  // Group messages by day
  const grouped: Array<
    { kind: "sep"; label: string } | { kind: "msg"; msg: ConvMessage }
  > = useMemo(() => {
    const result: Array<{ kind: "sep"; label: string } | { kind: "msg"; msg: ConvMessage }> = [];
    let lastDay = "";
    for (const msg of messages) {
      const dayLabel = getDayLabel(msg.createdAt);
      if (dayLabel && dayLabel !== lastDay) {
        result.push({ kind: "sep", label: dayLabel });
        lastDay = dayLabel;
      }
      result.push({ kind: "msg", msg });
    }
    return result;
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-white flex items-start justify-between gap-2 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-base truncate">{name}</h2>
            <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0", getTypeBadgeClass(conv.type))}>
              {getTypeLabel(conv.type)}
            </span>
            {conv.status === "closed" && (
              <Badge variant="secondary" className="text-xs flex-shrink-0">Selesai</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            {conv.guest_phone && (
              <span className="text-xs text-muted-foreground">📞 {conv.guest_phone}</span>
            )}
            {conv.guest_email && (
              <span className="text-xs text-muted-foreground">✉️ {conv.guest_email}</span>
            )}
            {conv.assigned_admin_id && (
              <span className="text-xs text-muted-foreground">👤 Ditangani admin</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2"
            disabled={assigning}
            onClick={handleAssign}
            title="Assign ke saya"
          >
            <UserCheck className="w-3.5 h-3.5 mr-1" />
            Assign
          </Button>
          <Button
            size="sm"
            variant={conv.status === "open" ? "outline" : "default"}
            className="text-xs h-7 px-2"
            disabled={closing}
            onClick={handleCloseConv}
          >
            <CheckCircle className="w-3.5 h-3.5 mr-1" />
            {conv.status === "open" ? "Tutup" : "Buka Lagi"}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Memuat pesan…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
            <MessageCircle className="w-8 h-8 opacity-30" />
            <span className="text-sm">Belum ada pesan</span>
          </div>
        ) : (
          <>
            {grouped.map((item, idx) =>
              item.kind === "sep" ? (
                <DaySeparator key={`sep-${idx}`} label={item.label} />
              ) : (
                <MessageBubble key={item.msg.id} msg={item.msg} />
              ),
            )}
            {peerTyping && <TypingDots />}
          </>
        )}
        <div ref={bottomRef} />
      </ScrollArea>

      {/* Input */}
      <div className="px-4 py-3 border-t bg-white flex-shrink-0">
        {conv.status === "closed" ? (
          <p className="text-sm text-center text-muted-foreground py-1">
            Percakapan ini telah ditutup.{" "}
            <button className="underline text-primary" onClick={handleCloseConv}>
              Buka kembali
            </button>
          </p>
        ) : (
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              placeholder="Ketik balasan… (Enter kirim, Shift+Enter baris baru)"
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="resize-none min-h-[60px] max-h-[120px] text-sm"
              rows={2}
            />
            <Button
              size="icon"
              disabled={!draft.trim() || sending}
              onClick={handleSend}
              className="h-10 w-10 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ChatInbox() {
  const { user } = useAuth();
  const { conversations, loading, filter, setFilter, totalUnread, refetch } = useAdminInbox();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null;

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setFilter((f) => ({ ...f, search: searchInput }));
    }, 350);
    return () => clearTimeout(searchTimeout.current);
  }, [searchInput, setFilter]);

  const handleTabChange = (tab: string) => {
    if (tab === "unread") {
      setFilter((f) => ({ ...f, type: "all", unreadOnly: true }));
    } else {
      setFilter((f) => ({ ...f, type: tab as ConvType, unreadOnly: false }));
    }
    setSelectedId(null);
  };

  const activeTab =
    filter.unreadOnly ? "unread" : filter.type === "all" ? "all" : filter.type;

  const handleCloseConv = useCallback(
    (_id: string) => {
      refetch(filter);
    },
    [refetch, filter],
  );

  const handleAssign = useCallback(
    (_id: string) => {
      refetch(filter);
    },
    [refetch, filter],
  );

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white rounded-lg border shadow-sm overflow-hidden">
      {/* ── Left panel — conversation list ──────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 border-r flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-base">Chat Inbox</h1>
            {totalUnread > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5">
                {totalUnread}
              </Badge>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => refetch(filter)}
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="px-3 pt-2">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="w-full h-8 text-xs">
              <TabsTrigger value="all" className="flex-1 text-xs px-1">Semua</TabsTrigger>
              <TabsTrigger value="guest" className="flex-1 text-xs px-1">Tamu</TabsTrigger>
              <TabsTrigger value="member" className="flex-1 text-xs px-1">Member</TabsTrigger>
              <TabsTrigger value="unread" className="flex-1 text-xs px-1">Belum Dibaca</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari nama, HP, pesan..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
            {searchInput && (
              <button
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
                onClick={() => setSearchInput("")}
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Memuat…
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2 px-4 text-center">
              <MessageCircle className="w-10 h-10 opacity-20" />
              <span className="text-sm font-medium">Belum ada percakapan</span>
              <span className="text-xs">Percakapan dari tamu &amp; jemaah akan muncul di sini</span>
            </div>
          ) : (
            conversations.map((conv) => (
              <ConvItem
                key={conv.id}
                conv={conv}
                selected={conv.id === selectedId}
                onClick={() => setSelectedId(conv.id)}
              />
            ))
          )}
        </ScrollArea>
      </div>

      {/* ── Right panel — chat window ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedConv ? (
          <ChatPanel
            conv={selectedConv}
            onClose={() => setSelectedId(null)}
            onAssign={handleAssign}
            onCloseConv={handleCloseConv}
            currentUserId={user?.id}
          />
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-3">
            <MessageCircle className="w-16 h-16 opacity-20" />
            <div className="text-center">
              <p className="text-base font-medium mb-1">Pilih percakapan</p>
              <p className="text-sm">Klik percakapan di sebelah kiri untuk mulai membalas</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
