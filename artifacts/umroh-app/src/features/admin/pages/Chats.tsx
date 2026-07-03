import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import ChatBox from "@/features/cms/components/ChatBox";
import { format } from "date-fns";

const AdminChats = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiFetch<{ data: any[] }>("/api/admin/chats");
      // dedupe by booking_id keep latest
      const seen = new Map<string, any>();
      (data || []).forEach((m: any) => { if (!seen.has(m.bookingId)) seen.set(m.bookingId, m); });
      setConversations(Array.from(seen.values()));
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = conversations.filter((c) => !search || c.bookingCode?.toLowerCase().includes(search.toLowerCase()));

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
                <div className="font-mono text-xs">{c.bookingCode}</div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{c.message}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(c.createdAt), "dd MMM HH:mm")}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">{selected ? `Booking ${selected.bookingCode}` : "Pilih percakapan"}</CardTitle></CardHeader>
          <CardContent>
            {selected ? <ChatBox bookingId={selected.bookingId} asAdmin /> : (
              <p className="text-sm text-muted-foreground text-center py-10">Pilih percakapan dari daftar.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminChats;
