import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/shared/lib/apiClient";
import { supabase } from "@/shared/integrations/supabase/client";
import { useAuth } from "@/shared/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Briefcase, Users, DollarSign, TrendingUp, Copy, Check, ExternalLink, ShoppingBag, User, Mail, Phone, Building2, Percent, Pencil, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { z } from "zod";
import SEO from "@/shared/components/seo/SEO";
import { normalizePhone, PHONE_REGEX } from "@/shared/lib/phone";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
  email: z.string().trim().email("Email tidak valid").max(255).or(z.literal("")),
  phone: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || PHONE_REGEX.test(v),
      "Nomor telepon tidak valid. Gunakan nomor seluler Indonesia (+62 8xx, total 10–13 digit setelah +62)."
    ),
  branch_id: z.string().nullable(),
});

type AgentRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  // camelCase from /api/agent/profile
  commissionPercent: number;
  referralCode: string | null;
  branchId: string | null;
  monthlyTarget: number | null;
  stats?: {
    totalBookings: number;
    paidBookings: number;
    totalRevenue: number;
    totalCommission: number;
    pendingBookings: number;
  };
};

const AgentPortal = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", branch_id: "__none__" });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    loadData();
    apiFetch<{ id: string; name: string }[]>("/api/misc/branches") // assuming misc/branches exists or should be added
      .then((data) => setBranches(data || []))
      .catch(() => {});
  }, [user, authLoading]);

  const loadData = async () => {
    setLoading(true);
    try {
      // §7.2.1: Use dedicated /api/agent/* endpoints — no IDOR risk, scoped to current user
      const [agentData, agentBookings, leaderboard] = await Promise.all([
        apiFetch<any>("/api/agent/profile"),
        apiFetch<any[]>("/api/agent/bookings"),
        apiFetch<any[]>("/api/agent/leaderboard").catch(() => []),
      ]);

      setAgent(agentData);
      setBookings(agentBookings || []);
      setLeaderboard(leaderboard || []);

      if (agentData?.branchId) {
        apiFetch<any[]>("/api/admin/branches")
          .then((branches) => {
            const br = (branches || []).find((b: any) => b.id === agentData.branchId);
            setBranchName(br?.name || null);
          })
          .catch(() => {});
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal memuat data agen");
    } finally {
      setLoading(false);
    }
  };

  const referralUrl = agent?.referralCode
    ? `${window.location.origin}/?ref=${agent.referralCode}`
    : "";

  const copyReferral = () => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success("Link referral disalin");
    setTimeout(() => setCopied(false), 2000);
  };

  const openEdit = () => {
    if (!agent) return;
    setForm({
      name: agent.name || "",
      email: agent.email || "",
      phone: agent.phone || "",
      branch_id: (agent as any).branchId ?? (agent as any).branch_id ?? "__none__",
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!agent) return;
    const parsed = profileSchema.safeParse({
      name: form.name,
      email: form.email,
      phone: normalizePhone(form.phone),
      branch_id: form.branch_id === "__none__" ? null : form.branch_id,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Input tidak valid");
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/admin/agents/${agent.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: parsed.data.name,
          email: parsed.data.email || null,
          phone: parsed.data.phone || null,
          branchId: parsed.data.branch_id,
        }),
      });
      toast.success("Profil berhasil diperbarui");
      setEditOpen(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  };

  // Stats — come from agent.stats populated by /api/agent/profile
  const paidCount = agent?.stats?.paidBookings ?? bookings.filter((b) => b.status === "paid").length;
  const totalRevenue = agent?.stats?.totalRevenue ?? 0;
  const totalCommission = agent?.stats?.totalCommission ?? 0;
  const pendingCount = agent?.stats?.pendingBookings ?? 0;

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 lg:p-6">
        <div className="max-w-6xl mx-auto space-y-6 pt-4">
          <div className="h-8 bg-muted animate-pulse rounded w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-muted animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-muted/30 p-6">
        <div className="max-w-2xl mx-auto pt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-primary" />
                Portal Agen
              </CardTitle>
              <CardDescription>
                Akun Anda belum terdaftar sebagai agen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Hubungi admin untuk pendaftaran agen, atau kembali ke dashboard.
              </p>
              <Button onClick={() => navigate("/dashboard")}>Kembali ke Dashboard</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO title="Portal Agen" description="Dashboard agen — referral, performa, dan komisi" />
      <div className="min-h-screen bg-muted/30 p-4 lg:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Briefcase className="w-7 h-7 text-primary" />
                Portal Agen
              </h1>
              <p className="text-muted-foreground">
                Selamat datang, <span className="font-medium text-foreground">{agent.name}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/agent-commissions")}>
                Komisi & Pencairan
              </Button>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Dashboard Utama
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={ShoppingBag} label="Total Booking" value={agent.stats?.totalBookings ?? bookings.length} />
            <StatCard icon={Users} label="Lunas" value={paidCount} color="text-success" />
            <StatCard
              icon={DollarSign}
              label="Total Revenue"
              value={`Rp ${totalRevenue.toLocaleString("id-ID")}`}
              color="text-success"
            />
            <StatCard
              icon={TrendingUp}
              label={`Komisi (${agent.commissionPercent}%)`}
              value={`Rp ${totalCommission.toLocaleString("id-ID")}`}
              color="text-primary"
            />
          </div>

          {/* Target & Forecast */}
          {(() => {
            const now = new Date();
            const thisMonth = bookings.filter((b) => {
              const d = new Date(b.createdAt ?? b.created_at);
              return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && b.status === "paid";
            });
            const thisMonthCommission = thisMonth.reduce(
              (s, b) => s + (Number(b.commission) || (Number(b.totalPrice ?? b.total_price) || 0) * ((agent.commissionPercent ?? 0) / 100)),
              0
            );
            const pendingCommission = bookings
              .filter((b) => b.status === "pending" || b.status === "waiting_payment")
              .reduce((s, b) => s + (Number(b.totalPrice ?? b.total_price) || 0) * ((agent.commissionPercent ?? 0) / 100), 0);
            const target = Number(agent.monthlyTarget ?? 0);
            const progress = target > 0 ? Math.min(100, (thisMonthCommission / target) * 100) : 0;
            const forecast = thisMonthCommission + pendingCommission;
            return (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" /> Target & Forecast Bulan Ini
                  </CardTitle>
                  <CardDescription>
                    Target: Rp {target.toLocaleString("id-ID")} ·{" "}
                    <button
                      className="underline text-primary hover:opacity-80"
                      onClick={async () => {
                        const v = window.prompt("Set target komisi bulanan (Rp)", String(target));
                        if (v === null) return;
                        const num = Number(v.replace(/\D/g, ""));
                        if (Number.isNaN(num) || num < 0) return void toast.error("Angka tidak valid");
                        const { error } = await supabase.from("agents").update({ monthly_target: num }).eq("id", agent.id);
                        if (error) return void toast.error(error.message);
                        toast.success("Target diperbarui");
                        loadData();
                      }}
                    >
                      ubah
                    </button>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Tercapai: Rp {thisMonthCommission.toLocaleString("id-ID")}</span>
                      <span className="text-muted-foreground">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="p-3 rounded bg-muted/40">
                      <p className="text-xs text-muted-foreground">Lunas Bln Ini</p>
                      <p className="font-semibold">Rp {thisMonthCommission.toLocaleString("id-ID")}</p>
                    </div>
                    <div className="p-3 rounded bg-muted/40">
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <p className="font-semibold">Rp {pendingCommission.toLocaleString("id-ID")}</p>
                    </div>
                    <div className="p-3 rounded bg-primary/10">
                      <p className="text-xs text-muted-foreground">Forecast</p>
                      <p className="font-semibold text-primary">Rp {forecast.toLocaleString("id-ID")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Profil Agen */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Profil Agen
                </CardTitle>
                <CardDescription>Informasi akun keagenan Anda</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={openEdit}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProfileField icon={User} label="Nama" value={agent.name} />
                <ProfileField icon={Mail} label="Email" value={agent.email || "-"} />
                <ProfileField icon={Phone} label="Telepon" value={agent.phone || "-"} />
                <ProfileField icon={Building2} label="Cabang" value={branchName || "Pusat / Tanpa Cabang"} />
                <ProfileField icon={Percent} label="Komisi" value={`${agent.commissionPercent}%`} />
                <ProfileField
                  icon={Briefcase}
                  label="Kode Referral"
                  value={agent.referralCode || "Belum diatur"}
                  mono
                />
              </div>
            </CardContent>
          </Card>

          {/* Referral */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Link Referral Anda</CardTitle>
              <CardDescription>
                Bagikan link ini ke calon jemaah. Setiap booking yang masuk dari link ini akan tercatat sebagai referral Anda.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {agent.referralCode ? (
                <div className="flex gap-2">
                  <Input value={referralUrl} readOnly className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={copyReferral}>
                    {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href={referralUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Kode referral belum diatur. Hubungi admin untuk mengaktifkan.
                </p>
              )}
            </CardContent>
          </Card>

          {/* §7.2.1 Leaderboard Agen */}
          {leaderboard.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" /> Leaderboard Agen
                </CardTitle>
                <CardDescription>Top 10 agen berdasarkan total booking lunas</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Nama Agen</TableHead>
                        <TableHead className="text-right">Booking Lunas</TableHead>
                        <TableHead className="text-right">Total Revenue</TableHead>
                        <TableHead className="text-right">Komisi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.map((lb, i) => (
                        <TableRow key={lb.agentId} className={lb.agentId === agent.id ? "bg-primary/5" : ""}>
                          <TableCell>
                            <span className={i < 3 ? "font-bold text-primary" : "text-muted-foreground"}>{i + 1}</span>
                          </TableCell>
                          <TableCell className="font-medium">
                            {lb.name}
                            {lb.agentId === agent.id && (
                              <span className="ml-1.5 text-xs text-primary">(Anda)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{lb.paidBookingCount}</TableCell>
                          <TableCell className="text-right text-sm">Rp {Number(lb.totalRevenue).toLocaleString("id-ID")}</TableCell>
                          <TableCell className="text-right text-sm text-primary font-medium">Rp {Number(lb.commission).toLocaleString("id-ID")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bookings List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Daftar Booking Referral</CardTitle>
              <CardDescription>
                {bookings.length} booking · {pendingCount} menunggu pembayaran
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead>Paket</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead className="text-right">Nilai</TableHead>
                      <TableHead className="text-right">Komisi</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Belum ada booking referral
                        </TableCell>
                      </TableRow>
                    ) : (
                      bookings.map((b) => {
                        const commission = Number(b.commission) || 0;
                        return (
                          <TableRow key={b.id}>
                            <TableCell className="font-mono text-xs">{b.bookingCode ?? b.booking_code}</TableCell>
                            <TableCell className="text-sm">{b.packageTitle ?? b.packages?.title ?? "-"}</TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(b.createdAt ?? b.created_at), "dd MMM yyyy", { locale: localeId })}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              Rp {Number(b.totalPrice ?? b.total_price).toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium text-primary">
                              {commission > 0 ? `Rp ${commission.toLocaleString("id-ID")}` : "-"}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={b.status} />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Profil Agen</DialogTitle>
              <DialogDescription>Perbarui informasi keagenan Anda</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="agent-name">Nama *</Label>
                <Input
                  id="agent-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agent-email">Email</Label>
                <Input
                  id="agent-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  maxLength={255}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agent-phone">Telepon</Label>
                <Input
                  id="agent-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  onBlur={(e) => setForm({ ...form, phone: normalizePhone(e.target.value) })}
                  maxLength={20}
                  placeholder="08123456789"
                />
                {(() => {
                  const preview = normalizePhone(form.phone);
                  if (!form.phone.trim()) return (
                    <p className="text-xs text-muted-foreground">Akan disimpan dalam format internasional (+62…)</p>
                  );
                  const valid = PHONE_REGEX.test(preview);
                  return (
                    <p className={`text-xs font-mono ${valid ? "text-success" : "text-destructive"}`}>
                      {valid ? "✓ " : "✗ "}{preview || "(kosong)"}
                      {!valid && <span className="font-sans ml-1">— format belum valid</span>}
                    </p>
                  );
                })()}
              </div>
              <div className="space-y-1.5">
                <Label>Cabang</Label>
                <Select value={form.branch_id} onValueChange={(v) => setForm({ ...form, branch_id: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Pusat / Tanpa Cabang</SelectItem>
                    {branches.map((br) => (
                      <SelectItem key={br.id} value={br.id}>{br.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
                Batal
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  color?: string;
}) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-muted">
        <Icon className={`w-5 h-5 ${color || "text-foreground"}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={`text-base font-bold truncate ${color || ""}`}>{value}</p>
      </div>
    </CardContent>
  </Card>
);

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; variant: any }> = {
    paid: { label: "Lunas", variant: "default" },
    pending: { label: "Pending", variant: "secondary" },
    waiting_payment: { label: "Menunggu Bayar", variant: "secondary" },
    cancelled: { label: "Batal", variant: "destructive" },
    draft: { label: "Draft", variant: "outline" },
    confirmed: { label: "Konfirmasi", variant: "default" },
  };
  const cfg = map[status] || { label: status, variant: "outline" };
  return <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>;
};

const ProfileField = ({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: any;
  label: string;
  value: string;
  mono?: boolean;
}) => (
  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
    <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
    <div className="min-w-0 flex-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium truncate ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  </div>
);

export default AgentPortal;
