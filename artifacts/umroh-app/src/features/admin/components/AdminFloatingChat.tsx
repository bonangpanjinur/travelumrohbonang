/**
 * AdminFloatingChat
 *
 * A floating action button (bottom-right) visible on every admin page.
 * Shows an unread-message badge. Clicking it opens a compact chat panel
 * where admins can browse conversations and reply without leaving the page.
 *
 * Polls /api/admin/chats every 20 seconds for new messages.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, ChevronLeft, RefreshCw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { format } from "date-fns";
import { useAuth } from "@/shared/hooks/useAuth";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  bookingId: string;
  bookingCode: string;
  message: string;
  createdAt: string;
  unread?: boolean;
}

interface ChatMessage {
  id: string;
  booking_id: string;
  sender_id: string;
  sender_role: "admin" | "buyer";
  message: string;
  createdAt: string;
}

// ─── Mini ChatBox (inline, no card wrapper) ───────────────────────────────────

function MiniChatBox({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const { data } = await apiFetch<{ data: ChatMessage[] }>(
        `/api/cms/chat-messages?booking_id=${bookingId}`
      );
      setMessages(data || []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    setLoading(true);
    loadMessages();
    const t = setInterval(loadMessages, 15_000);
    return () => clearInterval(t);
  }, [loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    try {
      await apiFetch("/api/admin/chats", {
        method: "POST",
        body: JSON.stringify({
          bookingId,
          senderId: user.id,
          senderRole: "admin",
          message: text.trim(),
        }),
      });
      setText("");
      await loadMessages();
    } catch (e: any) {
      toast.error("Gagal mengirim pesan");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Belum ada pesan.</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_role === "admin";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <div className="text-[10px] opacity-60 mb-0.5">
                    {mine ? "Admin" : "Jamaah"} · {format(new Date(m.createdAt), "HH:mm")}
                  </div>
                  <div className="whitespace-pre-wrap break-words">{m.message}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* input */}
      <div className="border-t border-border p-2 flex gap-2 bg-background">
        <Input
          placeholder="Balas pesan..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
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
      </div>
    </div>
  );
}

// ─── Conversation list ────────────────────────────────────────────────────────

function ConversationList({
  conversations,
  loading,
  onSelect,
  onRefresh,
}: {
  conversations: Conversation[];
  loading: boolean;
  onSelect: (c: Conversation) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = conversations.filter(
    (c) => !search || c.bookingCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-border flex gap-1">
        <Input
          placeholder="Cari kode booking..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-xs h-8"
        />
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onRefresh}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && conversations.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Belum ada percakapan</p>
        ) : (
          filtered.map((c) => (
            <button
              key={c.bookingId}
              onClick={() => onSelect(c)}
              className="w-full text-left p-2.5 rounded-lg border border-border hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold">{c.bookingCode}</span>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(c.createdAt), "dd MMM HH:mm")}
                </span>
              </div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">{c.message}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const POLL_INTERVAL = 20_000;

const AdminFloatingChat = () => {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  // track which bookingIds were seen before the panel was last opened
  const seenIds = useRef<Set<string>>(new Set());

  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await apiFetch<{ data: any[] }>("/api/admin/chats");
      const deduped = new Map<string, any>();
      (data || []).forEach((m: any) => {
        if (!deduped.has(m.bookingId)) deduped.set(m.bookingId, m);
      });
      const list: Conversation[] = Array.from(deduped.values()).map((m) => ({
        bookingId: m.bookingId,
        bookingCode: m.bookingCode,
        message: m.message,
        createdAt: m.createdAt,
      }));
      setConversations(list);

      // count bookingIds not yet seen
      const newIds = list.filter((c) => !seenIds.current.has(c.bookingId));
      setUnreadCount(newIds.length);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  // initial load + polling
  useEffect(() => {
    loadConversations();
    const t = setInterval(() => loadConversations(true), POLL_INTERVAL);
    return () => clearInterval(t);
  }, [loadConversations]);

  // when panel opens, mark all current as seen
  useEffect(() => {
    if (open) {
      seenIds.current = new Set(conversations.map((c) => c.bookingId));
      setUnreadCount(0);
    }
  }, [open, conversations]);

  return (
    <>
      {/* ── Floating trigger button ── */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.9 }}
        aria-label="Chat Jamaah"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center hover:bg-primary/90 transition-colors"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
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

        {/* unread badge */}
        <AnimatePresence>
          {unreadCount > 0 && !open && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Chat panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] h-[480px] max-h-[calc(100vh-7rem)] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary text-primary-foreground rounded-t-2xl">
              {selected ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelected(null)}
                    className="hover:opacity-70 transition-opacity"
                    aria-label="Kembali"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <div className="text-sm font-semibold">Booking {selected.bookingCode}</div>
                    <div className="text-[10px] opacity-70">Chat dengan jamaah</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm font-semibold">Chat Jamaah</span>
                  {conversations.length > 0 && (
                    <span className="text-[10px] opacity-70">({conversations.length})</span>
                  )}
                </div>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="Tutup"
                className="hover:opacity-70 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* body */}
            <div className="flex-1 min-h-0">
              <AnimatePresence mode="wait" initial={false}>
                {selected ? (
                  <motion.div
                    key={`chat-${selected.bookingId}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.15 }}
                    className="h-full"
                  >
                    <MiniChatBox
                      bookingId={selected.bookingId}
                      onClose={() => setSelected(null)}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.15 }}
                    className="h-full"
                  >
                    <ConversationList
                      conversations={conversations}
                      loading={loading}
                      onSelect={setSelected}
                      onRefresh={() => loadConversations()}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdminFloatingChat;
