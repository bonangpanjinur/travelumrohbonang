/**
 * ChatPage — Halaman chat jemaah (logged-in) dengan admin
 * Route: /chat
 * Sprint 4 + Sprint 6 Polish (chat_architecture.md §6)
 *
 * Sprint 6 additions:
 * - Timestamp format via chatTime utility
 * - Read ticks ✓ / ✓✓ on sent messages
 * - Typing indicator via Supabase presence
 * - Error & empty states polished
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { getDayLabel, formatBubbleTime } from "@/shared/lib/chatTime";
import { Send, MessageCircle, AlertCircle, Loader2, Clock, Check } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { cn } from "@/shared/lib/utils";
import { supabase } from "@/shared/integrations/supabase/client";
import Navbar from "@/shared/components/layout/Navbar";
import Footer from "@/shared/components/layout/Footer";
import { useMyChat, type MyChatMessage } from "../hooks/useMyChat";
import { useAuth } from "@/shared/hooks/useAuth";

// ── Read tick ─────────────────────────────────────────────────────────────────

function ReadTick({ isRead }: { isRead: boolean }) {
  if (isRead) {
    return (
      <span className="inline-flex items-center gap-0 text-blue-300" title="Dibaca">
        <Check className="w-3 h-3 -mr-1.5" strokeWidth={3} />
        <Check className="w-3 h-3" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span className="inline-flex text-primary-foreground/50" title="Terkirim">
      <Check className="w-3 h-3" strokeWidth={3} />
    </span>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function Bubble({ msg, myUserId }: { msg: MyChatMessage; myUserId?: string }) {
  const isMe = msg.senderType === "member" ||
    (msg.senderId != null && msg.senderId === myUserId);
  const bubbleTime = formatBubbleTime(msg.createdAt);

  return (
    <div className={cn("flex flex-col gap-0.5 mb-3", isMe ? "items-end" : "items-start")}>
      <span className="text-xs text-muted-foreground px-1">{msg.senderName}</span>
      <div
        className={cn(
          "max-w-[78%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words shadow-sm",
          isMe
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-white text-gray-900 border border-gray-100 rounded-tl-sm",
        )}
      >
        {msg.message}
      </div>
      <div className="flex items-center gap-1 px-1">
        <span className="text-[10px] text-muted-foreground">{bubbleTime}</span>
        {isMe && <ReadTick isRead={msg.isRead} />}
      </div>
    </div>
  );
}

// ── Day separator ─────────────────────────────────────────────────────────────

function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gray-100" />
      <span className="text-xs text-muted-foreground bg-background px-2 whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

// ── Typing dots ───────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-end gap-1.5 mb-3">
      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 flex gap-1 items-center shadow-sm">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-xs text-muted-foreground mb-1">Admin sedang mengetik…</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { user } = useAuth();
  const { conversationId, messages, loading, startError, sendMessage, markRead } = useMyChat();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Keep a ref to the subscribed presence channel so broadcastTyping uses the same instance
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const mountId = useMemo(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    [],
  );

  // Mark as read when page is opened
  useEffect(() => {
    markRead();
  }, [markRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ── Supabase presence — detect admin typing ────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;

    const ch = supabase
      .channel(`chat-typing-${conversationId}`)
      .on("presence", { event: "sync" }, () => {
        const state = ch.presenceState<{ typing?: boolean; role?: string }>();
        const adminIsTyping = Object.values(state).some((presences) =>
          presences.some((p) => p.typing && p.role === "admin"),
        );
        setAdminTyping(adminIsTyping);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        if (newPresences.some((p: any) => p.typing && p.role === "admin")) {
          setAdminTyping(true);
        }
      })
      .on("presence", { event: "leave" }, () => {
        const state = ch.presenceState<{ typing?: boolean; role?: string }>();
        const adminIsTyping = Object.values(state).some((presences) =>
          presences.some((p) => p.typing && p.role === "admin"),
        );
        setAdminTyping(adminIsTyping);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.track({ role: "member", typing: false, key: mountId });
        }
      });

    // Store subscribed channel in ref so broadcastTyping can reuse the same instance
    presenceChannelRef.current = ch;

    return () => {
      presenceChannelRef.current = null;
      supabase.removeChannel(ch);
    };
  }, [conversationId, mountId]);

  // Broadcast member typing state using the already-subscribed channel ref
  const broadcastTyping = useCallback(
    (typing: boolean) => {
      presenceChannelRef.current?.track({ role: "member", typing, key: mountId });
    },
    [mountId],
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
      console.error("[ChatPage] send error:", err);
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

  // Build grouped messages with day separators
  const grouped: Array<{ type: "separator"; label: string } | { type: "message"; msg: MyChatMessage }> =
    useMemo(() => {
      const result: Array<{ type: "separator"; label: string } | { type: "message"; msg: MyChatMessage }> = [];
      let lastDay = "";
      for (const msg of messages) {
        if (msg.createdAt) {
          const dayLabel = getDayLabel(msg.createdAt);
          if (dayLabel && dayLabel !== lastDay) {
            result.push({ type: "separator", label: dayLabel });
            lastDay = dayLabel;
          }
        }
        result.push({ type: "message", msg });
      }
      return result;
    }, [messages]);

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Navbar />

      <main className="flex-1 pt-20 pb-6 flex flex-col">
        <div className="container mx-auto max-w-2xl flex-1 flex flex-col gap-4 px-4">

          {/* Header */}
          <div className="pt-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">Chat dengan Admin</h1>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Biasanya membalas dalam 1 jam
                </div>
              </div>
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden min-h-[60vh]">

            {/* Error state */}
            {startError && (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center p-8">
                <AlertCircle className="w-10 h-10 text-destructive opacity-60" />
                <p className="text-sm text-muted-foreground font-medium">
                  Gagal memuat pesan, coba lagi
                </p>
                <p className="text-xs text-muted-foreground">{startError}</p>
                <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                  Coba Lagi
                </Button>
              </div>
            )}

            {/* Loading state */}
            {!startError && loading && (
              <div className="flex flex-col items-center justify-center flex-1 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Memuat percakapan…</span>
              </div>
            )}

            {/* Messages */}
            {!startError && !loading && (
              <ScrollArea className="flex-1 px-4 py-4 bg-gray-50/60">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full pt-16 gap-3 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageCircle className="w-8 h-8 text-primary opacity-50" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 mb-1">
                        Halo{user?.firstName ? `, ${user.firstName}` : ""}! 👋
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Belum ada percakapan — mulai chat sekarang!<br />
                        Admin kami siap membantu.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {grouped.map((item, idx) =>
                      item.type === "separator" ? (
                        <DaySeparator key={`sep-${idx}`} label={item.label} />
                      ) : (
                        <Bubble key={item.msg.id} msg={item.msg} myUserId={user?.id} />
                      ),
                    )}
                    {adminTyping && <TypingDots />}
                  </>
                )}
                <div ref={bottomRef} />
              </ScrollArea>
            )}

            {/* Input */}
            {!startError && (
              <div className="px-4 py-3 border-t bg-white flex gap-2 items-end flex-shrink-0">
                <Textarea
                  ref={textareaRef}
                  placeholder="Ketik pesan… (Enter kirim, Shift+Enter baris baru)"
                  value={draft}
                  onChange={(e) => handleDraftChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading || sending}
                  className="resize-none min-h-[60px] max-h-[120px] text-sm"
                  rows={2}
                />
                <Button
                  size="icon"
                  className="h-10 w-10 flex-shrink-0"
                  disabled={!draft.trim() || sending || loading}
                  onClick={handleSend}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
