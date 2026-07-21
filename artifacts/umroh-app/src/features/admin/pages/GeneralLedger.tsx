/**
 * F-7: Buku Besar (General Ledger) — transaksi per akun dengan running balance
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { BookOpen, Download } from "lucide-react";

interface CoaAccount { id: string; code: string; name: string; type: string; }
interface LedgerRow {
  id: string; category: string; type: string; amount: string;
  description: string | null; referenceNumber: string | null;
  transactionDate: string; entryType: string | null; runningBalance: number;
}

const fmtCurrency = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default function GeneralLedger() {
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);

  const { data: accounts = [] } = useQuery<CoaAccount[]>({
    queryKey: ["coa"],
    queryFn: () => apiFetch("/api/admin/coa"),
  });

  const params = new URLSearchParams({ accountId: selectedAccountId, from, to });
  const { data: rows = [], isLoading } = useQuery<LedgerRow[]>({
    queryKey: ["ledger", selectedAccountId, from, to],
    queryFn: () => apiFetch(`/api/admin/coa/ledger?${params}`),
    enabled: !!selectedAccountId,
  });

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const totalDebit = rows.filter((r) => r.entryType === "debit").reduce((s, r) => s + parseFloat(r.amount), 0);
  const totalCredit = rows.filter((r) => r.entryType === "credit").reduce((s, r) => s + parseFloat(r.amount), 0);

  const exportCsv = () => {
    const header = "Tanggal,Deskripsi,No. Referensi,Debit,Kredit,Saldo\n";
    const lines = rows.map((r) => {
      const amt = parseFloat(r.amount);
      const isDebit = r.entryType === "debit";
      return [
        new Date(r.transactionDate).toLocaleDateString("id-ID"),
        r.description ?? "",
        r.referenceNumber ?? "",
        isDebit ? amt : 0,
        !isDebit ? amt : 0,
        r.runningBalance,
      ].join(",");
    }).join("\n");
    const blob = new Blob([header + lines], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `buku-besar-${selectedAccount?.code ?? ""}-${from}-${to}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Buku Besar</h1>
          <p className="text-muted-foreground text-sm">Riwayat transaksi per akun dengan saldo berjalan</p>
        </div>
        {rows.length > 0 && (
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Kode Akun</label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger><SelectValue placeholder="Pilih akun..." /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Dari</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Sampai</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedAccountId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Pilih akun untuk menampilkan buku besar</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Memuat...</div>
      ) : (
        <>
          {selectedAccount && (
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono">{selectedAccount.code}</Badge>
              <span className="font-semibold">{selectedAccount.name}</span>
            </div>
          )}

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Debit</p><p className="text-xl font-bold text-blue-600">{fmtCurrency(totalDebit)}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Kredit</p><p className="text-xl font-bold text-orange-600">{fmtCurrency(totalCredit)}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Saldo Akhir</p><p className="text-xl font-bold">{fmtCurrency(rows.at(-1)?.runningBalance ?? 0)}</p></CardContent></Card>
          </div>

          {/* Ledger Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="py-3 px-4 text-left font-medium">Tanggal</th>
                      <th className="py-3 px-4 text-left font-medium">Deskripsi</th>
                      <th className="py-3 px-4 text-left font-medium">No. Ref</th>
                      <th className="py-3 px-4 text-right font-medium">Debit</th>
                      <th className="py-3 px-4 text-right font-medium">Kredit</th>
                      <th className="py-3 px-4 text-right font-medium">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada transaksi untuk periode ini</td></tr>
                    ) : rows.map((r) => {
                      const amt = parseFloat(r.amount);
                      const isDebit = r.entryType === "debit";
                      return (
                        <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="py-2 px-4 text-muted-foreground">
                            {new Date(r.transactionDate).toLocaleDateString("id-ID")}
                          </td>
                          <td className="py-2 px-4">{r.description ?? r.category}</td>
                          <td className="py-2 px-4 font-mono text-xs text-muted-foreground">{r.referenceNumber ?? "-"}</td>
                          <td className="py-2 px-4 text-right">{isDebit ? fmtCurrency(amt) : "-"}</td>
                          <td className="py-2 px-4 text-right">{!isDebit ? fmtCurrency(amt) : "-"}</td>
                          <td className="py-2 px-4 text-right font-medium">{fmtCurrency(r.runningBalance)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {rows.length > 0 && (
                    <tfoot className="border-t bg-muted/40 font-semibold">
                      <tr>
                        <td colSpan={3} className="py-3 px-4">Total</td>
                        <td className="py-3 px-4 text-right">{fmtCurrency(totalDebit)}</td>
                        <td className="py-3 px-4 text-right">{fmtCurrency(totalCredit)}</td>
                        <td className="py-3 px-4 text-right">{fmtCurrency(rows.at(-1)?.runningBalance ?? 0)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
