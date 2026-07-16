import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";
import Navbar from "@/shared/components/layout/Navbar";
import Footer from "@/shared/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { Loader2, Receipt, CheckCircle2, Clock, CreditCard, Circle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import SEO from "@/shared/components/seo/SEO";
import { apiFetch } from "@/shared/lib/apiClient";
import { cn } from "@/shared/lib/utils";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  refunded: "bg-success/10 text-success border-success/20",
};

const statusLabel: Record<string, string> = {
  pending: "Menunggu Review",
  approved: "Disetujui",
  rejected: "Ditolak",
  refunded: "Sudah Ditransfer",
};

// ── Status timeline ────────────────────────────────────────────────────────────
interface RefundStep {
  key: string;
  label: string;
  icon: React.ElementType;
  date?: string | null;
}

function RefundTimeline({ refund }: { refund: any }) {
  const steps: RefundStep[] = [
    { key: "pending", label: "Diajukan", icon: Receipt, date: refund.createdAt },
    { key: "approved", label: "Diproses", icon: Clock, date: refund.approvedAt },
    { key: "refunded", label: "Ditransfer", icon: CreditCard, date: refund.refundedAt },
  ];

  const statusOrder = ["pending", "approved", "refunded"];
  const currentIdx = refund.status === "rejected" ? 0 : statusOrder.indexOf(refund.status);

  return (
    <div className="flex items-start gap-0 mt-3">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isDone = i <= currentIdx;
        const isRejected = refund.status === "rejected" && i === 1;
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                  isRejected
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : isDone
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 bg-background text-muted-foreground/40"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="mt-1 text-center">
                <p className={cn("text-[10px] font-medium leading-tight", isDone ? "text-foreground" : "text-muted-foreground/50")}>
                  {isRejected ? "Ditolak" : step.label}
                </p>
                {step.date && isDone && (
                  <p className="text-[9px] text-muted-foreground leading-tight">
                    {format(new Date(step.date), "d MMM HH:mm", { locale: localeId })}
                  </p>
                )}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("flex-1 h-0.5 mx-1 mt-[-12px]", i < currentIdx ? "bg-primary" : "bg-muted")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const RefundRequest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ bookingId: "", reason: "", amount: "", bankName: "", bankAccount: "", accountHolder: "" });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [b, r] = await Promise.all([
        apiFetch<any>("/api/bookings"),
        apiFetch<any[]>("/api/bookings/refunds"),
      ]);
      const bookingList = Array.isArray(b) ? b : (b?.data ?? []);
      setBookings(bookingList.filter((x: any) => x.status === "paid") || []);
      setRefunds(r || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!user) navigate("/auth"); else load(); }, [user]);

  const submit = async () => {
    if (!user) return;
    if (!form.bookingId || !form.reason || !form.amount) { toast.error("Lengkapi data wajib"); return; }
    const amt = Number(form.amount);
    setSaving(true);
    try {
      await apiFetch("/api/bookings/refunds", {
        method: "POST",
        body: JSON.stringify({
          bookingId: form.bookingId,
          reason: form.reason,
          amount: amt,
          bankName: form.bankName || null,
          bankAccount: form.bankAccount || null,
          accountHolder: form.accountHolder || null,
        }),
      });
      toast.success("Pengajuan refund terkirim");
      setForm({ bookingId: "", reason: "", amount: "", bankName: "", bankAccount: "", accountHolder: "" });
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

          {/* New refund form */}
          <Card>
            <CardHeader><CardTitle className="text-base">Form Pengajuan Baru</CardTitle><CardDescription>Hanya untuk booking berstatus Lunas</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Booking *</Label>
                <Select value={form.bookingId} onValueChange={(v) => setForm({ ...form, bookingId: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih booking" /></SelectTrigger>
                  <SelectContent>
                    {bookings.length === 0 ? <SelectItem value="__none__" disabled>Tidak ada booking lunas</SelectItem> : bookings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.bookingCode} — Rp {Number(b.totalPrice).toLocaleString("id-ID")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Alasan *</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} /></div>
              <div><Label>Nominal Refund (Rp) *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><Label>Nama Bank</Label><Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} /></div>
                <div><Label>No Rekening</Label><Input value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} /></div>
                <div><Label>Atas Nama</Label><Input value={form.accountHolder} onChange={(e) => setForm({ ...form, accountHolder: e.target.value })} /></div>
              </div>
              <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Kirim Pengajuan</Button>
            </CardContent>
          </Card>

          {/* Refund history with timeline */}
          <Card>
            <CardHeader><CardTitle className="text-base">Riwayat Pengajuan</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="border border-border rounded-xl p-4 space-y-3">
                      <div className="h-5 bg-muted animate-pulse rounded w-40" />
                      <div className="h-4 bg-muted animate-pulse rounded w-full" />
                      <div className="h-10 bg-muted animate-pulse rounded w-full" />
                    </div>
                  ))}
                </div>
              ) : refunds.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Belum ada pengajuan refund.</p>
              ) : refunds.map((r) => (
                <div key={r.id} className="border border-border rounded-xl p-4 space-y-2">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs text-muted-foreground">{r.bookingCode}</span>
                      <p className="text-sm font-bold mt-0.5">Rp {Number(r.amount).toLocaleString("id-ID")}</p>
                    </div>
                    <Badge className={statusColors[r.status]}>{statusLabel[r.status] ?? r.status}</Badge>
                  </div>
                  {/* Reason */}
                  <p className="text-xs text-muted-foreground">{r.reason}</p>
                  {/* Admin notes */}
                  {r.adminNotes && (
                    <div className="text-xs bg-primary/5 border border-primary/20 rounded-lg p-2 text-primary">
                      <strong>Catatan Admin:</strong> {r.adminNotes}
                    </div>
                  )}
                  {/* Rekening info */}
                  {r.bankName && (
                    <p className="text-xs text-muted-foreground">
                      Rekening: {r.bankName} · {r.bankAccount} a.n {r.accountHolder}
                    </p>
                  )}
                  {/* Status timeline */}
                  <RefundTimeline refund={r} />
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
