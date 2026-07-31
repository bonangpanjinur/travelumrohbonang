/**
 * GuestChatWidget — Sprint 5 + Sprint 6 Polish (chat_architecture.md §4.4)
 *
 * Floating Action Button untuk tamu / calon jemaah (anonymous).
 * Muncul di halaman publik; tidak render jika user sudah login.
 *
 * Sprint 6 additions:
 * - Mobile responsive: full-screen on small screens
 * - Typing indicator via Supabase presence ("Admin sedang mengetik...")
 * - Timestamp format via chatTime utility
 * - Read ticks ✓ / ✓✓ on sent messages
 * - Empty state & error state polished
 *
 * State machine:
 *   collapsed → FAB only (dengan unread badge)
 *   form      → panel form identitas (nama, HP, email)
 *   chat      → panel jendela pesan + input kirim
 */

import { useState, useEffect, useRef, useCallback, useMemo, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, ChevronDown, Loader2, AlertCircle, Check } from "lucide-react";
import { useAuth } from "@/shared/hooks/useAuth";
import { useGuestChat } from "@/shared/hooks/useGuestChat";
import { supabase } from "@/shared/integrations/supabase/client";
import { formatBubbleTime } from "@/shared/lib/chatTime";

// ── Types ─────────────────────────────────────────────────────────────────────

type PanelState = "collapsed" | "form" | "chat";

// ── Read tick ─────────────────────────────────────────────────────────────────

function ReadTick({ isRead }: { isRead: boolean }) {
  if (isRead) {
    return (
      <span className="inline-flex items-center gap-0 text-blue-300" title="Dibaca">
        <Check className="w-2.5 h-2.5 -mr-1.5" strokeWidth={3} />
        <Check className="w-2.5 h-2.5" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span className="inline-flex text-white/50" title="Terkirim">
      <Check className="w-2.5 h-2.5" strokeWidth={3} />
    </span>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Form step — collect guest identity before starting chat */
function IdentityForm({
  onSubmit,
  loading,
  error,
}: {
  onSubmit: (name: string, phone: string, email: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    onSubmit(name.trim(), phone.trim(), email.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Nama Lengkap <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Contoh: Ahmad Fauzi"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          No. WhatsApp <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          placeholder="0812-xxxx-xxxx"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          disabled={loading}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Email{" "}
          <span className="text-gray-400 font-normal">(opsional)</span>
        </label>
        <input
          type="email"
          placeholder="email@contoh.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !name.trim() || !phone.trim()}
        className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Memulai...
          </>
        ) : (
          <>
            Mulai Chat
            <Send className="w-3.5 h-3.5" />
          </>
        )}
      </button>
    </form>
  );
}

/** Message bubble */
function MessageBubble({
  senderType,
  senderName,
  message,
  createdAt,
  isRead,
}: {
  senderType: "admin" | "member" | "guest";
  senderName: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}) {
  const isGuest = senderType === "guest";
  const bubbleTime = formatBubbleTime(createdAt);

  return (
    <div className={`flex flex-col gap-0.5 ${isGuest ? "items-end" : "items-start"}`}>
      {!isGuest && (
        <span className="text-[10px] text-gray-400 ml-1">{senderName}</span>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
          isGuest
            ? "rounded-br-sm bg-indigo-600 text-white"
            : "rounded-bl-sm bg-gray-100 text-gray-800"
        }`}
      >
        {message}
      </div>
      <div className="flex items-center gap-1 mx-1">
        <span className="text-[10px] text-gray-400">{bubbleTime}</span>
        {isGuest && <ReadTick isRead={isRead} />}
      </div>
    </div>
  );
}

/** Typing dots */
function TypingDots() {
  return (
    <div className="flex items-end gap-1.5">
      <div className="rounded-2xl rounded-bl-sm bg-gray-100 px-3 py-2 flex gap-1 items-center">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-[10px] text-gray-400 mb-1">Admin mengetik…</span>
    </div>
  );
}

/** Chat panel — messages + input */
function ChatPanel({
  messages,
  onSend,
  loading,
  conversationId,
}: {
  messages: ReturnType<typeof useGuestChat>["messages"];
  onSend: (msg: string) => Promise<void>;
  loading: boolean;
  conversationId: string | null;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Keep a ref to the subscribed presence channel so broadcastTyping uses the same instance
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const mountId = useMemo(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    [],
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, adminTyping]);

  // ── Supabase presence — detect admin typing ──────────────────────────────
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
          await ch.track({ role: "guest", typing: false, key: mountId });
        }
      });

    // Store subscribed channel in ref so broadcastTyping can reuse the same instance
    presenceChannelRef.current = ch;

    return () => {
      presenceChannelRef.current = null;
      supabase.removeChannel(ch);
    };
  }, [conversationId, mountId]);

  // Broadcast guest typing using the already-subscribed channel ref
  const broadcastTyping = useCallback(
    (typing: boolean) => {
      presenceChannelRef.current?.track({ role: "guest", typing, key: mountId });
    },
    [mountId],
  );

  const handleTextChange = (val: string) => {
    setText(val);
    broadcastTyping(val.length > 0);
    clearTimeout(typingTimeout.current);
    if (val.length > 0) {
      typingTimeout.current = setTimeout(() => broadcastTyping(false), 3000);
    }
  };

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    broadcastTyping(false);
    setText("");
    setSending(true);
    try {
      await onSend(trimmed);
    } finally {
      setSending(false);
    }
  }, [text, sending, onSend, broadcastTyping]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages scroll area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 min-h-0">
        {loading && messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400 py-8">
            <MessageCircle className="w-8 h-8 opacity-30" />
            <p className="text-xs text-center">
              Belum ada percakapan — mulai chat sekarang!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              senderType={msg.senderType}
              senderName={msg.senderName}
              message={msg.message}
              createdAt={msg.createdAt}
              isRead={msg.isRead}
            />
          ))
        )}
        {adminTyping && <TypingDots />}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-100 p-3 flex gap-2 items-end">
        <textarea
          rows={1}
          placeholder="Ketik pesan... (Enter untuk kirim)"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60 max-h-24 leading-relaxed"
        />
        <button
          onClick={() => void handleSend()}
          disabled={!text.trim() || sending}
          className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

// ── Main Widget ───────────────────────────────────────────────────────────────

interface GuestChatWidgetProps {
  /**
   * Controlled mode — hides the standalone FAB and lets the parent drive
   * open/close state. Pass `controlledOpen={true}` to show the panel.
   */
  controlledOpen?: boolean;
  onControlledClose?: () => void;
}

export default function GuestChatWidget({
  controlledOpen,
  onControlledClose,
}: GuestChatWidgetProps = {}) {
  const { user, loading: authLoading } = useAuth();

  const {
    hasExistingSession,
    status,
    error,
    messages,
    unreadCount,
    conversationId,
    startChat,
    sendMessage,
    markRead,
  } = useGuestChat();

  const isControlled = controlledOpen !== undefined;

  // Panel display state (used only in standalone / uncontrolled mode)
  const [panel, setPanel] = useState<PanelState>("collapsed");

  // In controlled mode, derive the effective panel from hasExistingSession/status
  const effectivePanel: PanelState = isControlled
    ? controlledOpen
      ? status === "ready" || hasExistingSession
        ? "chat"
        : "form"
      : "collapsed"
    : panel;

  // When panel opens to chat, mark messages as read
  useEffect(() => {
    if (effectivePanel === "chat") {
      void markRead();
    }
  }, [effectivePanel, markRead]);

  // Don't render for logged-in users — they use useMyChat / /chat route
  if (authLoading) return null;
  if (user) return null;

  const fabBadge = unreadCount > 0 && effectivePanel === "collapsed";

  const openPanel = () => {
    if (status === "ready" || hasExistingSession) {
      setPanel("chat");
    } else {
      setPanel("form");
    }
  };

  const handleFormSubmit = async (name: string, phone: string, email: string) => {
    await startChat({ name, phone, email });
    if (!isControlled) setPanel("chat");
  };

  const handleCollapse = () => {
    if (isControlled) {
      onControlledClose?.();
    } else {
      setPanel("collapsed");
    }
  };

  // Shared chat panel markup
  const chatPanelMarkup = (
    <motion.div
      key="chat-panel"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      // Mobile: full-screen. Desktop: fixed width floating card.
      className={[
        "bg-white shadow-2xl border border-gray-100 flex flex-col overflow-hidden",
        // Mobile full-screen
        "fixed inset-0 rounded-none",
        // sm and above: floating card
        "sm:static sm:inset-auto sm:w-[360px] sm:rounded-2xl",
      ].join(" ")}
      style={{
        maxHeight: "min(520px, calc(100vh - 112px))",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-indigo-600 text-white flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <MessageCircle className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-none">Chat dengan Admin</p>
          <p className="text-[10px] text-indigo-200 mt-0.5">
            Biasanya membalas dalam 1 jam
          </p>
        </div>
        <button
          onClick={handleCollapse}
          className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
          aria-label="Minimasi chat"
        >
          <ChevronDown className="w-4 h-4 sm:block hidden" />
          <X className="w-4 h-4 sm:hidden" />
        </button>
        <button
          onClick={handleCollapse}
          className="w-7 h-7 rounded-full hover:bg-white/20 items-center justify-center transition-colors hidden sm:flex"
          aria-label="Tutup chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body — form or chat */}
      <div className="flex flex-col flex-1 min-h-0">
        {effectivePanel === "form" ? (
          <>
            <div className="px-4 pt-4 pb-1 text-center flex-shrink-0">
              <p className="text-sm font-semibold text-gray-800">Ada pertanyaan?</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Admin kami siap membantu. Isi data di bawah untuk mulai.
              </p>
            </div>
            <div className="overflow-y-auto flex-1">
              <IdentityForm
                onSubmit={handleFormSubmit}
                loading={status === "loading"}
                error={error}
              />
            </div>
          </>
        ) : (
          <ChatPanel
            messages={messages}
            onSend={sendMessage}
            loading={status === "loading"}
            conversationId={conversationId}
          />
        )}
      </div>
    </motion.div>
  );

  // ── Controlled mode — panel only, no FAB ──────────────────────────────────
  if (isControlled) {
    return (
      <AnimatePresence>
        {controlledOpen && (
          // Position panel above the Hubungi Kami button (bottom-6 = 24px + button height ~52px + gap)
          <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end">
            {chatPanelMarkup}
          </div>
        )}
      </AnimatePresence>
    );
  }

  // ── Standalone mode — FAB + panel ─────────────────────────────────────────
  return (
    // bottom-24 keeps the FAB above other FloatingButtons (at bottom-6)
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {effectivePanel !== "collapsed" && chatPanelMarkup}
      </AnimatePresence>

      {/* ── FAB ─────────────────────────────────────────────────────────────── */}
      <motion.button
        onClick={effectivePanel === "collapsed" ? openPanel : handleCollapse}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 active:bg-indigo-800 flex items-center justify-center transition-colors"
        aria-label={effectivePanel === "collapsed" ? "Buka chat" : "Tutup chat"}
      >
        <AnimatePresence mode="wait">
          {effectivePanel !== "collapsed" ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-6 h-6" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle className="w-6 h-6" />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Unread badge */}
        <AnimatePresence>
          {fabBadge && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-md"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
