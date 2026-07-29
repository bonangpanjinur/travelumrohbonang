/**
 * F-8 + C4 + C5 + C6: Laporan Keuangan
 * Tabs: Laba/Rugi, Neraca, Arus Kas, Biaya vs Aktual, Laporan Pajak
 * C6: PDF download button on each tab
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Badge } from "@/shared/components/ui/badge";
import {
  Download, TrendingUp, Scale, Droplets, Package, Receipt,
  AlertCircle, ChevronDown, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabaseAuth } from "@/shared/integrations/supabase/auth-client";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

async function downloadPdf(url: string, filename: string) {
  let authHeader = "";
  try {
    const { data: { session } } = await supabaseAuth.auth.getSession();
    if (session?.access_token) authHeader = `Bearer ${session.access_token}`;
  } catch { /* no-op */ }

  const response = await fetch(url, {
    credentials: "include",
    headers: authHeader ? { Authorization: authHeader } : {},
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).error ?? "Download gagal");
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

// ── Income Statement ──────────────────────────────────────────────────────────

function IncomeStatement({ from, to }: { from: string; to: string }) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["income-statement", from, to],
    queryFn: () => apiFetch(`/api/admin/finance/reports/income-statement?from=${from}&to=${to}`),
  });

  async function handlePdf() {
    setPdfLoading(true);
    try {
      await downloadPdf(
        `/api/admin/finance/reports/income-statement.pdf?from=${from}&to=${to}`,
        `laporan-laba-rugi-${from}-${to}.pdf`,
      );
      toast.success("PDF berhasil diunduh");
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal generate PDF");
    } finally {
      setPdfLoading(false);
    }
  }

  if (isLoading) return <div className="text-center py-10 text-muted-foreground">Memuat...</div>;
  if (!data) return null;

  const d = data as any;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handlePdf} disabled={pdfLoading}>
          <Download className="h-4 w-4 mr-2" />
          {pdfLoading ? "Generating PDF..." : "Download PDF"}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-500" />Pendapatan</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              {(d.revenue?.items ?? []).map((item: any, i: number) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 text-xs text-muted-foreground font-mono w-20">{item.accountCode || "–"}</td>
                  <td className="py-2">{item.accountName}</td>
                  <td className="py-2 text-right font-medium text-green-700">{fmtCurrency(item.total)}</td>
                </tr>
              ))}
              {(d.revenue?.items ?? []).length === 0 && (
                <tr><td colSpan={3} className="py-4 text-center text-muted-foreground text-xs">Belum ada data (pastikan jurnal payment sudah diposting)</td></tr>
              )}
            </tbody>
            <tfoot className="border-t font-semibold">
              <tr><td /><td className="py-2">Total Pendapatan</td><td className="py-2 text-right text-green-700">{fmtCurrency(d.revenue?.total ?? 0)}</td></tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-red-500 rotate-180" />Beban</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              {(d.expense?.items ?? []).map((item: any, i: number) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 text-xs text-muted-foreground font-mono w-20">{item.accountCode || "–"}</td>
                  <td className="py-2">{item.accountName}</td>
                  <td className="py-2 text-right font-medium text-red-700">{fmtCurrency(item.total)}</td>
                </tr>
              ))}
              {(d.expense?.items ?? []).length === 0 && (
                <tr><td colSpan={3} className="py-4 text-center text-muted-foreground text-xs">Belum ada data beban</td></tr>
              )}
            </tbody>
            <tfoot className="border-t font-semibold">
              <tr><td /><td className="py-2">Total Beban</td><td className="py-2 text-right text-red-700">{fmtCurrency(d.expense?.total ?? 0)}</td></tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      <Card className={`border-2 ${(d.netIncome ?? 0) >= 0 ? "border-green-300" : "border-red-300"}`}>
        <CardContent className="pt-4 flex justify-between items-center">
          <span className="font-bold text-lg">Laba / Rugi Bersih</span>
          <span className={`font-bold text-2xl ${(d.netIncome ?? 0) >= 0 ? "text-green-700" : "text-red-700"}`}>
            {(d.netIncome ?? 0) >= 0 ? "+" : ""}{fmtCurrency(d.netIncome ?? 0)}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Balance Sheet ─────────────────────────────────────────────────────────────

function BalanceSheet({ date }: { date: string }) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["balance-sheet", date],
    queryFn: () => apiFetch(`/api/admin/finance/reports/balance-sheet?date=${date}`),
  });

  async function handlePdf() {
    setPdfLoading(true);
    try {
      await downloadPdf(
        `/api/admin/finance/reports/balance-sheet.pdf?date=${date}`,
        `neraca-${date}.pdf`,
      );
      toast.success("PDF berhasil diunduh");
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal generate PDF");
    } finally {
      setPdfLoading(false);
    }
  }

  if (isLoading) return <div className="text-center py-10 text-muted-foreground">Memuat...</div>;
  if (!data) return null;

  const d = data as any;

  const Section = ({ title, items, total, colorClass }: any) => (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <tbody>
            {(items ?? []).map((item: any, i: number) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2 font-mono text-xs text-muted-foreground w-24">{item.code}</td>
                <td className="py-2">{item.name}</td>
                <td className={`py-2 text-right font-medium ${colorClass}`}>{fmtCurrency(item.balance)}</td>
              </tr>
            ))}
            {(items ?? []).length === 0 && (
              <tr><td colSpan={3} className="py-4 text-center text-muted-foreground text-xs">Belum ada data</td></tr>
            )}
          </tbody>
          <tfoot className="border-t font-semibold">
            <tr><td colSpan={2} className="py-2">Total {title}</td><td className={`py-2 text-right ${colorClass}`}>{fmtCurrency(total ?? 0)}</td></tr>
          </tfoot>
        </table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Per tanggal: <strong>{new Date(d.asOf).toLocaleDateString("id-ID", { dateStyle: "long" })}</strong></p>
        <Button variant="outline" size="sm" onClick={handlePdf} disabled={pdfLoading}>
          <Download className="h-4 w-4 mr-2" />
          {pdfLoading ? "Generating PDF..." : "Download PDF"}
        </Button>
      </div>
      <Section title="Aset" items={d.assets?.items} total={d.assets?.total} colorClass="text-blue-700" />
      <Section title="Kewajiban" items={d.liabilities?.items} total={d.liabilities?.total} colorClass="text-orange-700" />
      <Section title="Ekuitas" items={d.equity?.items} total={d.equity?.total} colorClass="text-purple-700" />
      <Card className="border-2">
        <CardContent className="pt-4 flex justify-between items-center">
          <span className="font-bold text-lg">Total Kewajiban + Ekuitas</span>
          <span className="font-bold text-2xl">{fmtCurrency(d.totalLiabilitiesEquity ?? 0)}</span>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Cash Flow ─────────────────────────────────────────────────────────────────

function CashFlow({ from, to }: { from: string; to: string }) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["cash-flow", from, to],
    queryFn: () => apiFetch(`/api/admin/finance/reports/cash-flow?from=${from}&to=${to}`),
  });

  async function handlePdf() {
    setPdfLoading(true);
    try {
      await downloadPdf(
        `/api/admin/finance/reports/cash-flow.pdf?from=${from}&to=${to}`,
        `arus-kas-${from}-${to}.pdf`,
      );
      toast.success("PDF berhasil diunduh");
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal generate PDF");
    } finally {
      setPdfLoading(false);
    }
  }

  if (isLoading) return <div className="text-center py-10 text-muted-foreground">Memuat...</div>;
  if (!data) return null;

  const d = data as any;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handlePdf} disabled={pdfLoading}>
          <Download className="h-4 w-4 mr-2" />
          {pdfLoading ? "Generating PDF..." : "Download PDF"}
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Masuk</p><p className="text-xl font-bold text-green-600">{fmtCurrency(d.summary?.totalInflow ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Keluar</p><p className="text-xl font-bold text-red-600">{fmtCurrency(d.summary?.totalOutflow ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Net Cash Flow</p><p className={`text-xl font-bold ${(d.summary?.netCashFlow ?? 0) >= 0 ? "text-green-700" : "text-red-700"}`}>{fmtCurrency(d.summary?.netCashFlow ?? 0)}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Arus Kas Bulanan</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="py-2 text-left font-medium">Bulan</th>
                <th className="py-2 text-right font-medium text-green-700">Masuk</th>
                <th className="py-2 text-right font-medium text-red-700">Keluar</th>
                <th className="py-2 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {(d.monthly ?? []).map((r: any) => (
                <tr key={r.month} className="border-b last:border-0">
                  <td className="py-2">{new Date(r.month + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</td>
                  <td className="py-2 text-right text-green-700">{fmtCurrency(r.inflow)}</td>
                  <td className="py-2 text-right text-red-700">{fmtCurrency(r.outflow)}</td>
                  <td className={`py-2 text-right font-medium ${r.net >= 0 ? "text-green-700" : "text-red-700"}`}>{fmtCurrency(r.net)}</td>
                </tr>
              ))}
              {(d.monthly ?? []).length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Tidak ada data</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── C4: Biaya vs Aktual ───────────────────────────────────────────────────────

function CostVsActual() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { data, isLoading } = useQuery({
    queryKey: ["cost-vs-actual"],
    queryFn: () => apiFetch("/api/admin/finance/reports/cost-vs-actual"),
  });

  if (isLoading) return <div className="text-center py-10 text-muted-foreground">Memuat...</div>;

  const d = data as any;
  const departures: any[] = d?.departures ?? [];
  const summary = d?.summary ?? {};

  const varianceColor = (v: number) => v > 0 ? "text-red-600" : v < 0 ? "text-green-600" : "text-muted-foreground";

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Total Keberangkatan</p>
          <p className="text-xl font-bold">{summary.departureCount ?? 0}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Total Anggaran HPP</p>
          <p className="text-xl font-bold text-blue-700">{fmtCurrency(summary.totalBudgeted ?? 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Total Realisasi</p>
          <p className="text-xl font-bold">{fmtCurrency(summary.totalActual ?? 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Selisih</p>
          <p className={`text-xl font-bold ${varianceColor(summary.totalVariance ?? 0)}`}>
            {fmtCurrency(summary.totalVariance ?? 0)}
            <span className="text-sm ml-1">({fmtPct(summary.variancePct ?? 0)})</span>
          </p>
        </CardContent></Card>
      </div>

      {departures.length === 0 && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          Belum ada data biaya keberangkatan. Isi <strong>package_costs</strong> terlebih dahulu di halaman detail keberangkatan.
        </CardContent></Card>
      )}

      {/* Per departure */}
      {departures.map((dep: any) => {
        const isOpen = expanded[dep.departureId] ?? false;
        return (
          <Card key={dep.departureId}>
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setExpanded(prev => ({ ...prev, [dep.departureId]: !isOpen }))}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <CardTitle className="text-base">{dep.packageTitle}</CardTitle>
                  <Badge variant="outline" className="font-normal">{dep.departureDate}</Badge>
                  <Badge variant="secondary">{dep.filledSeats} pax</Badge>
                </div>
                <div className="text-right text-sm">
                  <span className="text-muted-foreground mr-3">Anggaran: {fmtCurrency(dep.totalBudgeted)}</span>
                  <span className="mr-3">Realisasi: {fmtCurrency(dep.totalActual)}</span>
                  <span className={`font-semibold ${varianceColor(dep.totalVariance)}`}>
                    {fmtCurrency(dep.totalVariance)} ({fmtPct(dep.variancePct)})
                  </span>
                </div>
              </div>
            </CardHeader>

            {isOpen && (
              <CardContent>
                {(dep.categories ?? []).map((cat: any) => (
                  <div key={cat.category} className="mb-4">
                    <div className="flex justify-between items-center bg-muted/50 px-3 py-1.5 rounded text-sm font-semibold mb-1">
                      <span className="capitalize">{cat.category}</span>
                      <span className="flex gap-6 text-xs font-normal">
                        <span className="text-muted-foreground">Anggaran: {fmtCurrency(cat.subtotalBudgeted)}</span>
                        <span>Realisasi: {fmtCurrency(cat.subtotalActual)}</span>
                        <span className={varianceColor(cat.subtotalVariance)}>
                          Selisih: {fmtCurrency(cat.subtotalVariance)}
                        </span>
                      </span>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="py-1 text-left font-medium">Item</th>
                          <th className="py-1 text-right font-medium">Anggaran</th>
                          <th className="py-1 text-right font-medium">Realisasi</th>
                          <th className="py-1 text-right font-medium">Selisih</th>
                          <th className="py-1 text-center font-medium">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.items.map((item: any, i: number) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-1.5">
                              {item.itemName}
                              {item.isPerPax && <span className="ml-1 text-muted-foreground">/pax</span>}
                              {!item.isActualSet && <span className="ml-1 text-amber-500">(estimasi)</span>}
                            </td>
                            <td className="py-1.5 text-right">{fmtCurrency(item.budgeted)}</td>
                            <td className="py-1.5 text-right">{fmtCurrency(item.actual)}</td>
                            <td className={`py-1.5 text-right ${varianceColor(item.variance)}`}>{fmtCurrency(item.variance)}</td>
                            <td className={`py-1.5 text-center ${varianceColor(item.variance)}`}>{fmtPct(item.variancePct)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ── C5: Laporan Pajak ────────────────────────────────────────────────────────

function TaxReport({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["tax-summary", from, to],
    queryFn: () => apiFetch(`/api/admin/finance/reports/tax-summary?from=${from}&to=${to}`),
  });

  if (isLoading) return <div className="text-center py-10 text-muted-foreground">Memuat...</div>;
  if (!data) return null;

  const d = data as any;
  const rev = d.revenue ?? {};
  const exp = d.expenses ?? {};
  const sum = d.summary ?? {};

  const TaxCard = ({ label, rateLabel, base, amount, note, colorClass = "text-amber-700" }: any) => (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-xs text-muted-foreground">{note}</p>
          </div>
          <Badge variant="secondary">{rateLabel}</Badge>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">DPP</span>
          <span>{fmtCurrency(base ?? 0)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Estimasi Pajak</span>
          <span className={colorClass}>{fmtCurrency(amount ?? 0)}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-5">
      {/* Disclaimer */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <strong>Disclaimer:</strong> {sum.disclaimer}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Total summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Total Pendapatan (Periode)</p>
          <p className="text-2xl font-bold text-green-700">{fmtCurrency(rev.totalRevenue ?? 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Total Estimasi Pajak</p>
          <p className="text-2xl font-bold text-amber-700">{fmtCurrency(sum.totalEstimatedTax ?? 0)}</p>
        </CardContent></Card>
      </div>

      {/* Revenue-based taxes */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pajak atas Pendapatan</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <TaxCard
            label="PPN (Pajak Pertambahan Nilai)"
            rateLabel={rev.ppn?.rateLabel}
            base={rev.ppn?.base}
            amount={rev.ppn?.amount}
            note={rev.ppn?.note}
          />
          <TaxCard
            label="PPh Final UMKM"
            rateLabel={rev.pphFinal?.rateLabel}
            base={rev.pphFinal?.base}
            amount={rev.pphFinal?.amount}
            note={rev.pphFinal?.note}
          />
        </div>
      </div>

      {/* Expense-based taxes */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pajak atas Beban</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <TaxCard
            label="PPh Pasal 23"
            rateLabel={exp.pph23?.rateLabel}
            base={exp.pph23?.base}
            amount={exp.pph23?.amount}
            note={exp.pph23?.note}
            colorClass="text-orange-700"
          />
          <TaxCard
            label="PPh Pasal 21 (estimasi)"
            rateLabel={exp.pph21Estimated?.rateLabel}
            base={exp.pph21Estimated?.base}
            amount={exp.pph21Estimated?.amount}
            note={exp.pph21Estimated?.note}
            colorClass="text-orange-700"
          />
        </div>
      </div>

      {/* Expense breakdown table */}
      {(exp.breakdown ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Rincian Beban per Kategori</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="py-2 text-left font-medium">Kategori</th>
                  <th className="py-2 text-center font-medium">Transaksi</th>
                  <th className="py-2 text-right font-medium">Total</th>
                  <th className="py-2 text-right font-medium">Est. PPh 23</th>
                </tr>
              </thead>
              <tbody>
                {exp.breakdown.map((r: any, i: number) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 flex items-center gap-1.5">
                      {r.category}
                      {r.isPph23Eligible && <Badge variant="outline" className="text-xs px-1">PPh 23</Badge>}
                    </td>
                    <td className="py-2 text-center text-muted-foreground">{r.count}</td>
                    <td className="py-2 text-right">{fmtCurrency(r.total)}</td>
                    <td className="py-2 text-right text-orange-700">
                      {r.pph23Estimated > 0 ? fmtCurrency(r.pph23Estimated) : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FinancialReports() {
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setMonth(0, 1); return d.toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [tab, setTab] = useState("income");

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Laporan Keuangan</h1>
        <p className="text-muted-foreground text-sm">Laporan Laba/Rugi, Neraca, Arus Kas, Biaya vs Aktual, dan Pajak</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="income"><TrendingUp className="h-4 w-4 mr-1.5" />Laba / Rugi</TabsTrigger>
          <TabsTrigger value="balance"><Scale className="h-4 w-4 mr-1.5" />Neraca</TabsTrigger>
          <TabsTrigger value="cashflow"><Droplets className="h-4 w-4 mr-1.5" />Arus Kas</TabsTrigger>
          <TabsTrigger value="costvsactual"><Package className="h-4 w-4 mr-1.5" />Biaya vs Aktual</TabsTrigger>
          <TabsTrigger value="tax"><Receipt className="h-4 w-4 mr-1.5" />Laporan Pajak</TabsTrigger>
        </TabsList>

        {/* ── Laba / Rugi ── */}
        <TabsContent value="income" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-3 items-end">
                <div><label className="text-sm font-medium mb-1 block">Dari</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
                <div><label className="text-sm font-medium mb-1 block">Sampai</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
              </div>
            </CardContent>
          </Card>
          <IncomeStatement from={from} to={to} />
        </TabsContent>

        {/* ── Neraca ── */}
        <TabsContent value="balance" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-3 items-end">
                <div><label className="text-sm font-medium mb-1 block">Per Tanggal</label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" /></div>
              </div>
            </CardContent>
          </Card>
          <BalanceSheet date={date} />
        </TabsContent>

        {/* ── Arus Kas ── */}
        <TabsContent value="cashflow" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-3 items-end">
                <div><label className="text-sm font-medium mb-1 block">Dari</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
                <div><label className="text-sm font-medium mb-1 block">Sampai</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
              </div>
            </CardContent>
          </Card>
          <CashFlow from={from} to={to} />
        </TabsContent>

        {/* ── C4: Biaya vs Aktual ── */}
        <TabsContent value="costvsactual" className="mt-4">
          <Card className="mb-4">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">
                Perbandingan <strong>anggaran HPP</strong> (dari <code>package_costs.unit_cost</code>) vs{" "}
                <strong>realisasi aktual</strong> (dari <code>package_costs.actual_amount</code>). Klik baris keberangkatan untuk melihat detail per kategori biaya.
                Aktual bisa diisi di halaman detail keberangkatan → tab Biaya Operasional.
              </p>
            </CardContent>
          </Card>
          <CostVsActual />
        </TabsContent>

        {/* ── C5: Laporan Pajak ── */}
        <TabsContent value="tax" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-3 items-end">
                <div><label className="text-sm font-medium mb-1 block">Dari</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
                <div><label className="text-sm font-medium mb-1 block">Sampai</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
              </div>
            </CardContent>
          </Card>
          <TaxReport from={from} to={to} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
