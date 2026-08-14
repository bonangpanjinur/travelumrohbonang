import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Info, Plus, Trash2 } from "lucide-react";

interface PackageOption { id: string; title: string; }
type RuleCode = "down_payment" | "final_payment_due" | "cancellation_fee" | "installment_schedule" | "payment_proof_deadline" | "refund_policy" | "package_change_fee" | "payment_methods";
interface Rule { ruleCode: string; ruleType: string; value: unknown; displayText?: string | null; }
interface Policy { id: string; name: string; scope: string; packageId?: string | null; status: string; version: number; rules: Rule[]; }
interface InstallmentRow { percentage: number; daysBeforeDeparture: number; label: string; }

const RULE_LABELS: Record<RuleCode, { label: string; description: string }> = {
  down_payment: { label: "Uang muka (DP)", description: "Persentase yang harus dibayar saat booking." },
  final_payment_due: { label: "Batas pelunasan", description: "Pelunasan harus selesai berapa hari sebelum berangkat." },
  cancellation_fee: { label: "Biaya pembatalan", description: "Potongan biaya jika jamaah membatalkan booking." },
  installment_schedule: { label: "Jadwal cicilan", description: "Bagi pembayaran menjadi beberapa tahap." },
  payment_proof_deadline: { label: "Batas kirim bukti bayar", description: "Batas waktu pengiriman bukti pembayaran." },
  refund_policy: { label: "Ketentuan refund", description: "Tulis ketentuan pengembalian dana dengan bahasa biasa." },
  package_change_fee: { label: "Biaya perubahan paket", description: "Biaya ketika jamaah mengganti paket." },
  payment_methods: { label: "Metode pembayaran", description: "Informasi rekening atau metode pembayaran yang diterima." },
};

const defaultCodes: RuleCode[] = ["down_payment", "final_payment_due", "cancellation_fee"];

export default function PaymentPolicies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scope, setScope] = useState<"global" | "package">("global");
  const [packageId, setPackageId] = useState("");
  const [name, setName] = useState("Aturan Pembayaran Global");
  const [activeCodes, setActiveCodes] = useState<RuleCode[]>(defaultCodes);
  const [downPayment, setDownPayment] = useState(30);
  const [finalDueDays, setFinalDueDays] = useState(30);
  const [cancellationFee, setCancellationFee] = useState(0);
  const [proofDeadline, setProofDeadline] = useState(1);
  const [changeFee, setChangeFee] = useState(0);
  const [refundPolicy, setRefundPolicy] = useState("");
  const [paymentMethods, setPaymentMethods] = useState("");
  const [installments, setInstallments] = useState<InstallmentRow[]>([
    { label: "Cicilan 1", percentage: 30, daysBeforeDeparture: 90 },
    { label: "Cicilan 2", percentage: 40, daysBeforeDeparture: 60 },
  ]);

  const globalPolicies = useMemo(() => policies.filter((p) => p.scope === "global"), [policies]);
  const packagePolicies = useMemo(() => policies.filter((p) => p.scope === "package"), [policies]);

  async function load() {
    setLoading(true);
    try {
      const [policyResponse, packageResponse] = await Promise.all([
        apiFetch("/api/admin/payment-policies"),
        apiFetch("/api/admin/packages"),
      ]);
      setPolicies(policyResponse?.data ?? policyResponse ?? []);
      setPackages(packageResponse?.data ?? packageResponse ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Aturan pembayaran belum dapat dimuat");
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function toggleRule(code: RuleCode) {
    setActiveCodes((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
  }
  function updateInstallment(index: number, patch: Partial<InstallmentRow>) {
    setInstallments((rows) => rows.map((row, i) => i === index ? { ...row, ...patch } : row));
  }
  function buildRules(): Rule[] {
    const rules: Rule[] = [];
    if (activeCodes.includes("down_payment")) rules.push({ ruleCode: "down_payment", ruleType: "percentage", value: downPayment, displayText: `Uang muka minimal ${downPayment}% dari harga paket.` });
    if (activeCodes.includes("final_payment_due")) rules.push({ ruleCode: "final_payment_due", ruleType: "days_before_departure", value: finalDueDays, displayText: `Pelunasan maksimal ${finalDueDays} hari sebelum keberangkatan.` });
    if (activeCodes.includes("cancellation_fee")) rules.push({ ruleCode: "cancellation_fee", ruleType: "percentage", value: cancellationFee, displayText: `Biaya pembatalan ${cancellationFee}% dari nilai booking.` });
    if (activeCodes.includes("installment_schedule")) rules.push({ ruleCode: "installment_schedule", ruleType: "installment", value: installments, displayText: `${installments.length} tahap cicilan sebelum keberangkatan.` });
    if (activeCodes.includes("payment_proof_deadline")) rules.push({ ruleCode: "payment_proof_deadline", ruleType: "days_before_departure", value: proofDeadline, displayText: `Bukti pembayaran dikirim maksimal ${proofDeadline} hari setelah pembayaran.` });
    if (activeCodes.includes("refund_policy")) rules.push({ ruleCode: "refund_policy", ruleType: "text", value: refundPolicy, displayText: refundPolicy || "Ketentuan refund belum diisi." });
    if (activeCodes.includes("package_change_fee")) rules.push({ ruleCode: "package_change_fee", ruleType: "percentage", value: changeFee, displayText: `Biaya perubahan paket ${changeFee}%.` });
    if (activeCodes.includes("payment_methods")) rules.push({ ruleCode: "payment_methods", ruleType: "text", value: paymentMethods, displayText: paymentMethods || "Metode pembayaran belum diisi." });
    return rules;
  }
  async function createDraft() {
    if (!name.trim()) return toast.error("Nama aturan wajib diisi");
    if (scope === "package" && !packageId) return toast.error("Pilih paket terlebih dahulu");
    if (!activeCodes.length) return toast.error("Pilih minimal satu aturan");
    if (downPayment < 0 || downPayment > 100 || cancellationFee < 0 || cancellationFee > 100 || changeFee < 0 || changeFee > 100) return toast.error("Persentase harus antara 0 sampai 100");
    if (activeCodes.includes("installment_schedule") && installments.reduce((sum, row) => sum + Number(row.percentage), 0) > 100) return toast.error("Total persentase cicilan tidak boleh lebih dari 100%");
    setSaving(true);
    try {
      await apiFetch("/api/admin/payment-policies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), scope, packageId: scope === "package" ? packageId : null, rules: buildRules() }) });
      toast.success("Draft aturan pembayaran berhasil dibuat");
      await load();
    } catch (error) { console.error(error); toast.error("Draft aturan gagal dibuat"); }
    finally { setSaving(false); }
  }
  async function activatePolicy(id: string) {
    try { await apiFetch(`/api/admin/payment-policies/${id}/activate`, { method: "POST" }); toast.success("Aturan pembayaran diaktifkan"); await load(); }
    catch (error) { console.error(error); toast.error("Aturan belum dapat diaktifkan"); }
  }
  function packageName(id?: string | null) { return packages.find((item) => item.id === id)?.title ?? "Semua paket"; }
  const inputClass = "mt-1";
  const moneyHint = "Gunakan persentase agar otomatis menyesuaikan harga paket.";

  return <div className="space-y-6 p-6">
    <div>
      <h1 className="text-2xl font-semibold">Aturan Pembayaran</h1>
      <p className="mt-1 text-muted-foreground">Atur DP, cicilan, pelunasan, dan pembatalan tanpa perlu mengetik kode JSON.</p>
    </div>

    <Card className="border-blue-200 bg-blue-50/60 dark:bg-blue-950/20">
      <CardContent className="flex gap-3 p-4 text-sm"><Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" /><div><p className="font-medium text-blue-900 dark:text-blue-100">Cara kerja aturan</p><p className="mt-1 text-blue-800/80 dark:text-blue-200/80">Buat aturan Global untuk semua paket. Jika satu paket memiliki ketentuan berbeda, pilih “Khusus paket”. Aturan khusus hanya menggantikan bagian yang Anda isi.</p></div></CardContent>
    </Card>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
      <Card>
        <CardHeader><CardTitle>1. Tentukan cakupan aturan</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div><Label>Nama aturan</Label><Input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Aturan Umroh Ramadhan" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => setScope("global")} className={`rounded-lg border p-4 text-left transition ${scope === "global" ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:bg-muted/50"}`}><p className="font-medium">Semua paket</p><p className="mt-1 text-xs text-muted-foreground">Menjadi aturan default untuk seluruh paket.</p></button>
            <button type="button" onClick={() => setScope("package")} className={`rounded-lg border p-4 text-left transition ${scope === "package" ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:bg-muted/50"}`}><p className="font-medium">Khusus satu paket</p><p className="mt-1 text-xs text-muted-foreground">Menggantikan aturan global untuk paket tertentu.</p></button>
          </div>
          {scope === "package" && <div><Label>Pilih paket</Label><select className="mt-1 w-full rounded-md border bg-background p-2.5 text-sm" value={packageId} onChange={(e) => setPackageId(e.target.value)}><option value="">Pilih paket terlebih dahulu</option>{packages.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>}

          <div className="border-t pt-5"><div className="mb-3"><p className="font-medium">2. Pilih aturan yang ingin dipakai</p><p className="text-sm text-muted-foreground">Centang aturan, lalu isi field yang muncul di bawah.</p></div>
            <div className="grid gap-2 sm:grid-cols-2">{(Object.keys(RULE_LABELS) as RuleCode[]).map((code) => <label key={code} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${activeCodes.includes(code) ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}><input type="checkbox" className="mt-1 h-4 w-4" checked={activeCodes.includes(code)} onChange={() => toggleRule(code)} /><span><span className="block text-sm font-medium">{RULE_LABELS[code].label}</span><span className="block text-xs text-muted-foreground">{RULE_LABELS[code].description}</span></span></label>)}</div>
          </div>

          <div className="space-y-4 border-t pt-5">
            {activeCodes.includes("down_payment") && <div className="rounded-lg border p-4"><Label>Uang muka (DP)</Label><div className="flex items-center gap-2"><Input type="number" min="0" max="100" className={inputClass} value={downPayment} onChange={(e) => setDownPayment(Number(e.target.value))} /><span className="text-sm font-medium">%</span></div><p className="mt-1 text-xs text-muted-foreground">{moneyHint}</p></div>}
            {activeCodes.includes("final_payment_due") && <div className="rounded-lg border p-4"><Label>Pelunasan paling lambat</Label><div className="flex items-center gap-2"><Input type="number" min="0" className={inputClass} value={finalDueDays} onChange={(e) => setFinalDueDays(Number(e.target.value))} /><span className="whitespace-nowrap text-sm">hari sebelum berangkat</span></div></div>}
            {activeCodes.includes("cancellation_fee") && <div className="rounded-lg border p-4"><Label>Biaya pembatalan</Label><div className="flex items-center gap-2"><Input type="number" min="0" max="100" className={inputClass} value={cancellationFee} onChange={(e) => setCancellationFee(Number(e.target.value))} /><span className="text-sm font-medium">%</span></div><p className="mt-1 text-xs text-muted-foreground">Isi 0 jika tidak ada biaya pembatalan.</p></div>}
            {activeCodes.includes("installment_schedule") && <div className="rounded-lg border p-4"><div className="flex items-start justify-between gap-3"><div><Label>Jadwal cicilan</Label><p className="mt-1 text-xs text-muted-foreground">Total cicilan akan dihitung dari harga paket.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setInstallments((rows) => [...rows, { label: `Cicilan ${rows.length + 1}`, percentage: 0, daysBeforeDeparture: 30 }])}><Plus className="mr-1 h-4 w-4" />Tambah tahap</Button></div><div className="mt-3 space-y-2">{installments.map((row, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_100px_130px_auto]"><Input value={row.label} onChange={(e) => updateInstallment(index, { label: e.target.value })} placeholder="Nama tahap" /><div className="flex items-center gap-1"><Input type="number" min="0" max="100" value={row.percentage} onChange={(e) => updateInstallment(index, { percentage: Number(e.target.value) })} /><span className="text-xs">%</span></div><div className="flex items-center gap-1"><Input type="number" min="0" value={row.daysBeforeDeparture} onChange={(e) => updateInstallment(index, { daysBeforeDeparture: Number(e.target.value) })} /><span className="whitespace-nowrap text-xs">hari sebelum</span></div><Button type="button" variant="ghost" size="icon" aria-label="Hapus tahap" onClick={() => setInstallments((rows) => rows.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)}</div><p className="mt-2 text-right text-xs text-muted-foreground">Total cicilan: {installments.reduce((sum, row) => sum + Number(row.percentage || 0), 0)}%</p></div>}
            {activeCodes.includes("payment_proof_deadline") && <div className="rounded-lg border p-4"><Label>Batas kirim bukti bayar</Label><div className="flex items-center gap-2"><Input type="number" min="0" className={inputClass} value={proofDeadline} onChange={(e) => setProofDeadline(Number(e.target.value))} /><span className="text-sm">hari setelah pembayaran</span></div></div>}
            {activeCodes.includes("refund_policy") && <div className="rounded-lg border p-4"><Label>Ketentuan refund</Label><textarea className="mt-1 min-h-24 w-full rounded-md border bg-background p-3 text-sm" value={refundPolicy} onChange={(e) => setRefundPolicy(e.target.value)} placeholder="Contoh: Refund diproses maksimal 14 hari kerja setelah disetujui." /></div>}
            {activeCodes.includes("package_change_fee") && <div className="rounded-lg border p-4"><Label>Biaya perubahan paket</Label><div className="flex items-center gap-2"><Input type="number" min="0" max="100" className={inputClass} value={changeFee} onChange={(e) => setChangeFee(Number(e.target.value))} /><span className="text-sm">%</span></div></div>}
            {activeCodes.includes("payment_methods") && <div className="rounded-lg border p-4"><Label>Metode pembayaran</Label><textarea className="mt-1 min-h-20 w-full rounded-md border bg-background p-3 text-sm" value={paymentMethods} onChange={(e) => setPaymentMethods(e.target.value)} placeholder="Contoh: Transfer BCA, Mandiri, dan pembayaran tunai di kantor." /></div>}
          </div>
          <Button className="w-full sm:w-auto" onClick={createDraft} disabled={saving}>{saving ? "Menyimpan..." : "Simpan aturan sebagai draft"}</Button>
        </CardContent>
      </Card>

      <Card className="h-fit"><CardHeader><CardTitle>Aturan tersimpan</CardTitle></CardHeader><CardContent>{loading ? <p className="text-sm text-muted-foreground">Memuat aturan...</p> : policies.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center"><p className="font-medium">Belum ada aturan</p><p className="mt-1 text-sm text-muted-foreground">Mulai dari aturan Global agar semua paket memiliki standar pembayaran.</p></div> : <div className="space-y-3">{[...globalPolicies, ...packagePolicies].map((policy) => <div key={policy.id} className="rounded-lg border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{policy.name}</p><p className="mt-1 text-xs text-muted-foreground">{policy.scope === "global" ? "Semua paket" : packageName(policy.packageId)} · Versi {policy.version}</p></div><Badge variant={policy.status === "active" ? "default" : "secondary"}>{policy.status === "active" ? "Aktif" : "Draft"}</Badge></div><div className="mt-3 space-y-2">{policy.rules.map((rule) => <div key={rule.ruleCode} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{rule.displayText || RULE_LABELS[rule.ruleCode as RuleCode]?.label || rule.ruleCode}</span></div>)}</div>{policy.status !== "active" && <Button className="mt-4 w-full" variant="outline" onClick={() => activatePolicy(policy.id)}>Aktifkan aturan ini</Button>}</div>)}</div>}</CardContent></Card>
    </div>
  </div>;
}
