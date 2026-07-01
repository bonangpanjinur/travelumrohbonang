import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import SEO from "@/components/SEO";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  refunded: "bg-success/10 text-success border-success/20",
};

const RefundRequest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ booking_id: "", reason: "", amount: "", bank_name: "", bank_account: "", account_holder: "" });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: b }, { data: r }] = await Promise.all([
      supabase.from("bookings").select("id, booking_code, total_price, status").eq("user_id", user.id).eq("status", "paid"),
      supabase.from("refund_requests").select("*, bookings(booking_code)").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setBookings(b || []);
    setRefunds(r || []);
    setLoading(false);
  };

  useEffect(() => { if (!user) navigate("/auth"); else load(); }, [user]);

  const submit = async () => {
    if (!user) return;
    if (!form.booking_id || !form.reason || !form.amount) { toast.error("Lengkapi data wajib"); return; }
    const amt = Number(form.amount);
    setSaving(true);
    try {
      const { error } = await supabase.from("refund_requests").insert({
        user_id: user.id, booking_id: form.booking_id, reason: form.reason, amount: amt,
        bank_name: form.bank_name || null, bank_account: form.bank_account || null, account_holder: form.account_holder || null,
      });
      if (error) throw error;
      toast.success("Pengajuan refund terkirim");
      setForm({ booking_id: "", reason: "", amount: "", bank_name: "", bank_account: "", account_holder: "" });
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Pengajuan Refund" />
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container-custom max-w-3xl space-y-6">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="w-7 h-7 text-primary" />Pengajuan Refund</h1>

          <Card>
            <CardHeader><CardTitle className="text-base">Form Pengajuan Baru</CardTitle><CardDescription>Hanya untuk booking berstatus Lunas</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Booking *</Label>
                <Select value={form.booking_id} onValueChange={(v) => setForm({ ...form, booking_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih booking" /></SelectTrigger>
                  <SelectContent>
                    {bookings.length === 0 ? <SelectItem value="__none__" disabled>Tidak ada booking lunas</SelectItem> : bookings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.booking_code} — Rp {Number(b.total_price).toLocaleString("id-ID")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Alasan *</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} /></div>
              <div><Label>Nominal Refund (Rp) *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><Label>Nama Bank</Label><Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></div>
                <div><Label>No Rekening</Label><Input value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} /></div>
                <div><Label>Atas Nama</Label><Input value={form.account_holder} onChange={(e) => setForm({ ...form, account_holder: e.target.value })} /></div>
              </div>
              <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Kirim Pengajuan</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Riwayat Pengajuan</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : refunds.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada pengajuan refund.</p>
              ) : refunds.map((r) => (
                <div key={r.id} className="border border-border rounded-lg p-3 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-mono text-xs">{r.bookings?.booking_code}</div>
                    <div className="text-sm font-medium mt-1">Rp {Number(r.amount).toLocaleString("id-ID")}</div>
                    <div className="text-xs text-muted-foreground mt-1">{r.reason}</div>
                    {r.admin_notes && <div className="text-xs mt-1 text-primary">Catatan admin: {r.admin_notes}</div>}
                    <div className="text-xs text-muted-foreground mt-1">{format(new Date(r.created_at), "dd MMM yyyy HH:mm", { locale: localeId })}</div>
                  </div>
                  <Badge className={statusColors[r.status]}>{r.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RefundRequest;
