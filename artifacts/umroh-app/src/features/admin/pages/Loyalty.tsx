import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { toast } from "sonner";
import { Coins, Plus } from "lucide-react";
import { format } from "date-fns";
import { logAudit } from "@/shared/lib/audit";

export default function AdminLoyalty() {
  const [balances, setBalances] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ userId: "", points: 0, source: "manual", description: "" });

  const refresh = async () => {
    try {
      const [bal, hist, prof] = await Promise.all([
        apiFetch<any[]>("/api/admin/loyalty/balances"),
        apiFetch<any[]>("/api/admin/loyalty/points"),
        apiFetch<{ data: any[]; total: number }>("/api/admin/users"),
      ]);
      setBalances(bal || []);
      setHistory(hist || []);
      setUsers(prof?.data || []);
    } catch (e: any) {
      toast.error("Gagal memuat data");
    }
  };
  useEffect(() => { refresh(); }, []);

  const nameOf = (uid: string) => {
    const u = users.find(x => x.id === uid);
    return u ? (u.name || u.email) : uid.slice(0, 8);
  };

  const submit = async () => {
    if (!form.userId || !form.points) return void toast.error("User & poin wajib");
    try {
      await apiFetch("/api/admin/loyalty/points", {
        method: "POST",
        body: JSON.stringify(form),
      });
      await logAudit({ action: "adjust_loyalty", entityType: "loyalty", metadata: form as any });
      toast.success("Poin ditambahkan");
      setOpen(false);
      setForm({ userId: "", points: 0, source: "manual", description: "" });
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Coins className="text-gold" /> Poin Loyalitas</h1>
          <p className="text-muted-foreground">Saldo poin per jamaah dan riwayat transaksi.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-1" /> Tambah/Kurangi Poin</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adjust Poin</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>User</Label>
                <select className="w-full border border-border rounded-md px-3 py-2 bg-background" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
                  <option value="">Pilih user…</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                </select>
              </div>
              <div>
                <Label>Poin (gunakan minus untuk mengurangi)</Label>
                <Input type="number" value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Sumber</Label>
                <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
              </div>
              <div>
                <Label>Keterangan</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <Button onClick={submit} className="w-full">Simpan</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h2 className="font-bold mb-3">Saldo Tertinggi</h2>
          <div className="space-y-2">
            {balances.length === 0 ? <p className="text-muted-foreground text-sm">Belum ada data.</p> :
              balances.map(b => (
                <div key={b.userId} className="flex items-center justify-between text-sm border-b border-border pb-1">
                  <span>{nameOf(b.userId)}</span>
                  <span className="font-bold text-gold">{b.totalPoints.toLocaleString("id-ID")} pts</span>
                </div>
              ))
            }
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="font-bold mb-3">Riwayat Terbaru</h2>
          <div className="space-y-2">
            {history.length === 0 ? <p className="text-muted-foreground text-sm">Belum ada riwayat.</p> :
              history.map(h => (
                <div key={h.id} className="flex items-start justify-between text-sm border-b border-border pb-1">
                  <div>
                    <div>{nameOf(h.userId)} <span className="text-muted-foreground">· {h.source}</span></div>
                    {h.description && <div className="text-xs text-muted-foreground">{h.description}</div>}
                    <div className="text-xs text-muted-foreground">{format(new Date(h.createdAt), "dd MMM yyyy HH:mm")}</div>
                  </div>
                  <span className={`font-bold ${h.points >= 0 ? "text-success" : "text-destructive"}`}>{h.points > 0 ? "+" : ""}{h.points}</span>
                </div>
              ))
            }
          </div>
        </Card>
      </div>
    </div>
  );
}
