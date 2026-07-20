/**
 * Admin — Tabungan Umroh
 * Verifikasi setoran, ringkasan statistik, detail per jamaah.
 */
import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useToast } from "@/shared/hooks/use-toast";
import { exportToCsv } from "@/shared/lib/exportCsv";
import {
  PiggyBank, Users, Wallet, Clock, CheckCircle2, XCircle,
  Search, Download, ChevronRight, ArrowLeft, RefreshCw,
} from "lucide-react";
import ResponsiveTable from "@/shared/components/ui/responsive-table";

const fmtIDR = (n: number) =>
  "Rp" + Math.round(n).toLocaleString("id-ID");

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";

type SavingsAccount = {
  id: string;
  user_id: string;
  jamaah_name: string | null;
  jamaah_email: string | null;
  jamaah_phone: string | null;
  target_package_name: string | null;
  target_amount: number;
  current_balance: number;
  status: string;
  pending_deposits: number;
  created_at: string;
};

type SavingsTx = {
  id: string;
  amount: number;
  type: string;
  status: string;
  proof_url: string | null;
  notes: string | null;
  rejection_reason: string | null;
  booking_id: string | null;
  verified_at: string | null;
  created_at: string;
};

type Stats = {
  totalAccounts: number;
  totalBalance: number;
  activeAccounts: number;
  pendingDeposits: number;
};

export default function AdminSavings() {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [loading, setLoading] = useState(true);

  // Detail view
  const [detail, setDetail] = useState<{ account: SavingsAccount; transactions: SavingsTx[] } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Dialogs
  const [rejectDialog, setRejectDialog] = useState<{ txId: string; accountId: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [refundDialog, setRefundDialog] = useState<SavingsAccount | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundNotes, setRefundNotes] = useState("");
  const [acting, setActing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const s = await apiFetch<Stats>("/api/admin/savings/stats");
      setStats(s);
    } catch {}
  }, []);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await apiFetch<{ data: SavingsAccount[] }>(`/api/admin/savings?${params}`);
      setAccounts(res.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const openDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await apiFetch<{ account: SavingsAccount; transactions: SavingsTx[] }>(`/api/admin/savings/${id}`);
      setDetail(res);
    } catch {
      toast({ title: "Gagal memuat detail", variant: "destructive" });
    } finally {
      setLoadingDetail(false);
    }
  };

  const verifyDeposit = async (accountId: string, txId: string) => {
    setActing(true);
    try {
      await apiFetch(`/api/admin/savings/${accountId}/verify/${txId}`, { method: "POST" });
      toast({ title: "Setoran diverifikasi ✓" });
      fetchStats();
      if (detail) openDetail(accountId);
      fetchAccounts();
    } catch (e: any) {
      toast({ title: "Gagal verifikasi", description: e.message, variant: "destructive" });
    } finally {
      setActing(false);
    }
  };

  const rejectDeposit = async () => {
    if (!rejectDialog) return;
    setActing(true);
    try {
      await apiFetch(`/api/admin/savings/${rejectDialog.accountId}/reject/${rejectDialog.txId}`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason }),
      });
      toast({ title: "Setoran ditolak" });
      setRejectDialog(null);
      setRejectReason("");
      fetchStats();
      if (detail) openDetail(rejectDialog.accountId);
      fetchAccounts();
    } catch (e: any) {
      toast({ title: "Gagal tolak", description: e.message, variant: "destructive" });
    } finally {
      setActing(false);
    }
  };

  const processRefund = async () => {
    if (!refundDialog) return;
    const amt = Number(refundAmount);
    if (!amt || amt <= 0) return toast({ title: "Jumlah tidak valid", variant: "destructive" });
    setActing(true);
    try {
      await apiFetch(`/api/admin/savings/${refundDialog.id}/refund`, {
        method: "POST",
        body: JSON.stringify({ amount: amt, notes: refundNotes }),
      });
      toast({ title: "Pencairan berhasil diproses" });
      setRefundDialog(null);
      setRefundAmount("");
      setRefundNotes("");
      fetchStats();
      fetchAccounts();
      if (detail) openDetail(refundDialog.id);
    } catch (e: any) {
      toast({ title: "Gagal pencairan", description: e.message, variant: "destructive" });
    } finally {
      setActing(false);
    }
  };

  const exportData = () => {
    exportToCsv(
      `tabungan_${new Date().toISOString().slice(0, 10)}`,
      ["Nama Jamaah", "Email", "Target Paket", "Target (Rp)", "Saldo (Rp)", "Progress %", "Status", "Tgl Buka"],
      accounts.map(a => [
        a.jamaah_name ?? "-",
        a.jamaah_email ?? "-",
        a.target_package_name ?? "Umum",
        String(a.target_amount),
        String(a.current_balance),
        a.target_amount > 0 ? ((a.current_balance / a.target_amount) * 100).toFixed(1) : "0",
        a.status,
        fmtDate(a.created_at),
      ]),
    );
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { active: "bg-emerald-100 text-emerald-700", closed: "bg-gray-100 text-gray-600", withdrawn: "bg-blue-100 text-blue-700" };
    const label: Record<string, string> = { active: "Aktif", closed: "Ditutup", withdrawn: "Dicairkan" };
    return <Badge className={map[status] ?? "bg-gray-100"}>{label[status] ?? status}</Badge>;
  };

  const txStatusBadge = (status: string) => {
    const map: Record<string, string> = { pending: "bg-amber-100 text-amber-700", verified: "bg-emerald-100 text-emerald-700", rejected: "bg-red-100 text-red-700" };
    const label: Record<string, string> = { pending: "Menunggu", verified: "Terverifikasi", rejected: "Ditolak" };
    return <Badge className={map[status] ?? ""}>{label[status] ?? status}</Badge>;
  };

  const txTypeLabel: Record<string, string> = {
    deposit: "Setoran", withdrawal: "Penarikan", booking_payment: "Bayar Booking", refund: "Pencairan",
  };

  // ── Detail View ──────────────────────────────────────────────────────────────
  if (detail) {
    const { account: acc, transactions: txs } = detail;
    const progress = acc.target_amount > 0 ? Math.min(100, (acc.current_balance / acc.target_amount) * 100) : 0;
    const pendingTxs = txs.filter(t => t.status === "pending" && t.type === "deposit");

    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
          </Button>
          <h1 className="text-xl font-bold">Detail Tabungan — {acc.jamaah_name ?? acc.user_id}</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Saldo", value: fmtIDR(acc.current_balance), highlight: true },
            { label: "Target", value: fmtIDR(acc.target_amount) },
            { label: "Progress", value: `${progress.toFixed(1)}%` },
            { label: "Status", value: acc.status },
          ].map(c => (
            <Card key={c.label} className={c.highlight ? "border-primary" : ""}>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <div className="text-base font-bold mt-0.5">{c.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Progress bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress menuju target</span>
              <span className="font-semibold">{fmtIDR(acc.current_balance)} / {fmtIDR(acc.target_amount)}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {acc.target_package_name ? `Target: ${acc.target_package_name}` : "Target umum"} ·
              Sisa: {fmtIDR(Math.max(0, acc.target_amount - acc.current_balance))}
            </div>
          </CardContent>
        </Card>

        {/* Pending deposits */}
        {pendingTxs.length > 0 && (
          <Card className="border-amber-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                {pendingTxs.length} Setoran Menunggu Verifikasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingTxs.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-2 rounded-md bg-amber-50 border border-amber-200 gap-2 flex-wrap">
                  <div>
                    <div className="font-medium">{fmtIDR(tx.amount)}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(tx.created_at)} · {tx.notes ?? "-"}</div>
                  </div>
                  <div className="flex gap-2 items-center">
                    {tx.proof_url && (
                      <a href={tx.proof_url} target="_blank" rel="noreferrer" className="text-xs underline text-primary">Lihat Bukti</a>
                    )}
                    <Button size="sm" onClick={() => verifyDeposit(acc.id, tx.id)} disabled={acting}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Verifikasi
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRejectDialog({ txId: tx.id, accountId: acc.id })} disabled={acting}>
                      <XCircle className="w-3 h-3 mr-1" /> Tolak
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Refund button */}
        {acc.status === "active" && acc.current_balance > 0 && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => { setRefundDialog(acc); setRefundAmount(String(acc.current_balance)); }}>
              <Wallet className="w-4 h-4 mr-2" /> Proses Pencairan
            </Button>
          </div>
        )}

        {/* All transactions */}
        <Card>
          <CardHeader><CardTitle className="text-base">Riwayat Transaksi ({txs.length})</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveTable>
              <table className="w-full text-sm">
                <thead><tr className="border-b">{["Tanggal","Tipe","Jumlah","Status","Catatan"].map(h => <th key={h} className="text-left p-2 text-xs text-muted-foreground">{h}</th>)}</tr></thead>
                <tbody>
                  {txs.map(tx => (
                    <tr key={tx.id} className="border-b last:border-0">
                      <td className="p-2">{fmtDate(tx.created_at)}</td>
                      <td className="p-2">{txTypeLabel[tx.type] ?? tx.type}</td>
                      <td className={`p-2 font-medium ${tx.amount < 0 ? "text-destructive" : "text-emerald-600"}`}>
                        {tx.amount < 0 ? "-" : "+"}{fmtIDR(Math.abs(tx.amount))}
                      </td>
                      <td className="p-2">{txStatusBadge(tx.status)}</td>
                      <td className="p-2 text-xs text-muted-foreground">{tx.rejection_reason ?? tx.notes ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveTable>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── List View ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PiggyBank className="w-6 h-6 text-primary" /> Tabungan Umroh
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchStats(); fetchAccounts(); }}>
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportData} disabled={accounts.length === 0}>
            <Download className="w-3 h-3 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: <Users className="w-4 h-4" />, label: "Total Penabung", value: stats?.totalAccounts ?? "-" },
          { icon: <Wallet className="w-4 h-4" />, label: "Total Saldo", value: stats ? fmtIDR(stats.totalBalance) : "-", highlight: true },
          { icon: <PiggyBank className="w-4 h-4" />, label: "Rekening Aktif", value: stats?.activeAccounts ?? "-" },
          { icon: <Clock className="w-4 h-4" />, label: "Setoran Pending", value: stats?.pendingDeposits ?? "-", warn: (stats?.pendingDeposits ?? 0) > 0 },
        ].map(c => (
          <Card key={c.label} className={c.highlight ? "border-primary" : c.warn ? "border-amber-300" : ""}>
            <CardContent className="p-4">
              <div className={`flex items-center gap-2 text-xs ${c.warn ? "text-amber-600" : "text-muted-foreground"}`}>
                {c.icon}{c.label}
              </div>
              <div className="text-lg font-bold mt-1">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari nama / email jamaah..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        {["", "active", "closed", "withdrawn"].map(s => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? "default" : "outline"}
            onClick={() => setStatusFilter(s)}
          >
            {s === "" ? "Semua" : s === "active" ? "Aktif" : s === "closed" ? "Ditutup" : "Dicairkan"}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Memuat data...</div>
          ) : accounts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <PiggyBank className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Belum ada rekening tabungan{search ? ` untuk "${search}"` : ""}.</p>
            </div>
          ) : (
            <ResponsiveTable>
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">{["Jamaah","Target Paket","Saldo / Target","Progress","Status","Pending",""].map(h => <th key={h} className="text-left p-3 text-xs text-muted-foreground font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {accounts.map(a => {
                    const pct = a.target_amount > 0 ? Math.min(100, (a.current_balance / a.target_amount) * 100) : 0;
                    return (
                      <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3">
                          <div className="font-medium">{a.jamaah_name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{a.jamaah_email ?? a.user_id}</div>
                        </td>
                        <td className="p-3">{a.target_package_name ?? <span className="text-muted-foreground italic">Umum</span>}</td>
                        <td className="p-3">
                          <div className="font-medium">{fmtIDR(a.current_balance)}</div>
                          <div className="text-xs text-muted-foreground">/ {fmtIDR(a.target_amount)}</div>
                        </td>
                        <td className="p-3 min-w-[100px]">
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{pct.toFixed(0)}%</div>
                        </td>
                        <td className="p-3">{statusBadge(a.status)}</td>
                        <td className="p-3">
                          {a.pending_deposits > 0 ? (
                            <Badge className="bg-amber-100 text-amber-700">{a.pending_deposits} setoran</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Button size="sm" variant="ghost" onClick={() => openDetail(a.id)} disabled={loadingDetail}>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={o => { if (!o) setRejectDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tolak Setoran</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Alasan penolakan (opsional)</Label>
            <Textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Contoh: Bukti tidak jelas, nominal tidak sesuai..."
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialog(null)}>Batal</Button>
              <Button variant="destructive" onClick={rejectDeposit} disabled={acting}>Tolak Setoran</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={!!refundDialog} onOpenChange={o => { if (!o) setRefundDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Proses Pencairan Tabungan</DialogTitle></DialogHeader>
          {refundDialog && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Saldo tersedia: <span className="font-semibold text-foreground">{fmtIDR(refundDialog.current_balance)}</span>
              </div>
              <div>
                <Label>Jumlah pencairan (Rp)</Label>
                <Input
                  type="number"
                  value={refundAmount}
                  onChange={e => setRefundAmount(e.target.value)}
                  max={refundDialog.current_balance}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Catatan (opsional)</Label>
                <Textarea value={refundNotes} onChange={e => setRefundNotes(e.target.value)} rows={2} className="mt-1" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRefundDialog(null)}>Batal</Button>
                <Button onClick={processRefund} disabled={acting}>Proses Pencairan</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
