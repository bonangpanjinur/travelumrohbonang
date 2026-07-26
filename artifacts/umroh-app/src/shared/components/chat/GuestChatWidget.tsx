/**
 * GuestChatWidget — Sprint 5 (chat_architecture.md §4.4)
 *
 * Floating Action Button untuk tamu / calon jemaah (anonymous).
 * Muncul di halaman publik; tidak render jika user sudah login.
 *
 * State machine:
 *   collapsed → FAB only (dengan unread badge)
 *   form      → panel form identitas (nama, HP, email)
 *   chat      → panel jendela pesan + input kirim
 */

import { useState, useEffect, useRef, useCallback, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, ChevronDown, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/shared/hooks/useAuth";
import { useGuestChat } from "@/shared/hooks/useGuestChat";

// ── Types ─────────────────────────────────────────────────────────────────────

type PanelState = "collapsed" | "form" | "chat";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
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
}: {
  senderType: "admin" | "member" | "guest";
  senderName: string;
  message: string;
  createdAt: string;
}) {
  const isGuest = senderType === "guest";

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
      <span className="text-[10px] text-gray-400 mx-1">
        {formatTime(createdAt)}
      </span>
    </div>
  );
}

/** Chat panel — messages + input */
function ChatPanel({
  messages,
  onSend,
  loading,
}: {
  messages: ReturnType<typeof useGuestChat>["messages"];
  onSend: (msg: string) => Promise<void>;
  loading: boolean;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText("");
    setSending(true);
    try {
      await onSend(trimmed);
    } finally {
      setSending(false);
    }
  }, [text, sending, onSend]);

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
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400 py-4">
            <MessageCircle className="w-8 h-8 opacity-30" />
            <p className="text-xs text-center">
              Mulai percakapan — admin kami siap membantu!
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
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-100 p-3 flex gap-2 items-end">
        <textarea
          rows={1}
          placeholder="Ketik pesan... (Enter untuk kirim)"
          value={text}
          onChange={(e) => setText(e.target.value)}
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

export default function GuestChatWidget() {
  const { user, loading: authLoading } = useAuth();

  const {
    hasExistingSession,
    status,
    error,
    messages,
    unreadCount,
    startChat,
    sendMessage,
    markRead,
  } = useGuestChat();

  // Panel display state
  const [panel, setPanel] = useState<PanelState>("collapsed");

  // Once the hook resolves an existing session, pre-open to chat panel
  // so returning visitors don't see the form
  useEffect(() => {
    if (hasExistingSession && status === "ready" && panel === "collapsed") {
      // Don't auto-open, just keep collapsed but ready to show chat
    }
  }, [hasExistingSession, status, panel]);

  // When panel opens to chat, mark messages as read
  useEffect(() => {
    if (panel === "chat") {
      void markRead();
    }
  }, [panel, markRead]);

  // Don't render for logged-in users — they use useMyChat / /chat route
  if (authLoading) return null;
  if (user) return null;

  const fabBadge = unreadCount > 0 && panel === "collapsed";

  const openPanel = () => {
    if (status === "ready" || hasExistingSession) {
      setPanel("chat");
    } else {
      setPanel("form");
    }
  };

  const handleFormSubmit = async (name: string, phone: string, email: string) => {
    await startChat({ name, phone, email });
    setPanel("chat");
  };

  const handleCollapse = () => setPanel("collapsed");

  // bottom-24 (96 px) keeps the chat FAB clear of FloatingButtons which sits at bottom-6
  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-3">
      {/* ── Chat Panel ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {panel !== "collapsed" && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-[340px] sm:w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
            style={{ maxHeight: "min(480px, calc(100vh - 100px))" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-indigo-600 text-white">
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
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                onClick={handleCollapse}
                className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="Tutup chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body — form or chat */}
            <div className="flex flex-col flex-1 min-h-0">
              {panel === "form" ? (
                <>
                  {/* Welcome text */}
                  <div className="px-4 pt-4 pb-1 text-center">
                    <p className="text-sm font-semibold text-gray-800">Ada pertanyaan?</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Admin kami siap membantu. Isi data di bawah untuk mulai.
                    </p>
                  </div>
                  <IdentityForm
                    onSubmit={handleFormSubmit}
                    loading={status === "loading"}
                    error={error}
                  />
                </>
              ) : (
                <ChatPanel
                  messages={messages}
                  onSend={sendMessage}
                  loading={status === "loading"}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FAB ─────────────────────────────────────────────────────────────── */}
      <motion.button
        onClick={panel === "collapsed" ? openPanel : handleCollapse}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 active:bg-indigo-800 flex items-center justify-center transition-colors"
        aria-label={panel === "collapsed" ? "Buka chat" : "Tutup chat"}
      >
        <AnimatePresence mode="wait">
          {panel !== "collapsed" ? (
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
