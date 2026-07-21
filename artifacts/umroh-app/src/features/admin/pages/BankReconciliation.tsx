/**
 * F-10: Rekonsiliasi Bank — import mutasi & matching ke booking_payments
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { toast } from "sonner";
import { Upload, Wand2, CheckCircle2, XCircle, Download } from "lucide-react";

interface BankMutation {
  id: string; mutationDate: string; description: string | null;
  amount: number; balance: number | null; refNumber: string | null;
  bankAccount: string | null; bankName: string | null;
  matchedTo: string | null; isMatched: boolean; notes: string | null;
}
interface ReconciliationResult {
  data: BankMutation[];
  stats: { total: number; matched: number; unmatched: number; totalKredit: number; totalDebit: number };
}

const fmtCurrency = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Math.abs(n));

// Dummy CSV parser for bank mutations
function parseCsvRows(csvText: string): Array<{ date: string; description: string; amount: number; balance?: number; refNumber?: string }> {
  const lines = csvText.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  // Skip header, parse: date, description, debit, kredit, balance
  return lines.slice(1).map((line) => {
    const parts = line.split(",").map((p) => p.trim().replace(/"/g, ""));
    const [date, desc, debitStr, kreditStr, balStr, ref] = parts;
    const debit = parseFloat(debitStr?.replace(/\./g, "").replace(",", ".")) || 0;
    const kredit = parseFloat(kreditStr?.replace(/\./g, "").replace(",", ".")) || 0;
    const amount = kredit > 0 ? kredit : -debit;
    return {
      date: date?.includes("-") ? date : "",
      description: desc ?? "",
      amount,
      balance: parseFloat(balStr?.replace(/\./g, "").replace(",", ".")) || undefined,
      refNumber: ref ?? undefined,
    };
  }).filter((r) => r.date && r.amount !== 0);
}

export default function BankReconciliation() {
  const qc = useQueryClient();
  const [matchedFilter, setMatchedFilter] = useState("all");
  const [bankAccount, setBankAccount] = useState("");
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [csvText, setCsvText] = useState("");
  const [importBankName, setImportBankName] = useState("BCA");
  const [importAccount, setImportAccount] = useState("");
  const [tab, setTab] = useState("list");

  const params = new URLSearchParams();
  if (matchedFilter !== "all") params.set("matched", matchedFilter);
  if (bankAccount) params.set("bankAccount", bankAccount);
  params.set("from", from); params.set("to", to);

  const { data: result, isLoading } = useQuery<ReconciliationResult>({
    queryKey: ["bank-reconciliation", matchedFilter, bankAccount, from, to],
    queryFn: () => apiFetch(`/api/admin/bank-reconciliation?${params}`),
  });

  const rows = result?.data ?? [];
  const stats = result?.stats;

  const importMutation = useMutation({
    mutationFn: (body: any) => apiFetch("/api/admin/bank-reconciliation/import", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ["bank-reconciliation"] });
      setCsvText("");
      setTab("list");
      toast.success(`Import berhasil: ${d.inserted} mutasi ditambahkan (${d.skipped} duplikat dilewati)`);
    },
    onError: (e: any) => toast.error(e.message || "Gagal import"),
  });

  const autoMatchMutation = useMutation({
    mutationFn: () => apiFetch("/api/admin/bank-reconciliation/auto-match", { method: "POST" }),
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ["bank-reconciliation"] });
      toast.success(`Auto-match: ${d.matched} mutasi berhasil dicocokkan`);
    },
    onError: (e: any) => toast.error(e.message || "Gagal auto-match"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      apiFetch(`/api/admin/bank-reconciliation/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bank-reconciliation"] }); toast.success("Diperbarui"); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleImport = () => {
    if (!csvText.trim() || !importAccount) return;
    const rows = parseCsvRows(csvText);
    if (rows.length === 0) { toast.error("Tidak ada data valid yang bisa di-parse dari CSV"); return; }
    importMutation.mutate({ rows, bankAccount: importAccount, bankName: importBankName });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target?.result as string ?? "");
    reader.readAsText(file);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rekonsiliasi Bank</h1>
          <p className="text-muted-foreground text-sm">Import mutasi rekening koran & cocokkan ke pembayaran jemaah</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => autoMatchMutation.mutate()} disabled={autoMatchMutation.isPending}>
            <Wand2 className="h-4 w-4 mr-2" />Auto-Match
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Mutasi</p><p className="text-xl font-bold">{stats.total}</p></CardContent></Card>
          <Card className="border-green-200"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Matched</p><p className="text-xl font-bold text-green-600">{stats.matched}</p></CardContent></Card>
          <Card className="border-yellow-200"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Belum Match</p><p className="text-xl font-bold text-yellow-600">{stats.unmatched}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Masuk</p><p className="text-lg font-bold text-green-700">{fmtCurrency(stats.totalKredit)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Keluar</p><p className="text-lg font-bold text-red-700">{fmtCurrency(stats.totalDebit)}</p></CardContent></Card>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="list">Daftar Mutasi</TabsTrigger>
          <TabsTrigger value="import"><Upload className="h-4 w-4 mr-1" />Import CSV</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={matchedFilter} onValueChange={setMatchedFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="true">Sudah Match</SelectItem>
                <SelectItem value="false">Belum Match</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Rekening..." value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className="w-40" />
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
          </div>

          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Memuat...</div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="py-3 px-4 text-left font-medium">Tanggal</th>
                        <th className="py-3 px-4 text-left font-medium">Deskripsi</th>
                        <th className="py-3 px-4 text-left font-medium">Rekening</th>
                        <th className="py-3 px-4 text-right font-medium">Jumlah</th>
                        <th className="py-3 px-4 text-right font-medium">Saldo</th>
                        <th className="py-3 px-4 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">
                          Tidak ada mutasi. Import mutasi bank terlebih dahulu.
                        </td></tr>
                      ) : rows.map((r) => (
                        <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="py-2 px-4 text-muted-foreground">{new Date(r.mutationDate).toLocaleDateString("id-ID")}</td>
                          <td className="py-2 px-4">
                            <p>{r.description ?? "-"}</p>
                            {r.refNumber && <p className="text-xs font-mono text-muted-foreground">{r.refNumber}</p>}
                          </td>
                          <td className="py-2 px-4 text-xs text-muted-foreground">{r.bankName} {r.bankAccount}</td>
                          <td className={`py-2 px-4 text-right font-medium ${r.amount > 0 ? "text-green-700" : "text-red-700"}`}>
                            {r.amount > 0 ? "+" : ""}{fmtCurrency(r.amount)}
                          </td>
                          <td className="py-2 px-4 text-right text-muted-foreground">
                            {r.balance != null ? fmtCurrency(r.balance) : "-"}
                          </td>
                          <td className="py-2 px-4">
                            {r.isMatched ? (
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />Matched
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                <XCircle className="h-3 w-3 mr-1" />Belum Match
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="import" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Import Mutasi Bank (CSV)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Bank</label>
                  <Select value={importBankName} onValueChange={setImportBankName}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["BCA", "Mandiri", "BNI", "BRI", "BSI", "CIMB", "Lainnya"].map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">No. Rekening</label>
                  <Input value={importAccount} onChange={(e) => setImportAccount(e.target.value)} placeholder="0123456789" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Upload File CSV</label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">Drag & drop atau klik untuk upload</p>
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csv-upload" />
                  <label htmlFor="csv-upload">
                    <Button variant="outline" size="sm" asChild><span>Pilih File CSV</span></Button>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Format CSV: <code className="bg-muted px-1 rounded">tanggal, deskripsi, debit, kredit, saldo, ref_number</code>
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">atau Paste CSV Data</label>
                <textarea
                  className="w-full h-32 border rounded-md p-2 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="tanggal,deskripsi,debit,kredit,saldo,ref&#10;2026-07-01,Transfer Jemaah BUDI,0,5000000,10000000,REF001"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                />
                {csvText && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {parseCsvRows(csvText).length} baris valid terdeteksi
                  </p>
                )}
              </div>

              <Button
                disabled={!csvText.trim() || !importAccount || importMutation.isPending}
                onClick={handleImport}
              >
                {importMutation.isPending ? "Mengimport..." : "Import Mutasi"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
