/**
 * F-8: Laporan Akuntansi Standar — Laporan Laba/Rugi, Neraca, Arus Kas
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Download, TrendingUp, Scale, Droplets } from "lucide-react";

const fmtCurrency = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

// ── Income Statement ──────────────────────────────────────────────────────────

function IncomeStatement({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["income-statement", from, to],
    queryFn: () => apiFetch(`/api/admin/finance/reports/income-statement?from=${from}&to=${to}`),
  });

  if (isLoading) return <div className="text-center py-10 text-muted-foreground">Memuat...</div>;
  if (!data) return null;

  const d = data as any;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-500" />Pendapatan</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              {(d.revenue?.items ?? []).map((item: any, i: number) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2">{item.accountName}</td>
                  <td className="py-2 text-right font-medium text-green-700">{fmtCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t font-semibold">
              <tr><td className="py-2">Total Pendapatan</td><td className="py-2 text-right text-green-700">{fmtCurrency(d.revenue?.total ?? 0)}</td></tr>
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
                  <td className="py-2">{item.accountName}</td>
                  <td className="py-2 text-right font-medium text-red-700">{fmtCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t font-semibold">
              <tr><td className="py-2">Total Beban</td><td className="py-2 text-right text-red-700">{fmtCurrency(d.expense?.total ?? 0)}</td></tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      <Card className={`border-2 ${d.netIncome >= 0 ? "border-green-300" : "border-red-300"}`}>
        <CardContent className="pt-4 flex justify-between items-center">
          <span className="font-bold text-lg">Laba / Rugi Bersih</span>
          <span className={`font-bold text-2xl ${d.netIncome >= 0 ? "text-green-700" : "text-red-700"}`}>
            {d.netIncome >= 0 ? "+" : ""}{fmtCurrency(d.netIncome)}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Balance Sheet ─────────────────────────────────────────────────────────────

function BalanceSheet({ date }: { date: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["balance-sheet", date],
    queryFn: () => apiFetch(`/api/admin/finance/reports/balance-sheet?date=${date}`),
  });

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
      <p className="text-sm text-muted-foreground">Per tanggal: <strong>{new Date(d.asOf).toLocaleDateString("id-ID", { dateStyle: "long" })}</strong></p>
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
  const { data, isLoading } = useQuery({
    queryKey: ["cash-flow", from, to],
    queryFn: () => apiFetch(`/api/admin/finance/reports/cash-flow?from=${from}&to=${to}`),
  });

  if (isLoading) return <div className="text-center py-10 text-muted-foreground">Memuat...</div>;
  if (!data) return null;

  const d = data as any;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Masuk</p><p className="text-xl font-bold text-green-600">{fmtCurrency(d.summary?.totalInflow ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Keluar</p><p className="text-xl font-bold text-red-600">{fmtCurrency(d.summary?.totalOutflow ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Net Cash Flow</p><p className={`text-xl font-bold ${d.summary?.netCashFlow >= 0 ? "text-green-700" : "text-red-700"}`}>{fmtCurrency(d.summary?.netCashFlow ?? 0)}</p></CardContent></Card>
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
        <p className="text-muted-foreground text-sm">Laporan Laba/Rugi, Neraca, dan Arus Kas</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="income"><TrendingUp className="h-4 w-4 mr-2" />Laba / Rugi</TabsTrigger>
          <TabsTrigger value="balance"><Scale className="h-4 w-4 mr-2" />Neraca</TabsTrigger>
          <TabsTrigger value="cashflow"><Droplets className="h-4 w-4 mr-2" />Arus Kas</TabsTrigger>
        </TabsList>

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
      </Tabs>
    </div>
  );
}
