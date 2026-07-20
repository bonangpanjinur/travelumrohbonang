import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import {
  AlertTriangle, Clock, CheckCircle2, RefreshCw,
  Download, Search, Bell, ChevronDown, ChevronRight,
  Phone, Mail, Calendar,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────
interface PiutangItem {
  id: string;
  bookingCode: string;
  totalPrice: number;
  totalPaid: number;
  outstanding: number;
  status: string;
  payStatus: "belum_bayar" | "baru_dp" | "sebagian" | "hampir_lunas";
  agingBucket: "overdue" | "kritis" | "mendesak" | "perhatian" | "normal";
  daysToDepart: number | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  packageId: string;
  packageTitle: string;
  departureId: string | null;
  departureDate: string | null;
  createdAt: string;
}
interface Meta { total: number; totalOutstanding: number; kritisCount: number; }
interface PiutangResponse { data: PiutangItem[]; meta: Meta; }

// ── Helpers ───────────────────────────────────────────────────────────────────
const rp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const shortRp = (n: number) => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(1)} jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
};
const fmtDate = (d: string | null) => {
  if (!d) return "-";
  try { return format(parseISO(d), "d MMM yyyy", { locale: localeId }); } catch { return d; }
};

// ── Badge configs ─────────────────────────────────────────────────────────────
const PAY_STATUS = {
  belum_bayar:  { label: "Belum Bayar",   cls: "bg-red-100 text-red-700 border-red-200" },
  baru_dp:      { label: "Baru DP",        cls: "bg-orange-100 text-orange-700 border-orange-200" },
  sebagian:     { label: "Sebagian",       cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  hampir_lunas: { label: "Hampir Lunas",   cls: "bg-blue-100 text-blue-700 border-blue-200" },
};
const AGING = {
  overdue:   { label: "Lewat Jatuh Tempo", cls: "bg-red-600 text-white",     icon: AlertTriangle },
  kritis:    { label: "Kritis",            cls: "bg-red-100 text-red-700",   icon: AlertTriangle },
  mendesak:  { label: "Mendesak",          cls: "bg-orange-100 text-orange-700", icon: Clock },
  perhatian: { label: "Perlu Perhatian",   cls: "bg-yellow-100 text-yellow-700", icon: Clock },
  normal:    { label: "Normal",            cls: "bg-green-100 text-green-700",   icon: CheckCircle2 },
};

// ── Export CSV ────────────────────────────────────────────────────────────────
const exportCSV = (items: PiutangItem[]) => {
  const header = ["No","Kode Booking","Nama","HP","Email","Paket","Tgl Berangkat","Total","Sudah Bayar","Sisa","Status Bayar","Aging"];
  const rows = items.map((item, i) => [
    i + 1,
    item.bookingCode,
    item.customerName,
    item.customerPhone ?? "",
    item.customerEmail ?? "",
    item.packageTitle,
    fmtDate(item.departureDate),
    item.totalPrice,
    item.totalPaid,
    item.outstanding,
    PAY_STATUS[item.payStatus]?.label ?? item.payStatus,
    AGING[item.agingBucket]?.label ?? item.agingBucket,
  ]);
  const csv = [header, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `piutang-jemaah-${Date.now()}.csv`;
  a.click(); URL.revokeObjectURL(url);
};

// ── Main Component ────────────────────────────────────────────────────────────
const Piutang = () => {
  const [items,   setItems]   = useState<PiutangItem[]>([]);
  const [meta,    setMeta]    = useState<Meta>({ total: 0, totalOutstanding: 0, kritisCount: 0 });
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [bucket,  setBucket]  = useState("all");
  const [payStatus, setPayStatus] = useState("all");
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [sending,  setSending]    = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (bucket    !== "all") params.set("bucket",  bucket);
      if (payStatus !== "all") params.set("status",  payStatus);
      const res = await apiFetch<PiutangResponse>(`/api/admin/finance/piutang?${params}`);
      setItems(res.data);
      setMeta(res.meta);
      setSelected(new Set());
    } catch {
      toast.error("Gagal memuat data piutang");
    } finally {
      setLoading(false);
    }
  }, [bucket, payStatus]);

  useEffect(() => { load(); }, [load]);

  // Client-side search
  const filtered = items.filter(item => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.customerName.toLowerCase().includes(q) ||
      item.bookingCode.toLowerCase().includes(q) ||
      item.packageTitle.toLowerCase().includes(q) ||
      (item.customerPhone ?? "").includes(q)
    );
  });

  const allSelected = filtered.length > 0 && filtered.every(i => selected.has(i.id));
  const toggleAll   = () => {
    setSelected(allSelected ? new Set() : new Set(filtered.map(i => i.id)));
  };

  const sendBulkReminder = async () => {
    if (selected.size === 0) { toast.error("Pilih minimal 1 jemaah"); return; }
    setSending(true);
    try {
      await apiFetch("/api/admin/finance/piutang/remind", {
        method: "POST",
        body: JSON.stringify({ bookingIds: [...selected] }),
      });
      toast.success(`Reminder dikirim ke ${selected.size} jemaah`);
      setSelected(new Set());
    } catch {
      toast.error("Gagal mengirim reminder. Coba lagi.");
    } finally {
      setSending(false);
    }
  };

  const sendOneReminder = async (item: PiutangItem) => {
    setSending(true);
    try {
      await apiFetch("/api/admin/finance/piutang/remind", {
        method: "POST",
        body: JSON.stringify({ bookingIds: [item.id] }),
      });
      toast.success(`Reminder dikirim ke ${item.customerName}`);
    } catch {
      toast.error("Gagal mengirim reminder");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Daftar Piutang Jemaah</h1>
          <p className="text-muted-foreground text-sm">Semua booking yang belum lunas — termasuk belum DP, cicilan, dan sisa pelunasan</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selected.size > 0 && (
            <Button size="sm" variant="destructive" onClick={sendBulkReminder} disabled={sending}>
              <Bell className="w-3.5 h-3.5 mr-1.5" />
              Kirim Reminder ({selected.size})
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => exportCSV(filtered)} disabled={filtered.length === 0}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Total Piutang</p>
          <p className="text-2xl font-bold text-red-600">{shortRp(meta.totalOutstanding)}</p>
          <p className="text-xs text-muted-foreground">{meta.total} booking</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Kritis / Overdue</p>
          <p className="text-2xl font-bold text-orange-600">{meta.kritisCount}</p>
          <p className="text-xs text-muted-foreground">keberangkatan &lt; 14 hari atau lewat</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Ditampilkan</p>
          <p className="text-2xl font-bold">{filtered.length}</p>
          <p className="text-xs text-muted-foreground">dari {meta.total} total piutang</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-card border border-border rounded-xl p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-8 h-9"
            placeholder="Cari nama, kode booking, HP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Select value={bucket} onValueChange={setBucket}>
          <SelectTrigger className="w-[190px] h-9">
            <SelectValue placeholder="Filter Aging" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Aging</SelectItem>
            <SelectItem value="overdue">⛔ Lewat Jatuh Tempo</SelectItem>
            <SelectItem value="kritis">🔴 Kritis (&lt; 14 hari)</SelectItem>
            <SelectItem value="mendesak">🟠 Mendesak (14–30 hr)</SelectItem>
            <SelectItem value="perhatian">🟡 Perlu Perhatian</SelectItem>
            <SelectItem value="normal">🟢 Normal</SelectItem>
          </SelectContent>
        </Select>

        <Select value={payStatus} onValueChange={setPayStatus}>
          <SelectTrigger className="w-[170px] h-9">
            <SelectValue placeholder="Status Bayar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="belum_bayar">Belum Bayar</SelectItem>
            <SelectItem value="baru_dp">Baru DP</SelectItem>
            <SelectItem value="sebagian">Sebagian</SelectItem>
            <SelectItem value="hampir_lunas">Hampir Lunas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
            Memuat data piutang...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="font-semibold">Tidak ada piutang</p>
            <p className="text-sm text-muted-foreground mt-1">Semua booking sudah lunas atau tidak ada data yang cocok dengan filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Pilih semua" />
                  </TableHead>
                  <TableHead>Jemaah</TableHead>
                  <TableHead>Paket</TableHead>
                  <TableHead>Keberangkatan</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Sudah Bayar</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aging</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(item => {
                  const pct    = Math.round((item.totalPaid / item.totalPrice) * 100);
                  const agMeta = AGING[item.agingBucket] ?? AGING.normal;
                  const AgIcon = agMeta.icon;
                  const isExp  = expandedId === item.id;

                  return (
                    <>
                      <TableRow
                        key={item.id}
                        className={`cursor-pointer ${isExp ? "border-b-0" : ""}`}
                        onClick={() => setExpandedId(isExp ? null : item.id)}
                      >
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={selected.has(item.id)}
                            onCheckedChange={() => {
                              const s = new Set(selected);
                              s.has(item.id) ? s.delete(item.id) : s.add(item.id);
                              setSelected(s);
                            }}
                            aria-label={`Pilih ${item.bookingCode}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-sm">{item.customerName}</div>
                          <div className="text-xs text-muted-foreground font-mono">{item.bookingCode}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm max-w-[160px] truncate">{item.packageTitle}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{fmtDate(item.departureDate)}</div>
                          {item.daysToDepart !== null && (
                            <div className={`text-xs font-medium ${
                              item.daysToDepart < 0 ? "text-red-600" :
                              item.daysToDepart <= 14 ? "text-red-500" :
                              item.daysToDepart <= 30 ? "text-orange-500" : "text-muted-foreground"
                            }`}>
                              {item.daysToDepart < 0
                                ? `Lewat ${Math.abs(item.daysToDepart)} hari`
                                : `${item.daysToDepart} hari lagi`}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm">{shortRp(item.totalPrice)}</TableCell>
                        <TableCell className="text-right text-sm text-green-600">{shortRp(item.totalPaid)}</TableCell>
                        <TableCell className="text-right font-semibold text-sm text-red-600">{shortRp(item.outstanding)}</TableCell>
                        <TableCell className="min-w-[100px]">
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PAY_STATUS[item.payStatus]?.cls}`}>
                            {PAY_STATUS[item.payStatus]?.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit ${agMeta.cls}`}>
                            <AgIcon className="w-3 h-3" />
                            {agMeta.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => setExpandedId(isExp ? null : item.id)}
                            >
                              {isExp ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </Button>
                            <Button
                              size="sm" variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => sendOneReminder(item)}
                              disabled={sending}
                              title="Kirim reminder ke jemaah"
                            >
                              <Bell className="w-3 h-3 mr-1" /> Remind
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded detail */}
                      {isExp && (
                        <TableRow key={`${item.id}-detail`}>
                          <TableCell colSpan={11} className="bg-muted/20 p-0">
                            <div className="p-4 grid sm:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Kontak Jemaah</p>
                                <div className="space-y-1">
                                  {item.customerPhone && (
                                    <a href={`https://wa.me/${item.customerPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                                      className="flex items-center gap-2 text-green-600 hover:underline">
                                      <Phone className="w-3.5 h-3.5" /> {item.customerPhone}
                                    </a>
                                  )}
                                  {item.customerEmail && (
                                    <a href={`mailto:${item.customerEmail}`}
                                      className="flex items-center gap-2 text-blue-600 hover:underline">
                                      <Mail className="w-3.5 h-3.5" /> {item.customerEmail}
                                    </a>
                                  )}
                                </div>
                              </div>

                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Detail Pembayaran</p>
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Harga</span>
                                    <span className="font-medium">{rp(item.totalPrice)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Sudah Dibayar</span>
                                    <span className="text-green-600 font-medium">{rp(item.totalPaid)}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-border pt-1 mt-1">
                                    <span className="font-semibold">Sisa Tagihan</span>
                                    <span className="text-red-600 font-bold">{rp(item.outstanding)}</span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Info Keberangkatan</p>
                                <div className="space-y-1">
                                  <div className="flex items-start gap-2">
                                    <Calendar className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                                    <span>{fmtDate(item.departureDate)}</span>
                                  </div>
                                  <p className="text-muted-foreground text-xs">Dibuat: {fmtDate(item.createdAt)}</p>
                                </div>
                                <a
                                  href={`/admin/bookings?search=${item.bookingCode}`}
                                  target="_blank" rel="noreferrer"
                                  className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  Buka di halaman Booking →
                                </a>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Menampilkan {filtered.length} dari {meta.total} piutang · Total outstanding: <strong className="text-red-600">{shortRp(meta.totalOutstanding)}</strong>
        </p>
      )}
    </div>
  );
};

export default Piutang;
