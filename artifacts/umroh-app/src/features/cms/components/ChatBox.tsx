import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { useAuth } from "@/shared/hooks/useAuth";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Props {
  bookingId: string;
  asAdmin?: boolean;
}

export default function ChatBox({ bookingId, asAdmin = false }: Props) {
  const { user, isAdmin } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const senderRole = asAdmin || isAdmin ? "admin" : "buyer";

  useEffect(() => {
    if (!bookingId) return;
    let active = true;
    (async () => {
      try {
        const { data } = await apiFetch<{ data: any[] }>(`/api/cms/chat-messages?booking_id=${bookingId}`);
        if (active) setMessages(data || []);
      } catch (error) {
        console.error(error);
      }
    })();

    // Real-time was removed from Supabase, so we'll just poll or rely on manual refresh for now if needed.
    // However, the instructions didn't specify a replacement for real-time.
    // I'll remove the supabase.channel part.
    
    return () => { active = false; };
  }, [bookingId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    try {
      await apiFetch("/api/admin/chats", {
        method: "POST",
        body: JSON.stringify({
          bookingId, senderId: user.id, senderRole: senderRole, message: text.trim(),
        }),
      });
      setText("");
      // Re-fetch messages after sending
      const { data } = await apiFetch<{ data: any[] }>(`/api/cms/chat-messages?booking_id=${bookingId}`);
      setMessages(data || []);
    } catch (e: any) { console.error(e); }
    finally { setSending(false); }
  };

  return (
    <div className="flex flex-col h-96 border border-border rounded-lg bg-background">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-10">Belum ada pesan. Mulai percakapan.</div>
        ) : messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <div className="text-[10px] opacity-70 mb-0.5">{m.senderRole} · {format(new Date(m.createdAt), "HH:mm")}</div>
                <div className="whitespace-pre-wrap">{m.message}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="border-t border-border p-2 flex gap-2">
        <Input placeholder="Ketik pesan..." value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} disabled={sending} />
        <Button onClick={send} disabled={sending || !text.trim()} size="icon">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
