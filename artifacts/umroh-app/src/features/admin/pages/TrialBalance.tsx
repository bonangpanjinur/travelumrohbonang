/**
 * F-7: Trial Balance (Neraca Saldo) — saldo debit/kredit per akun
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Download, Scale } from "lucide-react";

interface TrialBalanceRow {
  id: string; code: string; name: string; type: string; category: string | null;
  normalBalance: string; totalDebit: number; totalCredit: number; balance: number;
}

interface TrialBalanceData {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
}

const TYPE_LABELS: Record<string, string> = {
  asset: "Aset", liability: "Kewajiban", equity: "Ekuitas",
  revenue: "Pendapatan", expense: "Beban",
};

const fmtCurrency = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Math.abs(n));

export default function TrialBalance() {
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setMonth(0, 1); return d.toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);

  const params = new URLSearchParams({ from, to });
  const { data, isLoading, refetch } = useQuery<TrialBalanceData>({
    queryKey: ["trial-balance", from, to],
    queryFn: () => apiFetch(`/api/admin/coa/trial-balance?${params}`),
  });

  const rows = data?.rows ?? [];
  const totalDebit = data?.totalDebit ?? 0;
  const totalCredit = data?.totalCredit ?? 0;
  const isBalanced = Math.abs(totalDebit - totalCredit) < 1;

  const exportCsv = () => {
    const header = "Kode,Nama Akun,Tipe,Debit,Kredit,Saldo\n";
    const lines = rows.map((r) => [
      r.code, r.name, TYPE_LABELS[r.type] ?? r.type,
      r.totalDebit, r.totalCredit, r.balance,
    ].join(",")).join("\n");
    const blob = new Blob([header + lines], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `neraca-saldo-${from}-${to}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const grouped = Object.entries(TYPE_LABELS).map(([type, label]) => ({
    type, label, items: rows.filter((r) => r.type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Neraca Saldo</h1>
          <p className="text-muted-foreground text-sm">Trial balance — saldo debit & kredit per akun</p>
        </div>
        {rows.length > 0 && (
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
        )}
      </div>

      {/* Period Filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 items-end">
            <div>
              <label className="text-sm font-medium mb-1 block">Dari</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Sampai</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
            <Button onClick={() => refetch()}>Tampilkan</Button>
          </div>
        </CardContent>
      </Card>

      {/* Balance Status */}
      {rows.length > 0 && (
        <Card className={`border-2 ${isBalanced ? "border-green-300 bg-green-50/50" : "border-red-300 bg-red-50/50"}`}>
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className={`h-5 w-5 ${isBalanced ? "text-green-600" : "text-red-600"}`} />
              <span className={`font-semibold ${isBalanced ? "text-green-700" : "text-red-700"}`}>
                {isBalanced ? "✓ Neraca Seimbang" : "⚠ Neraca Tidak Seimbang"}
              </span>
            </div>
            <div className="flex gap-6 text-sm">
              <div><span className="text-muted-foreground mr-2">Total Debit:</span><span className="font-semibold">{fmtCurrency(totalDebit)}</span></div>
              <div><span className="text-muted-foreground mr-2">Total Kredit:</span><span className="font-semibold">{fmtCurrency(totalCredit)}</span></div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Memuat...</div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Scale className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Tidak ada data transaksi untuk periode ini</p>
          </CardContent>
        </Card>
      ) : (
        grouped.map(({ type, label, items }) => (
          <Card key={type}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{label}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="py-2 px-4 text-left font-medium w-28">Kode</th>
                    <th className="py-2 px-4 text-left font-medium">Nama Akun</th>
                    <th className="py-2 px-4 text-right font-medium">Debit</th>
                    <th className="py-2 px-4 text-right font-medium">Kredit</th>
                    <th className="py-2 px-4 text-right font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="py-2 px-4 font-mono text-xs">{r.code}</td>
                      <td className="py-2 px-4">{r.name}</td>
                      <td className="py-2 px-4 text-right">{r.totalDebit > 0 ? fmtCurrency(r.totalDebit) : "-"}</td>
                      <td className="py-2 px-4 text-right">{r.totalCredit > 0 ? fmtCurrency(r.totalCredit) : "-"}</td>
                      <td className={`py-2 px-4 text-right font-medium ${r.balance < 0 ? "text-red-600" : ""}`}>
                        {fmtCurrency(r.balance)}{r.balance < 0 ? " (K)" : ""}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/40 font-semibold border-t">
                    <td colSpan={2} className="py-2 px-4">Subtotal {label}</td>
                    <td className="py-2 px-4 text-right">{fmtCurrency(items.reduce((s, r) => s + r.totalDebit, 0))}</td>
                    <td className="py-2 px-4 text-right">{fmtCurrency(items.reduce((s, r) => s + r.totalCredit, 0))}</td>
                    <td className="py-2 px-4 text-right">{fmtCurrency(items.reduce((s, r) => s + r.balance, 0))}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))
      )}

      {/* Grand Total */}
      {rows.length > 0 && (
        <Card className="border-2">
          <CardContent className="pt-4">
            <table className="w-full text-sm">
              <tfoot>
                <tr className="font-bold text-base">
                  <td colSpan={2} className="py-2 px-4">TOTAL KESELURUHAN</td>
                  <td className="py-2 px-4 text-right">{fmtCurrency(totalDebit)}</td>
                  <td className="py-2 px-4 text-right">{fmtCurrency(totalCredit)}</td>
                  <td className="py-2 px-4 text-right">-</td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
