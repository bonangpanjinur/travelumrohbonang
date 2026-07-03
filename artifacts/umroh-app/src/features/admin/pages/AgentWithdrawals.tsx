import { useEffect, useState } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import AdminLayout from "@/features/admin/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { logAudit } from "@/shared/lib/audit";
import { useAuth } from "@/shared/hooks/useAuth";

const statusVariant: Record<string, string> = {
  requested: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  paid: "bg-success/10 text-success border-success/20",
};

const AdminAgentWithdrawals = () => {
  const { user: currentUser } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("agent_withdrawals")
      .select("*, agents(name, email, phone)")
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (status: "approved" | "rejected" | "paid") => {
    if (!selected) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("agent_withdrawals").update({
        status, admin_notes: adminNotes || null,
        proof_url: status === "paid" ? (proofUrl || null) : selected.proof_url,
        processed_by: currentUser?.id, processed_at: new Date().toISOString(),
      }).eq("id", selected.id);
      if (error) throw error;
      await logAudit({ action: `withdrawal_${status}`, entityType: "agent_withdrawal", entityId: selected.id, metadata: { amount: selected.amount } });
      toast.success("Status diperbarui");
      setSelected(null); setAdminNotes(""); setProofUrl("");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Wallet className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Pencairan Komisi Agen</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Daftar Pengajuan</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Tanggal</TableHead><TableHead>Agen</TableHead>
                <TableHead>Bank</TableHead><TableHead className="text-right">Nominal</TableHead>
                <TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Belum ada pengajuan</TableCell></TableRow>
                ) : items.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="text-sm">{format(new Date(w.created_at), "dd MMM yyyy HH:mm", { locale: localeId })}</TableCell>
                    <TableCell><div className="text-sm font-medium">{w.agents?.name}</div><div className="text-xs text-muted-foreground">{w.agents?.email || w.agents?.phone}</div></TableCell>
                    <TableCell className="text-sm">{w.bank_name}<br /><span className="font-mono text-xs">{w.bank_account}</span><br /><span className="text-xs text-muted-foreground">{w.account_holder}</span></TableCell>
                    <TableCell className="text-right font-bold">Rp {Number(w.amount).toLocaleString("id-ID")}</TableCell>
                    <TableCell><Badge className={statusVariant[w.status]}>{w.status}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => { setSelected(w); setAdminNotes(w.admin_notes || ""); setProofUrl(w.proof_url || ""); }}>Detail</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detail Pengajuan</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div><span className="text-muted-foreground">Agen:</span> <strong>{selected.agents?.name}</strong></div>
              <div><span className="text-muted-foreground">Nominal:</span> <strong>Rp {Number(selected.amount).toLocaleString("id-ID")}</strong></div>
              <div><span className="text-muted-foreground">Rekening:</span> {selected.bank_name} · {selected.bank_account} · {selected.account_holder}</div>
              {selected.notes && <div><span className="text-muted-foreground">Catatan agen:</span> {selected.notes}</div>}
              <div><Label>Catatan Admin</Label><Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2} /></div>
              <div><Label>URL Bukti Transfer (untuk status Paid)</Label><Input value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https://..." /></div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setSelected(null)} disabled={saving}>Tutup</Button>
            <Button variant="destructive" onClick={() => updateStatus("rejected")} disabled={saving}>Tolak</Button>
            <Button variant="secondary" onClick={() => updateStatus("approved")} disabled={saving}>Setujui</Button>
            <Button onClick={() => updateStatus("paid")} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Tandai Dibayar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAgentWithdrawals;
