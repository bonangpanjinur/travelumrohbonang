import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      const { data } = await supabase.from("chat_messages").select("*").eq("booking_id", bookingId).order("created_at");
      if (active) setMessages(data || []);
    })();

    const ch = supabase.channel(`chat-${bookingId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `booking_id=eq.${bookingId}` },
        (payload) => setMessages((prev) => [...prev, payload.new]))
      .subscribe();

    return () => { active = false; supabase.removeChannel(ch); };
  }, [bookingId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    try {
      const { error } = await supabase.from("chat_messages").insert({
        booking_id: bookingId, sender_id: user.id, sender_role: senderRole, message: text.trim(),
      });
      if (error) throw error;
      setText("");
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
                <div className="text-[10px] opacity-70 mb-0.5">{m.sender_role} · {format(new Date(m.created_at), "HH:mm")}</div>
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
