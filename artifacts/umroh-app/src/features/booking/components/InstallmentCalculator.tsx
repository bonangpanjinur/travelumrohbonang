import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/shared/hooks/useCurrency";

export default function InstallmentCalculator({ defaultPrice = 30000000 }: { defaultPrice?: number }) {
  const [price, setPrice] = useState(defaultPrice);
  const [dpPct, setDpPct] = useState(30);
  const [tenor, setTenor] = useState(6);
  const { format } = useCurrency();

  const result = useMemo(() => {
    const dp = Math.round(price * (dpPct / 100));
    const remaining = price - dp;
    const monthly = tenor > 0 ? Math.ceil(remaining / tenor) : remaining;
    return { dp, remaining, monthly };
  }, [price, dpPct, tenor]);

  const fmt = (n: number) => format(n);

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
        <Calculator className="w-5 h-5 text-gold" /> Simulasi DP & Cicilan
      </h3>
      <div className="grid md:grid-cols-3 gap-4 mb-4">
        <div>
          <Label className="text-xs">Harga Paket</Label>
          <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} min={0} step={500000} />
        </div>
        <div>
          <Label className="text-xs">DP (%)</Label>
          <Input type="number" value={dpPct} onChange={(e) => setDpPct(Math.max(0, Math.min(100, Number(e.target.value))))} min={0} max={100} />
        </div>
        <div>
          <Label className="text-xs">Tenor (bulan)</Label>
          <Input type="number" value={tenor} onChange={(e) => setTenor(Math.max(1, Number(e.target.value)))} min={1} max={36} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="DP Awal" value={fmt(result.dp)} />
        <Stat label="Sisa Cicilan" value={fmt(result.remaining)} />
        <Stat label={`Per Bulan × ${tenor}`} value={fmt(result.monthly)} highlight />
      </div>
      <p className="text-xs text-muted-foreground mt-3">* Simulasi tanpa bunga. Skema final mengikuti kebijakan travel.</p>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? "bg-gold/15 border border-gold" : "bg-muted/40"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-bold text-sm md:text-base">{value}</div>
    </div>
  );
}
