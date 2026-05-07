import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { logAudit } from "@/lib/audit";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  refunded: "bg-success/10 text-success border-success/20",
};

const AdminRefunds = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("refund_requests")
      .select("*, bookings(booking_code, total_price)")
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = async (status: "approved" | "rejected" | "refunded") => {
    if (!selected) return;
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("refund_requests").update({
        status, admin_notes: adminNotes || null,
        processed_by: u?.user?.id, processed_at: new Date().toISOString(),
      }).eq("id", selected.id);
      if (error) throw error;
      await logAudit({ action: `refund_${status}`, entityType: "refund_request", entityId: selected.id, metadata: { amount: selected.amount } });
      toast.success("Status diperbarui");
      setSelected(null); setAdminNotes("");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><Receipt className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Refund Jamaah</h1></div>
      <Card>
        <CardHeader><CardTitle className="text-base">Daftar Pengajuan</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Tanggal</TableHead><TableHead>Booking</TableHead><TableHead>Pengaju</TableHead>
                <TableHead className="text-right">Nominal</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Belum ada pengajuan</TableCell></TableRow>
                ) : items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{format(new Date(r.created_at), "dd MMM yyyy HH:mm", { locale: localeId })}</TableCell>
                    <TableCell className="font-mono text-xs">{r.bookings?.booking_code}</TableCell>
                    <TableCell className="text-sm">{r.profiles?.name || r.profiles?.email || "-"}</TableCell>
                    <TableCell className="text-right font-bold">Rp {Number(r.amount).toLocaleString("id-ID")}</TableCell>
                    <TableCell><Badge className={statusColors[r.status]}>{r.status}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => { setSelected(r); setAdminNotes(r.admin_notes || ""); }}>Detail</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detail Refund</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-2 text-sm">
              <div><strong>Booking:</strong> {selected.bookings?.booking_code}</div>
              <div><strong>Nominal:</strong> Rp {Number(selected.amount).toLocaleString("id-ID")}</div>
              <div><strong>Alasan:</strong> {selected.reason}</div>
              {selected.bank_name && <div><strong>Rekening:</strong> {selected.bank_name} · {selected.bank_account} · {selected.account_holder}</div>}
              <div><Label>Catatan Admin</Label><Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2} /></div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setSelected(null)} disabled={saving}>Tutup</Button>
            <Button variant="destructive" onClick={() => update("rejected")} disabled={saving}>Tolak</Button>
            <Button variant="secondary" onClick={() => update("approved")} disabled={saving}>Setujui</Button>
            <Button onClick={() => update("refunded")} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Tandai Direfund</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRefunds;
