import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import ChatBox from "@/components/chat/ChatBox";
import { format } from "date-fns";

const AdminChats = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    // Get distinct booking_ids from chat_messages, with last message
    const { data } = await supabase.from("chat_messages")
      .select("booking_id, message, created_at, sender_role, bookings(booking_code, user_id, profiles:user_id(name, email))")
      .order("created_at", { ascending: false })
      .limit(200);
    // dedupe by booking_id keep latest
    const seen = new Map<string, any>();
    (data || []).forEach((m: any) => { if (!seen.has(m.booking_id)) seen.set(m.booking_id, m); });
    setConversations(Array.from(seen.values()));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = conversations.filter((c) => !search || c.bookings?.booking_code?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><MessageCircle className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Chat Jamaah</h1></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Percakapan</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Cari kode booking..." value={search} onChange={(e) => setSearch(e.target.value)} />
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada percakapan</p>
            ) : filtered.map((c) => (
              <button key={c.booking_id} onClick={() => setSelected(c)}
                className={`w-full text-left p-2 rounded-lg border ${selected?.booking_id === c.booking_id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                <div className="font-mono text-xs">{c.bookings?.booking_code}</div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{c.message}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(c.created_at), "dd MMM HH:mm")}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">{selected ? `Booking ${selected.bookings?.booking_code}` : "Pilih percakapan"}</CardTitle></CardHeader>
          <CardContent>
            {selected ? <ChatBox bookingId={selected.booking_id} asAdmin /> : (
              <p className="text-sm text-muted-foreground text-center py-10">Pilih percakapan dari daftar.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminChats;
