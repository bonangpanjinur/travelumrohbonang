import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "sonner";

interface PackageOption { id: string; title: string; }
interface Rule { ruleCode: string; ruleType: string; value: unknown; displayText?: string | null; }
interface Policy { id: string; name: string; scope: string; packageId?: string | null; status: string; version: number; rules: Rule[]; }

const DEFAULT_RULES: Rule[] = [
  { ruleCode: "down_payment", ruleType: "percentage", value: 30, displayText: "Uang muka minimal 30% dari harga paket." },
  { ruleCode: "final_payment_due", ruleType: "days_before_departure", value: 30, displayText: "Pelunasan maksimal 30 hari sebelum keberangkatan." },
  { ruleCode: "cancellation_fee", ruleType: "tiered", value: [], displayText: "Biaya pembatalan mengikuti ketentuan paket dan biaya aktual." },
];

export default function PaymentPolicies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scope, setScope] = useState<"global" | "package">("global");
  const [packageId, setPackageId] = useState("");
  const [name, setName] = useState("Aturan Pembayaran Global");
  const [rulesJson, setRulesJson] = useState(JSON.stringify(DEFAULT_RULES, null, 2));

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
      toast.error("Policy pembayaran belum dapat dimuat");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function createDraft() {
    let rules: Rule[];
    try {
      rules = JSON.parse(rulesJson);
      if (!Array.isArray(rules)) throw new Error("Rules harus berupa array");
    } catch {
      toast.error("Format rules JSON tidak valid");
      return;
    }
    if (scope === "package" && !packageId) {
      toast.error("Pilih paket terlebih dahulu");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/admin/payment-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scope, packageId: scope === "package" ? packageId : null, rules }),
      });
      toast.success("Draft aturan pembayaran dibuat");
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Draft policy gagal dibuat");
    } finally {
      setSaving(false);
    }
  }

  function packageName(id?: string | null) {
    return packages.find((item) => item.id === id)?.title ?? "Semua paket";
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Aturan Pembayaran</h1>
        <p className="text-muted-foreground">Aturan global menjadi default dan dapat dioverride per paket.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader><CardTitle>Buat Draft Policy</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Nama policy</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div>
              <Label>Cakupan</Label>
              <select className="mt-1 w-full rounded-md border bg-background p-2 text-sm" value={scope} onChange={(e) => setScope(e.target.value as "global" | "package")}>
                <option value="global">Global</option>
                <option value="package">Khusus paket</option>
              </select>
            </div>
            {scope === "package" && <div><Label>Paket</Label><select className="mt-1 w-full rounded-md border bg-background p-2 text-sm" value={packageId} onChange={(e) => setPackageId(e.target.value)}><option value="">Pilih paket</option>{packages.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>}
            <div><Label>Rules JSON</Label><textarea className="mt-1 min-h-48 w-full rounded-md border bg-background p-3 font-mono text-xs" value={rulesJson} onChange={(e) => setRulesJson(e.target.value)} /></div>
            <Button onClick={createDraft} disabled={saving}>{saving ? "Menyimpan..." : "Simpan sebagai Draft"}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Policy Tersimpan</CardTitle></CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted-foreground">Memuat policy...</p> : policies.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada policy. Buat policy global pertama untuk memulai.</p> : <div className="space-y-3">{[...globalPolicies, ...packagePolicies].map((policy) => <div key={policy.id} className="rounded-lg border p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-medium">{policy.name}</p><p className="text-xs text-muted-foreground">{policy.scope === "global" ? "Global" : packageName(policy.packageId)} · Versi {policy.version}</p></div><Badge variant={policy.status === "active" ? "default" : "secondary"}>{policy.status}</Badge></div><div className="mt-3 space-y-1">{policy.rules.slice().sort((a, b) => a.ruleCode.localeCompare(b.ruleCode)).map((rule) => <p key={rule.ruleCode} className="text-sm"><span className="font-medium">{rule.ruleCode}</span>{rule.displayText ? ` — ${rule.displayText}` : ""}</p>)}</div></div>)}</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
