import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { useAuth } from "@/shared/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { Wallet, Loader2, ArrowDownToLine } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import SEO from "@/shared/components/seo/SEO";

const statusVariant: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-success/10 text-success border-success/20",
  paid: "bg-primary/10 text-primary border-primary/20",
  requested: "bg-warning/10 text-warning border-warning/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const AgentCommissions = () => {
  const { user } = useAuth();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ amount: "", bank_name: "", bank_account: "", account_holder: "", notes: "" });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const agents = await apiFetch<any[]>("/api/admin/agents");
      const ag = agents.find(a => a.userId === user.id);
      if (!ag) { setLoading(false); return; }
      setAgentId(ag.id);
      const [commissions, withdrawals] = await Promise.all([
        apiFetch<any[]>("/api/admin/agents/commissions"),
        apiFetch<any[]>("/api/admin/agents/withdrawals"),
      ]);
      setCommissions((commissions || []).filter((c: any) => c.agentId === ag.id));
      setWithdrawals((withdrawals || []).filter((w: any) => w.agentId === ag.id));
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const totalApproved = commissions.filter((c) => c.status === "approved").reduce((s, c) => s + Number(c.amount || 0), 0);
  const totalPaid = commissions.filter((c) => c.status === "paid").reduce((s, c) => s + Number(c.amount || 0), 0);
  const balance = totalApproved - totalPaid;
  const pendingWithdraw = withdrawals.filter((w) => ["requested", "approved"].includes(w.status)).reduce((s, w) => s + Number(w.amount || 0), 0);
  const availableBalance = balance - pendingWithdraw;

  const submit = async () => {
    if (!agentId) return;
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { toast.error("Nominal tidak valid"); return; }
    if (amt > availableBalance) { toast.error("Melebihi saldo tersedia"); return; }
    if (!form.bank_name || !form.bank_account || !form.account_holder) { toast.error("Lengkapi data rekening"); return; }
    setSaving(true);
    try {
      await apiFetch("/api/admin/agents/withdrawals", {
        method: "POST",
        body: JSON.stringify({
          agentId: agentId, amount: amt, bankName: form.bank_name, bankAccount: form.bank_account,
          accountHolder: form.account_holder, notes: form.notes || null,
        }),
      });
      toast.success("Pengajuan terkirim, menunggu verifikasi admin");
      setOpen(false);
      setForm({ amount: "", bank_name: "", bank_account: "", account_holder: "", notes: "" });
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  if (!agentId) return <div className="p-10 text-center text-muted-foreground">Akun Anda bukan agen.</div>;

  return (
    <>
      <SEO title="Komisi & Pencairan Agen" />
      <div className="min-h-screen bg-muted/30 p-4 lg:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="w-7 h-7 text-primary" />Komisi & Pencairan</h1>
            <Button onClick={() => setOpen(true)} disabled={availableBalance <= 0}>
              <ArrowDownToLine className="w-4 h-4 mr-2" />Ajukan Pencairan
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Saldo Disetujui" value={balance} />
            <StatCard label="Pending Pencairan" value={pendingWithdraw} />
            <StatCard label="Tersedia" value={availableBalance} highlight />
            <StatCard label="Total Dibayar" value={totalPaid} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Komisi per Booking</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Tanggal</TableHead><TableHead>Booking</TableHead>
                  <TableHead className="text-right">Komisi</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {commissions.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Belum ada komisi</TableCell></TableRow>
                  ) : commissions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm">{format(new Date(c.created_at), "dd MMM yyyy", { locale: localeId })}</TableCell>
                      <TableCell className="font-mono text-xs">{c.bookings?.booking_code || "-"}</TableCell>
                      <TableCell className="text-right font-medium">Rp {Number(c.amount).toLocaleString("id-ID")}</TableCell>
                      <TableCell><Badge className={statusVariant[c.status]}>{c.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Riwayat Pencairan</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Tanggal</TableHead><TableHead>Bank</TableHead>
                  <TableHead className="text-right">Nominal</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {withdrawals.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Belum ada pencairan</TableCell></TableRow>
                  ) : withdrawals.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="text-sm">{format(new Date(w.created_at), "dd MMM yyyy", { locale: localeId })}</TableCell>
                      <TableCell className="text-sm">{w.bank_name} · {w.bank_account}</TableCell>
                      <TableCell className="text-right">Rp {Number(w.amount).toLocaleString("id-ID")}</TableCell>
                      <TableCell><Badge className={statusVariant[w.status]}>{w.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Ajukan Pencairan Komisi</DialogTitle><CardDescription>Saldo tersedia: Rp {availableBalance.toLocaleString("id-ID")}</CardDescription></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nominal *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div><Label>Nama Bank *</Label><Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="BCA / Mandiri / dll" /></div>
              <div><Label>Nomor Rekening *</Label><Input value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} /></div>
              <div><Label>Atas Nama *</Label><Input value={form.account_holder} onChange={(e) => setForm({ ...form, account_holder: e.target.value })} /></div>
              <div><Label>Catatan</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Batal</Button>
              <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Kirim</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

const StatCard = ({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) => (
  <Card><CardContent className="p-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={`text-lg font-bold mt-1 ${highlight ? "text-primary" : ""}`}>Rp {Number(value).toLocaleString("id-ID")}</div>
  </CardContent></Card>
);

export default AgentCommissions;
