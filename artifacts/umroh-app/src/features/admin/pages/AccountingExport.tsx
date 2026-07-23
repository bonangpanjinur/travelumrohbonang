/**
 * F-15: Export ke Software Akuntansi
 * Export jurnal ke format CSV Jurnal.id / Accurate / Zahir / e-SPT PPh
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Download, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { supabaseAuth } from "@/shared/integrations/supabase/auth-client";

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const fmtNumber = (n: number) =>
  new Intl.NumberFormat("id-ID").format(n);

function getDefaultDateRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const to = now.toISOString().split("T")[0];
  return { from, to };
}

const EXPORT_FORMATS = [
  {
    id: "jurnal-id",
    name: "Jurnal.id",
    description: "Format CSV untuk import ke aplikasi Jurnal.id (cloud accounting Indonesia)",
    columns: "Tanggal, No. Jurnal, Kode Akun, Nama Akun, Debet, Kredit, Keterangan",
    color: "bg-blue-50 border-blue-200",
    badgeColor: "bg-blue-100 text-blue-800",
    icon: "J",
  },
  {
    id: "accurate",
    name: "Accurate Online",
    description: "Format CSV untuk import ke Accurate Online / Accurate Desktop",
    columns: "TGL, No. Jurnal, Kode Akun, Nama Akun, Debet, Kredit, Keterangan, Referensi",
    color: "bg-green-50 border-green-200",
    badgeColor: "bg-green-100 text-green-800",
    icon: "A",
  },
  {
    id: "zahir",
    name: "Zahir Accounting",
    description: "Format CSV untuk import ke Zahir Accounting (Zahir Small Business / Enterprise)",
    columns: "Tanggal, No Jurnal, Kode Akun, Nama Akun, Keterangan, Debit, Kredit, Mata Uang, Kurs",
    color: "bg-purple-50 border-purple-200",
    badgeColor: "bg-purple-100 text-purple-800",
    icon: "Z",
  },
  {
    id: "general-journal",
    name: "Jurnal Umum (CSV)",
    description: "Format CSV netral — cocok untuk template custom atau review internal",
    columns: "Tanggal, No. Jurnal, Kode Akun, Nama Akun, Tipe Akun, Tipe Entri, Debet, Kredit, Kategori, Keterangan",
    color: "bg-gray-50 border-gray-200",
    badgeColor: "bg-gray-100 text-gray-800",
    icon: "G",
  },
];

export default function AccountingExport() {
  const { toast } = useToast();
  const defaults = getDefaultDateRange();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [pphRate, setPphRate] = useState("2");
  const [downloading, setDownloading] = useState<string | null>(null);

  // Summary dari backend
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["accounting-export-summary", from, to],
    queryFn: () =>
      apiFetch(`/api/admin/accounting-export/summary?from=${from}&to=${to}`),
    enabled: !!(from && to),
  });

  const s = summary as any;

  async function handleDownload(formatId: string) {
    setDownloading(formatId);
    try {
      let url = `/api/admin/accounting-export/${formatId}?from=${from}&to=${to}`;
      if (formatId === "espt-pph") url += `&rate=${pphRate}`;

      // Use Supabase session — same as apiFetch — to get a valid Bearer token
      let authHeader = "";
      try {
        const { data: { session } } = await supabaseAuth.auth.getSession();
        if (session?.access_token) authHeader = `Bearer ${session.access_token}`;
      } catch { /* proceed without auth; middleware will reject if required */ }

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

      const disposition = response.headers.get("content-disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `export-${formatId}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      toast({ title: "Download berhasil", description: `File ${a.download} siap digunakan.` });
    } catch (err: any) {
      toast({ title: "Download gagal", description: err?.message ?? "Terjadi kesalahan", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  }

  async function handleDownloadEspt() {
    await handleDownload("espt-pph");
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Export ke Software Akuntansi</h1>
        <p className="text-muted-foreground mt-1">
          Export jurnal akuntansi ke format CSV yang kompatibel dengan Jurnal.id, Accurate, Zahir, dan e-SPT.
        </p>
      </div>

      {/* Filter Periode */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Periode Export</CardTitle>
          <CardDescription>Pilih rentang tanggal transaksi yang akan diekspor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label>Dari Tanggal</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
            </div>
            <div className="space-y-1">
              <Label>Sampai Tanggal</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
            </div>
          </div>

          {/* Summary Info */}
          {!summaryLoading && s && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50 flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Total Entri Jurnal</span>
                <p className="font-semibold text-lg">{fmtNumber(s.totalEntries ?? 0)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Debet</span>
                <p className="font-semibold text-lg text-green-700">{fmtCurrency(s.totalDebit ?? 0)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Kredit</span>
                <p className="font-semibold text-lg text-blue-700">{fmtCurrency(s.totalCredit ?? 0)}</p>
              </div>
              <div className="flex items-center gap-1">
                {s.totalDebit === s.totalCredit ? (
                  <><CheckCircle2 className="h-4 w-4 text-green-600" /><span className="text-green-700 font-medium">Jurnal Seimbang</span></>
                ) : (
                  <><AlertCircle className="h-4 w-4 text-amber-500" /><span className="text-amber-700 font-medium">Debet ≠ Kredit</span></>
                )}
              </div>
            </div>
          )}
          {summaryLoading && (
            <div className="mt-4 h-16 rounded-lg bg-muted/50 animate-pulse" />
          )}
        </CardContent>
      </Card>

      {/* Format Export Cards */}
      <div>
        <h2 className="text-base font-semibold mb-3">Pilih Format Export</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {EXPORT_FORMATS.map((fmt) => (
            <Card key={fmt.id} className={`border ${fmt.color}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white ${
                    fmt.id === "jurnal-id" ? "bg-blue-600" :
                    fmt.id === "accurate" ? "bg-green-600" :
                    fmt.id === "zahir" ? "bg-purple-600" : "bg-gray-500"
                  }`}>
                    {fmt.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base">{fmt.name}</CardTitle>
                    <Badge variant="secondary" className={`text-xs mt-0.5 ${fmt.badgeColor}`}>CSV</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{fmt.description}</p>
                <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 font-mono">
                  {fmt.columns}
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={downloading === fmt.id || !from || !to}
                  onClick={() => handleDownload(fmt.id)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloading === fmt.id ? "Mengunduh..." : `Download ${fmt.name} CSV`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* e-SPT PPh — special section */}
      <Card className="border border-orange-200 bg-orange-50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-white text-sm">
              SPT
            </div>
            <div>
              <CardTitle className="text-base">e-SPT PPh Pasal 23</CardTitle>
              <Badge variant="secondary" className="text-xs mt-0.5 bg-orange-100 text-orange-800">CSV / DJP</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Export data dasar pemotongan PPh Pasal 23 berdasarkan transaksi biaya. Gunakan sebagai bahan pengisian e-SPT di DJP Online.
          </p>
          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 font-mono">
            Tanggal, No. Bukti, Kode Akun, Nama Penerima, Kode Objek Pajak, DPP, Tarif, PPh Terutang, Keterangan
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label className="text-sm">Tarif PPh (%)</Label>
              <Input
                type="number"
                value={pphRate}
                onChange={(e) => setPphRate(e.target.value)}
                className="w-24"
                min="1"
                max="30"
                step="0.5"
              />
            </div>
            <Button
              variant="outline"
              className="border-orange-300 flex-1"
              disabled={downloading === "espt-pph" || !from || !to}
              onClick={handleDownloadEspt}
            >
              <Download className="h-4 w-4 mr-2" />
              {downloading === "espt-pph" ? "Mengunduh..." : "Download e-SPT PPh CSV"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Catatan Penting */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <FileText className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 space-y-1">
              <p className="font-semibold">Catatan Penting:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>File CSV menggunakan encoding UTF-8 + BOM untuk kompatibilitas Excel.</li>
                <li>Data diambil dari jurnal double-entry (<code className="bg-amber-100 px-1 rounded">financial_transactions</code>). Pastikan posting jurnal sudah lengkap sebelum export.</li>
                <li>Untuk e-SPT PPh, verifikasi DPP dan tarif sesuai ketentuan perpajakan yang berlaku sebelum digunakan untuk pelaporan resmi.</li>
                <li>Setelah import ke software akuntansi, lakukan review untuk memastikan saldo akun seimbang.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
