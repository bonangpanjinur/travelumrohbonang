/**
 * Jamaah — Portal Tabungan Umroh
 * Buka rekening, setor, lihat riwayat, gunakan saldo untuk booking.
 */
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/shared/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Navbar from "@/shared/components/layout/Navbar";
import { apiFetch } from "@/shared/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import LoadingSpinner from "@/shared/components/ui/loading-spinner";
import { toast } from "sonner";
import {
  PiggyBank, Plus, Upload, History, TrendingUp, ArrowDownCircle, RefreshCw,
} from "lucide-react";

const fmtIDR = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";

type SavingsAccount = {
  id: string;
  target_package_id: string | null;
  target_package_name: string | null;
  target_amount: number;
  current_balance: number;
  status: string;
  notes: string | null;
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

type Package = { id: string; title: string; base_price: number | null };
type Simulate = { months: number; targetDate: string };

const txTypeLabel: Record<string, string> = {
  deposit: "Setoran", withdrawal: "Penarikan", booking_payment: "Bayar Booking", refund: "Pencairan",
};

const txStatusBadge = (status: string) => {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    verified: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
  };
  const label: Record<string, string> = { pending: "Menunggu", verified: "Terverifikasi", rejected: "Ditolak" };
  return <Badge className={`text-xs ${map[status] ?? "bg-gray-100"}`}>{label[status] ?? status}</Badge>;
};

export default function MySavings() {
  const { user, loading: authLoading } = useAuth();
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [selected, setSelected] = useState<SavingsAccount | null>(null);
  const [transactions, setTransactions] = useState<SavingsTx[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // New account dialog
  const [newOpen, setNewOpen] = useState(false);
  const [newPkgId, setNewPkgId] = useState("none");
  const [newTarget, setNewTarget] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [simulate, setSimulate] = useState<Simulate | null>(null);
  const [simMonthly, setSimMonthly] = useState("");
  const [creating, setCreating] = useState(false);

  // Deposit dialog
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositProof, setDepositProof] = useState("");
  const [depositNotes, setDepositNotes] = useState("");
  const [depositing, setDepositing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [accRes, pkgRes] = await Promise.all([
        apiFetch<{ data: SavingsAccount[] }>("/api/savings"),
        apiFetch<{ data: Package[] }>("/api/packages?limit=100"),
      ]);
      const accs = accRes.data ?? [];
      setAccounts(accs);
      setPackages(pkgRes.data ?? []);
      if (accs.length > 0) {
        const first = accs[0];
        setSelected(first);
        const detail = await apiFetch<{ account: SavingsAccount; transactions: SavingsTx[] }>(`/api/savings/${first.id}`);
        setTransactions(detail.transactions ?? []);
      }
    } catch (e) {
      toast.error("Gagal memuat data tabungan");
    } finally {
      setLoadingData(false);
    }
  }, []);

  const selectAccount = async (acc: SavingsAccount) => {
    setSelected(acc);
    try {
      const detail = await apiFetch<{ account: SavingsAccount; transactions: SavingsTx[] }>(`/api/savings/${acc.id}`);
      setSelected(detail.account);
      setTransactions(detail.transactions ?? []);
    } catch {}
  };

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  const runSimulate = async () => {
    const t = Number(newTarget) || 0;
    const m = Number(simMonthly) || 0;
    if (!t || !m) return;
    try {
      const res = await apiFetch<Simulate>(`/api/savings/simulate?target=${t}&monthly=${m}`);
      setSimulate(res);
    } catch {}
  };

  const createAccount = async () => {
    setCreating(true);
    try {
      const body: any = { notes: newNotes || undefined };
      if (newPkgId && newPkgId !== "none") body.targetPackageId = newPkgId;
      if (newTarget) body.targetAmount = Number(newTarget);
      await apiFetch("/api/savings", { method: "POST", body: JSON.stringify(body) });
      toast.success("Rekening tabungan berhasil dibuka!");
      setNewOpen(false);
      setNewPkgId("none");
      setNewTarget("");
      setNewNotes("");
      setSimulate(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.message ?? "Gagal membuka rekening");
    } finally {
      setCreating(false);
    }
  };

  const submitDeposit = async () => {
    if (!selected) return;
    const amt = Number(depositAmount);
    if (!amt || amt <= 0) return toast.error("Jumlah setoran tidak valid");
    setDepositing(true);
    try {
      await apiFetch(`/api/savings/${selected.id}/deposit`, {
        method: "POST",
        body: JSON.stringify({ amount: amt, proofUrl: depositProof || undefined, notes: depositNotes || undefined }),
      });
      toast.success("Setoran dikirim! Menunggu konfirmasi admin.");
      setDepositOpen(false);
      setDepositAmount("");
      setDepositProof("");
      setDepositNotes("");
      selectAccount(selected);
    } catch (e: any) {
      toast.error(e.message ?? "Gagal kirim setoran");
    } finally {
      setDepositing(false);
    }
  };

  if (authLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PiggyBank className="w-6 h-6 text-primary" /> Tabungan Umroh
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Mulai menabung dan wujudkan impian ibadah Anda</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Buka Rekening
            </Button>
          </div>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="py-16 flex flex-col items-center text-center gap-4">
              <PiggyBank className="w-14 h-14 text-primary/30" />
              <div>
                <p className="font-semibold text-lg">Belum ada rekening tabungan</p>
                <p className="text-muted-foreground text-sm mt-1">Buka rekening sekarang dan mulai menabung untuk umroh impian Anda.</p>
              </div>
              <Button onClick={() => setNewOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Buka Rekening Tabungan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Account selector (if multiple) */}
            {accounts.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {accounts.map(a => (
                  <Button
                    key={a.id}
                    variant={selected?.id === a.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => selectAccount(a)}
                  >
                    {a.target_package_name ?? "Umum"} · {fmtIDR(a.current_balance)}
                  </Button>
                ))}
              </div>
            )}

            {selected && (
              <>
                {/* Progress card */}
                <Card className="border-primary/40 bg-primary/5">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          {selected.target_package_name ? `Target: ${selected.target_package_name}` : "Target Umum"}
                        </div>
                        <div className="text-3xl font-bold text-primary">{fmtIDR(selected.current_balance)}</div>
                        <div className="text-sm text-muted-foreground">dari target {fmtIDR(selected.target_amount)}</div>
                      </div>
                      <div className="flex gap-2">
                        {selected.status === "active" && (
                          <Button size="sm" onClick={() => setDepositOpen(true)}>
                            <Upload className="w-3.5 h-3.5 mr-1" /> Setor
                          </Button>
                        )}
                        <Badge className={selected.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100"}>
                          {selected.status === "active" ? "Aktif" : selected.status === "closed" ? "Ditutup" : "Dicairkan"}
                        </Badge>
                      </div>
                    </div>
                    {selected.target_amount > 0 && (
                      <>
                        <div className="w-full bg-primary/20 rounded-full h-3">
                          <div
                            className="bg-primary h-3 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (selected.current_balance / selected.target_amount) * 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{((selected.current_balance / selected.target_amount) * 100).toFixed(1)}% tercapai</span>
                          <span>Sisa: {fmtIDR(Math.max(0, selected.target_amount - selected.current_balance))}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Milestones */}
                <div className="grid grid-cols-4 gap-2">
                  {[25, 50, 75, 100].map(pct => {
                    const reached = selected.target_amount > 0 && (selected.current_balance / selected.target_amount) * 100 >= pct;
                    return (
                      <div key={pct} className={`text-center p-2 rounded-lg border text-sm ${reached ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-muted/30 text-muted-foreground"}`}>
                        {reached ? "✓" : "○"} {pct}%
                      </div>
                    );
                  })}
                </div>

                {/* Info cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Card>
                    <CardContent className="p-3">
                      <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Total Setoran Masuk</div>
                      <div className="font-bold mt-0.5">{fmtIDR(transactions.filter(t => t.amount > 0 && t.status === "verified").reduce((s, t) => s + t.amount, 0))}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <div className="text-xs text-muted-foreground flex items-center gap-1"><ArrowDownCircle className="w-3 h-3" /> Sudah Digunakan</div>
                      <div className="font-bold mt-0.5">{fmtIDR(Math.abs(transactions.filter(t => t.amount < 0 && t.status === "verified").reduce((s, t) => s + t.amount, 0)))}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <div className="text-xs text-muted-foreground flex items-center gap-1"><History className="w-3 h-3" /> Total Transaksi</div>
                      <div className="font-bold mt-0.5">{transactions.length}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Transactions */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="w-4 h-4" /> Riwayat Transaksi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {transactions.length === 0 ? (
                      <p className="text-center text-muted-foreground py-6 text-sm">Belum ada transaksi.</p>
                    ) : (
                      <div className="space-y-2">
                        {transactions.map(tx => (
                          <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border gap-2 flex-wrap">
                            <div>
                              <div className="text-sm font-medium">{txTypeLabel[tx.type] ?? tx.type}</div>
                              <div className="text-xs text-muted-foreground">{fmtDate(tx.created_at)} {tx.notes ? `· ${tx.notes}` : ""}</div>
                              {tx.rejection_reason && <div className="text-xs text-destructive mt-0.5">{tx.rejection_reason}</div>}
                            </div>
                            <div className="flex items-center gap-2">
                              {txStatusBadge(tx.status)}
                              <span className={`font-bold ${tx.amount >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                                {tx.amount >= 0 ? "+" : ""}{fmtIDR(tx.amount)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>

      {/* New Account Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Buka Rekening Tabungan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Target Paket (opsional)</Label>
              <Select value={newPkgId} onValueChange={v => {
                setNewPkgId(v);
                if (v && v !== "none") {
                  const pkg = packages.find(p => p.id === v);
                  if (pkg?.base_price) setNewTarget(String(pkg.base_price));
                }
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih paket (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Tabungan Umum —</SelectItem>
                  {packages.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Nominal (Rp)</Label>
              <Input
                type="number"
                value={newTarget}
                onChange={e => setNewTarget(e.target.value)}
                placeholder="Contoh: 30000000"
                className="mt-1"
              />
            </div>
            {/* Simulator */}
            {newTarget && Number(newTarget) > 0 && (
              <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                <div className="text-xs font-medium text-muted-foreground">🧮 Simulasi Setoran Bulanan</div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Rp/bulan"
                    value={simMonthly}
                    onChange={e => setSimMonthly(e.target.value)}
                    className="text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={runSimulate} disabled={!simMonthly}>Hitung</Button>
                </div>
                {simulate && (
                  <div className="text-sm">
                    ≈ <strong>{simulate.months} bulan</strong> (s/d {fmtDate(simulate.targetDate)})
                  </div>
                )}
              </div>
            )}
            <div>
              <Label>Catatan (opsional)</Label>
              <Textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} rows={2} className="mt-1" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewOpen(false)}>Batal</Button>
              <Button onClick={createAccount} disabled={creating}>
                {creating ? "Membuka..." : "Buka Rekening"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deposit Dialog */}
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Kirim Setoran</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/40 rounded-lg p-3 text-sm">
              Saldo saat ini: <strong>{fmtIDR(selected?.current_balance ?? 0)}</strong>
            </div>
            <div>
              <Label>Jumlah Setoran (Rp) *</Label>
              <Input
                type="number"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="Masukkan nominal"
                className="mt-1"
              />
            </div>
            <div>
              <Label>URL Bukti Transfer (opsional)</Label>
              <Input
                value={depositProof}
                onChange={e => setDepositProof(e.target.value)}
                placeholder="https://... link bukti transfer"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Catatan (opsional)</Label>
              <Textarea value={depositNotes} onChange={e => setDepositNotes(e.target.value)} rows={2} className="mt-1" />
            </div>
            <p className="text-xs text-muted-foreground">Setoran akan diverifikasi oleh admin. Saldo akan bertambah setelah konfirmasi.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDepositOpen(false)}>Batal</Button>
              <Button onClick={submitDeposit} disabled={depositing}>
                {depositing ? "Mengirim..." : "Kirim Setoran"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
