/**
 * Fase 2 — Keuangan Per Keberangkatan
 * Halaman P&L (Profit & Loss) per keberangkatan:
 *   - Revenue target vs terkumpul
 *   - HPP & gross margin
 *   - Tabel biaya operasional
 *   - Tabel jemaah per booking
 *   - Export PDF
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  Printer,
  RefreshCw,
  Users,
  DollarSign,
  Calculator,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}
function fmtNum(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}
function fmtDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

// ── types ──────────────────────────────────────────────────────────────────────

interface DepartureSummary {
  id: string;
  departureDate: string;
  returnDate: string | null;
  quota: number;
  departureStatus: string;
  packageId: string;
  packageTitle: string;
  bookingCount: number;
  lunasCount: number;
  targetRevenue: number;
  collected: number;
  outstanding: number;
  pctCollected: number;
  hppTotal: number;
  grossProfit: number;
  marginPct: number;
}

interface OperationalCost {
  id: string;
  category: string;
  itemName: string;
  qty: number;
  unit: string;
  unitCost: number;
  isPerPax: boolean;
  budgeted: number;
  notes: string | null;
}

interface Pilgrim {
  id: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string | null;
  totalPrice: number;
  totalPaid: number;
  outstanding: number;
  status: string;
  payStatus: string;
  pctPaid: number;
}

interface DepartureDetail {
  departure: {
    id: string;
    departureDate: string;
    returnDate: string | null;
    quota: number;
    filledSeats: number;
    departureStatus: string;
    packageTitle: string;
  };
  revenue: {
    target: number;
    collected: number;
    outstanding: number;
    pctCollected: number;
    lunasCount: number;
    bookingCount: number;
  };
  hpp: { total: number; perPax: number };
  operationalCosts: OperationalCost[];
  grossProfit: number;
  marginPct: number;
  pilgrims: Pilgrim[];
}

// ── sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "blue",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color?: "blue" | "green" | "red" | "orange" | "purple";
}) {
  const colorMap: Record<string, string> = {
    blue:   "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    green:  "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
    red:    "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
  };
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex gap-4 items-start">
      <div className={`rounded-lg p-2 ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const payStatusMap: Record<string, { label: string; color: string }> = {
  lunas:        { label: "Lunas",        color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  hampir_lunas: { label: "Hampir Lunas", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  sebagian:     { label: "Sebagian",     color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  baru_dp:      { label: "Baru DP",      color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  belum_bayar:  { label: "Belum Bayar",  color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

// ── main component ─────────────────────────────────────────────────────────────

export default function DepartureFinance() {
  const [departures, setDepartures] = useState<DepartureSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<DepartureDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllCosts, setShowAllCosts] = useState(false);
  const [showAllPilgrims, setShowAllPilgrims] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Load departure list
  const loadList = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const json = await apiFetch("/api/admin/finance/departures") as any;
      setDepartures(json.data ?? []);
      // auto-select first
      if (!selectedId && json.data?.length > 0) {
        setSelectedId(json.data[0].id);
      }
    } catch {
      setError("Gagal memuat daftar keberangkatan.");
    } finally {
      setLoadingList(false);
    }
  }, [selectedId]);

  // Load detail when departure selected
  const loadDetail = useCallback(async (id: string) => {
    if (!id) return;
    setLoadingDetail(true);
    setError(null);
    try {
      const json = await apiFetch(`/api/admin/finance/departure/${id}`) as any;
      setDetail(json);
    } catch {
      setError("Gagal memuat detail keuangan keberangkatan.");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => { loadList(); }, []);
  useEffect(() => { if (selectedId) loadDetail(selectedId); }, [selectedId]);

  // Group costs by category
  const costsByCategory = detail
    ? detail.operationalCosts.reduce<Record<string, OperationalCost[]>>((acc, c) => {
        (acc[c.category] = acc[c.category] ?? []).push(c);
        return acc;
      }, {})
    : {};

  const COSTS_PREVIEW = 5;
  const PILGRIMS_PREVIEW = 8;

  const visibleCosts = showAllCosts
    ? detail?.operationalCosts ?? []
    : (detail?.operationalCosts ?? []).slice(0, COSTS_PREVIEW);

  const visiblePilgrims = showAllPilgrims
    ? detail?.pilgrims ?? []
    : (detail?.pilgrims ?? []).slice(0, PILGRIMS_PREVIEW);

  const handlePrint = () => window.print();

  const selected = departures.find((d) => d.id === selectedId);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Keuangan Per Keberangkatan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Laporan P&amp;L (Profit &amp; Loss) per keberangkatan
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={loadList} disabled={loadingList}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loadingList ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!detail}>
            <Printer className="w-4 h-4 mr-1" />
            Export / Print
          </Button>
        </div>
      </div>

      {/* Departure Selector */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <label className="text-sm font-medium mb-2 block">Pilih Keberangkatan</label>
        {loadingList ? (
          <div className="h-10 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-md" />
        ) : (
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-full sm:max-w-lg">
              <SelectValue placeholder="Pilih keberangkatan..." />
            </SelectTrigger>
            <SelectContent>
              {departures.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  <span className="font-medium">{d.packageTitle}</span>
                  <span className="ml-2 text-muted-foreground text-xs">
                    — {fmtDate(d.departureDate)}
                    {" "}({d.bookingCount} jemaah, {d.pctCollected}% terkumpul)
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Mini summary row for selected departure */}
        {selected && !loadingList && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline">{fmtDate(selected.departureDate)}</Badge>
            <Badge variant="outline">{selected.bookingCount} Jemaah</Badge>
            <Badge variant="outline">{selected.lunasCount} Lunas</Badge>
            <Badge
              className={
                selected.marginPct >= 20
                  ? "bg-green-100 text-green-800 border-green-200"
                  : selected.marginPct >= 0
                  ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                  : "bg-red-100 text-red-800 border-red-200"
              }
            >
              Margin {selected.marginPct}%
            </Badge>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Overview P&L List — shown when no departure is selected */}
      {!selectedId && !loadingList && departures.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="font-semibold">Semua Keberangkatan</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paket</TableHead>
                  <TableHead>Tgl Berangkat</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Terkumpul</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Gross Profit</TableHead>
                  <TableHead className="text-center">% Bayar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departures.map((d) => (
                  <TableRow
                    key={d.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setSelectedId(d.id)}
                  >
                    <TableCell className="font-medium">{d.packageTitle}</TableCell>
                    <TableCell>{fmtDate(d.departureDate)}</TableCell>
                    <TableCell className="text-right">{fmt(d.targetRevenue)}</TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400">{fmt(d.collected)}</TableCell>
                    <TableCell className="text-right text-orange-600 dark:text-orange-400">{fmt(d.outstanding)}</TableCell>
                    <TableCell className={`text-right font-semibold ${d.grossProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {fmt(d.grossProfit)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2">
                        <Progress value={d.pctCollected} className="h-1.5 w-16" />
                        <span className="text-xs font-medium">{d.pctCollected}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Detail View */}
      {selectedId && (
        <>
          {loadingDetail ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : detail ? (
            <div ref={printRef} className="space-y-6 print:space-y-4">
              {/* Print header */}
              <div className="hidden print:block mb-4">
                <h2 className="text-xl font-bold">Laporan Keuangan Keberangkatan</h2>
                <p className="text-sm text-gray-600">
                  {detail.departure.packageTitle} — {fmtDate(detail.departure.departureDate)}
                  {detail.departure.returnDate ? ` s/d ${fmtDate(detail.departure.returnDate)}` : ""}
                </p>
                <p className="text-xs text-gray-400 mt-1">Dicetak: {new Date().toLocaleString("id-ID")}</p>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Revenue Terkumpul"
                  value={fmt(detail.revenue.collected)}
                  sub={`Target: ${fmt(detail.revenue.target)}`}
                  icon={DollarSign}
                  color="green"
                />
                <StatCard
                  label="Piutang Outstanding"
                  value={fmt(detail.revenue.outstanding)}
                  sub={`${detail.revenue.bookingCount - detail.revenue.lunasCount} booking belum lunas`}
                  icon={TrendingDown}
                  color={detail.revenue.outstanding > 0 ? "orange" : "green"}
                />
                <StatCard
                  label="Total HPP"
                  value={fmt(detail.hpp.total)}
                  sub={`Per jemaah: ${fmt(detail.hpp.perPax)}`}
                  icon={Calculator}
                  color="blue"
                />
                <StatCard
                  label="Gross Profit"
                  value={fmt(detail.grossProfit)}
                  sub={`Margin: ${detail.marginPct}%`}
                  icon={detail.grossProfit >= 0 ? TrendingUp : TrendingDown}
                  color={detail.grossProfit >= 0 ? "purple" : "red"}
                />
              </div>

              {/* Revenue Bar */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <h2 className="font-semibold mb-3">Progress Pembayaran</h2>
                <div className="flex items-center gap-3 mb-1">
                  <Progress value={detail.revenue.pctCollected} className="flex-1 h-3" />
                  <span className="text-sm font-bold w-10 text-right">{detail.revenue.pctCollected}%</span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-2">
                  <span>🟢 Terkumpul: <strong className="text-foreground">{fmt(detail.revenue.collected)}</strong></span>
                  <span>🟠 Outstanding: <strong className="text-foreground">{fmt(detail.revenue.outstanding)}</strong></span>
                  <span>📋 Target: <strong className="text-foreground">{fmt(detail.revenue.target)}</strong></span>
                  <span>✅ Lunas: <strong className="text-foreground">{detail.revenue.lunasCount}/{detail.revenue.bookingCount}</strong></span>
                  <span>💺 Quota: <strong className="text-foreground">{detail.departure.filledSeats}/{detail.departure.quota}</strong></span>
                </div>
              </div>

              {/* HPP & Margin Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <p className="text-xs text-muted-foreground">Revenue (Collected)</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{fmt(detail.revenue.collected)}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <p className="text-xs text-muted-foreground">Total HPP (Biaya Operasional)</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{fmt(detail.hpp.total)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {detail.operationalCosts.length} item biaya
                  </p>
                </div>
                <div className={`rounded-xl border p-4 ${detail.grossProfit >= 0 ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"}`}>
                  <p className="text-xs text-muted-foreground">Gross Profit</p>
                  <p className={`text-2xl font-bold ${detail.grossProfit >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                    {fmt(detail.grossProfit)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Margin {detail.marginPct}%
                    {detail.marginPct < 10 && detail.marginPct >= 0 && " ⚠️ margin tipis"}
                    {detail.marginPct < 0 && " 🔴 merugi"}
                  </p>
                </div>
              </div>

              {/* Operational Costs Table */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                    <h2 className="font-semibold">Biaya Operasional (HPP)</h2>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Total: <strong>{fmt(detail.hpp.total)}</strong>
                  </span>
                </div>

                {detail.operationalCosts.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Belum ada data biaya operasional untuk keberangkatan ini.
                    <br />
                    <span className="text-xs">Tambahkan di menu HPP &amp; Profitabilitas.</span>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Kategori</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-center">Qty</TableHead>
                            <TableHead className="text-right">Harga Satuan</TableHead>
                            <TableHead className="text-center">Per Pax?</TableHead>
                            <TableHead className="text-right">Total Budgeted</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visibleCosts.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{c.category}</Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                {c.itemName}
                                {c.notes && <span className="block text-xs text-muted-foreground">{c.notes}</span>}
                              </TableCell>
                              <TableCell className="text-center">
                                {fmtNum(c.qty)} {c.unit}
                              </TableCell>
                              <TableCell className="text-right">{fmt(c.unitCost)}</TableCell>
                              <TableCell className="text-center">
                                {c.isPerPax ? (
                                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">Ya</Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Flat</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-semibold">{fmt(c.budgeted)}</TableCell>
                            </TableRow>
                          ))}
                          {/* Total row */}
                          <TableRow className="bg-gray-50 dark:bg-gray-800 font-bold">
                            <TableCell colSpan={5} className="text-right text-sm">Total HPP</TableCell>
                            <TableCell className="text-right">{fmt(detail.hpp.total)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                    {detail.operationalCosts.length > COSTS_PREVIEW && (
                      <button
                        onClick={() => setShowAllCosts((v) => !v)}
                        className="w-full py-2 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 border-t border-gray-200 dark:border-gray-800"
                      >
                        {showAllCosts ? (
                          <><ChevronUp className="w-3 h-3" /> Tampilkan lebih sedikit</>
                        ) : (
                          <><ChevronDown className="w-3 h-3" /> Lihat semua {detail.operationalCosts.length} item</>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Pilgrims Table */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <h2 className="font-semibold">Status Pembayaran Jemaah</h2>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {detail.revenue.lunasCount} / {detail.revenue.bookingCount} lunas
                  </span>
                </div>

                {detail.pilgrims.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Belum ada jemaah yang terdaftar untuk keberangkatan ini.
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Jemaah</TableHead>
                            <TableHead>Kode Booking</TableHead>
                            <TableHead className="text-right">Total Harga</TableHead>
                            <TableHead className="text-right">Sudah Bayar</TableHead>
                            <TableHead className="text-right">Sisa</TableHead>
                            <TableHead className="text-center">Progress</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visiblePilgrims.map((p) => {
                            const ps = payStatusMap[p.payStatus] ?? { label: p.payStatus, color: "" };
                            return (
                              <TableRow key={p.id}>
                                <TableCell>
                                  <p className="font-medium">{p.customerName}</p>
                                  {p.customerPhone && (
                                    <a
                                      href={`https://wa.me/${p.customerPhone.replace(/\D/g, "")}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-green-600 hover:underline"
                                    >
                                      {p.customerPhone}
                                    </a>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                    {p.bookingCode}
                                  </code>
                                </TableCell>
                                <TableCell className="text-right">{fmt(p.totalPrice)}</TableCell>
                                <TableCell className="text-right text-green-600 dark:text-green-400">{fmt(p.totalPaid)}</TableCell>
                                <TableCell className={`text-right ${p.outstanding > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}`}>
                                  {fmt(p.outstanding)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center gap-1.5 justify-center">
                                    <Progress value={p.pctPaid} className="h-1.5 w-16" />
                                    <span className="text-xs w-8 text-right">{p.pctPaid}%</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ps.color}`}>
                                    {ps.label}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {detail.pilgrims.length > PILGRIMS_PREVIEW && (
                      <button
                        onClick={() => setShowAllPilgrims((v) => !v)}
                        className="w-full py-2 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 border-t border-gray-200 dark:border-gray-800"
                      >
                        {showAllPilgrims ? (
                          <><ChevronUp className="w-3 h-3" /> Tampilkan lebih sedikit</>
                        ) : (
                          <><ChevronDown className="w-3 h-3" /> Lihat semua {detail.pilgrims.length} jemaah</>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* Empty state */}
      {!loadingList && departures.length === 0 && !error && (
        <div className="text-center py-16 text-muted-foreground">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Belum ada keberangkatan</p>
          <p className="text-sm">Tambahkan keberangkatan di menu Keberangkatan terlebih dahulu.</p>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#root) { display: none; }
          header, nav, aside, .no-print { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
}
