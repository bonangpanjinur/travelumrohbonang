import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calculator, Plus, Trash2, TrendingUp, Wallet, Percent } from "lucide-react";
import { toast } from "sonner";
import DeleteAlertDialog from "@/components/admin/DeleteAlertDialog";
import ResponsiveTable from "@/components/admin/ResponsiveTable";

const CATEGORIES = [
  { value: "ticket", label: "Tiket Pesawat" },
  { value: "hotel_makkah", label: "Hotel Makkah" },
  { value: "hotel_madinah", label: "Hotel Madinah" },
  { value: "visa", label: "Visa" },
  { value: "transport", label: "Transportasi" },
  { value: "muthawif", label: "Muthawif" },
  { value: "meals", label: "Makan" },
  { value: "handling", label: "Handling" },
  { value: "marketing", label: "Marketing" },
  { value: "equipment", label: "Perlengkapan" },
  { value: "other", label: "Lainnya" },
];

interface PkgOpt { id: string; title: string; }
interface Currency { code: string; rate_to_idr: number; symbol: string; }
interface Cost {
  id: string;
  package_id: string;
  category: string;
  item_name: string;
  qty: number;
  unit: string | null;
  unit_cost: number;
  currency_code: string;
  is_per_pax: boolean;
  notes: string | null;
}

const fmtIDR = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

export default function AdminPackageCosts() {
  const [packages, setPackages] = useState<PkgOpt[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<string>("");
  const [costs, setCosts] = useState<Cost[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Cost>>({
    category: "ticket", item_name: "", qty: 1, unit: "pax",
    unit_cost: 0, currency_code: "IDR", is_per_pax: true,
  });
  const [profit, setProfit] = useState<{
    pkg_price_avg: number; hpp_per_pax: number; hpp_fixed: number;
    sold_pax: number; revenue: number; agent_commission: number;
    pic_commission: number; marketing: number;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("packages").select("id,title").eq("is_active", true).order("title"),
      supabase.from("currencies").select("code,rate_to_idr,symbol").eq("is_active", true),
    ]).then(([pk, cu]) => {
      setPackages((pk.data || []) as PkgOpt[]);
      setCurrencies((cu.data || []) as Currency[]);
      if (pk.data?.[0]) setSelectedPkg(pk.data[0].id);
    });
  }, []);

  const toIDR = (amount: number, code: string) => {
    const c = currencies.find((x) => x.code === code);
    return amount * (c?.rate_to_idr || 1);
  };

  const loadCosts = async (pid: string) => {
    if (!pid) return;
    setLoading(true);
    const { data } = await supabase
      .from("package_costs").select("*")
      .eq("package_id", pid).order("sort_order").order("created_at");
    setCosts((data || []) as Cost[]);
    setLoading(false);
    void loadProfitability(pid);
  };

  const loadProfitability = async (pid: string) => {
    // Avg paid price (rough): from bookings paid
    const [bkRes, pcRes, pkRes] = await Promise.all([
      supabase.from("bookings").select("total_price,status").eq("package_id", pid).eq("status", "paid"),
      supabase.from("package_commissions").select("commission_amount").eq("package_id", pid),
      supabase.from("packages").select("id").eq("id", pid).single(),
    ]);
    const paidBookings = (bkRes.data || []) as any[];
    const revenue = paidBookings.reduce((s, b) => s + Number(b.total_price || 0), 0);
    const soldPax = paidBookings.length; // proxy
    // Agent commissions paid for this package's bookings
    const bookingIds = paidBookings.map((b) => b.id).filter(Boolean);
    let agentCommission = 0;
    if (bookingIds.length) {
      const { data: ac } = await supabase.from("agent_commissions")
        .select("amount").in("booking_id", bookingIds);
      agentCommission = (ac || []).reduce((s, x: any) => s + Number(x.amount || 0), 0);
    }
    const picCommission = ((pcRes.data || []) as any[])
      .reduce((s, x) => s + Number(x.commission_amount || 0), 0) * soldPax;
    // Marketing from financial_transactions
    const { data: ftx } = await supabase.from("financial_transactions")
      .select("amount,type,category").eq("booking_id", null);
    const marketing = (ftx || [])
      .filter((t: any) => t.category === "marketing" && t.type === "expense")
      .reduce((s, t: any) => s + Number(t.amount || 0), 0);
    setProfit({
      pkg_price_avg: soldPax ? revenue / soldPax : 0,
      hpp_per_pax: 0, hpp_fixed: 0,
      sold_pax: soldPax, revenue, agent_commission: agentCommission,
      pic_commission: picCommission, marketing,
    });
  };

  useEffect(() => { if (selectedPkg) loadCosts(selectedPkg); }, [selectedPkg]);

  const totals = useMemo(() => {
    let perPax = 0, fixed = 0;
    for (const c of costs) {
      const idrAmt = toIDR(Number(c.unit_cost || 0), c.currency_code) * Number(c.qty || 0);
      if (c.is_per_pax) perPax += idrAmt; else fixed += idrAmt;
    }
    return { perPax, fixed };
  }, [costs, currencies]);

  const profitNet = useMemo(() => {
    if (!profit) return 0;
    const hppTotal = totals.perPax * profit.sold_pax + totals.fixed;
    return profit.revenue - hppTotal - profit.agent_commission - profit.pic_commission - profit.marketing;
  }, [profit, totals]);

  const profitMargin = useMemo(() => {
    if (!profit || profit.revenue === 0) return 0;
    return (profitNet / profit.revenue) * 100;
  }, [profitNet, profit]);

  const save = async () => {
    if (!selectedPkg || !form.item_name || !form.category) {
      toast.error("Lengkapi data terlebih dahulu");
      return;
    }
    const payload = {
      package_id: selectedPkg,
      category: form.category,
      item_name: form.item_name,
      qty: Number(form.qty || 1),
      unit: form.unit || "pax",
      unit_cost: Number(form.unit_cost || 0),
      currency_code: form.currency_code || "IDR",
      is_per_pax: form.is_per_pax !== false,
      notes: form.notes || null,
    };
    const { error } = await supabase.from("package_costs").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Komponen biaya disimpan");
    setOpen(false);
    setForm({ category: "ticket", item_name: "", qty: 1, unit: "pax", unit_cost: 0, currency_code: "IDR", is_per_pax: true });
    loadCosts(selectedPkg);
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("package_costs").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Dihapus");
    loadCosts(selectedPkg);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="w-7 h-7 text-primary" /> HPP & Profitabilitas Paket
          </h1>
          <p className="text-muted-foreground text-sm">Catat biaya pokok per paket dan analisa laba bersih.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[240px]">
            <Label>Paket</Label>
            <Select value={selectedPkg} onValueChange={setSelectedPkg}>
              <SelectTrigger><SelectValue placeholder="Pilih paket" /></SelectTrigger>
              <SelectContent>
                {packages.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={!selectedPkg}><Plus className="w-4 h-4 mr-1" /> Tambah Biaya</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Komponen Biaya HPP</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Kategori</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nama Item</Label>
                  <Input value={form.item_name || ""} onChange={(e) => setForm({ ...form, item_name: e.target.value })} placeholder="cth. Tiket Garuda PP" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Qty</Label>
                    <Input type="number" min={0} step="0.01" value={form.qty ?? 1} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input value={form.unit || ""} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="pax / malam / paket" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Harga Satuan</Label>
                    <Input type="number" min={0} step="0.01" value={form.unit_cost ?? 0} onChange={(e) => setForm({ ...form, unit_cost: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Mata Uang</Label>
                    <Select value={form.currency_code} onValueChange={(v) => setForm({ ...form, currency_code: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Tipe Biaya</Label>
                  <Select value={form.is_per_pax ? "per_pax" : "fixed"} onValueChange={(v) => setForm({ ...form, is_per_pax: v === "per_pax" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_pax">Per Jemaah</SelectItem>
                      <SelectItem value="fixed">Tetap per Keberangkatan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Catatan</Label>
                  <Input value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <Button onClick={save} className="w-full">Simpan</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Profitability summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={<Wallet className="w-4 h-4 text-primary" />} label="HPP per Pax" value={fmtIDR(totals.perPax)} />
        <SummaryCard icon={<Wallet className="w-4 h-4 text-amber-600" />} label="HPP Tetap" value={fmtIDR(totals.fixed)} />
        <SummaryCard icon={<TrendingUp className="w-4 h-4 text-emerald-600" />} label="Revenue Terverifikasi" value={fmtIDR(profit?.revenue || 0)} />
        <SummaryCard icon={<Percent className="w-4 h-4 text-blue-600" />} label="Margin Bersih" value={`${profitMargin.toFixed(1)}%`} highlight />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Rincian Laba</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <Row k="Pax Terjual" v={String(profit?.sold_pax || 0)} />
          <Row k="Total Revenue" v={fmtIDR(profit?.revenue || 0)} />
          <Row k="Total HPP (HPP/pax × pax + tetap)" v={`− ${fmtIDR((profit?.sold_pax || 0) * totals.perPax + totals.fixed)}`} />
          <Row k="Komisi Agen Affiliate" v={`− ${fmtIDR(profit?.agent_commission || 0)}`} />
          <Row k="Komisi PIC" v={`− ${fmtIDR(profit?.pic_commission || 0)}`} />
          <Row k="Marketing & Overhead" v={`− ${fmtIDR(profit?.marketing || 0)}`} />
          <div className="flex justify-between pt-2 mt-2 border-t font-bold">
            <span>Laba Bersih</span>
            <span className={profitNet >= 0 ? "text-emerald-600" : "text-destructive"}>{fmtIDR(profitNet)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Komponen HPP</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-muted-foreground text-sm">Memuat…</div> :
           costs.length === 0 ? <div className="text-muted-foreground text-sm">Belum ada komponen biaya untuk paket ini.</div> :
           <ResponsiveTable headers={["Kategori", "Item", "Qty × Harga", "IDR", "Tipe", "Aksi"]}>
             {costs.map((c) => {
               const cat = CATEGORIES.find((x) => x.value === c.category)?.label || c.category;
               const idr = toIDR(Number(c.unit_cost), c.currency_code) * Number(c.qty);
               return (
                 <tr key={c.id} className="border-b">
                   <td className="p-2"><Badge variant="outline">{cat}</Badge></td>
                   <td className="p-2">{c.item_name}{c.notes && <div className="text-xs text-muted-foreground">{c.notes}</div>}</td>
                   <td className="p-2 text-sm">{c.qty} {c.unit} × {c.currency_code} {Number(c.unit_cost).toLocaleString("id-ID")}</td>
                   <td className="p-2 font-medium">{fmtIDR(idr)}</td>
                   <td className="p-2 text-xs">{c.is_per_pax ? "Per pax" : "Tetap"}</td>
                   <td className="p-2">
                     <DeleteAlertDialog
                       title="Hapus komponen biaya?"
                       description={`Item "${c.item_name}" akan dihapus.`}
                       onConfirm={() => del(c.id)}
                       trigger={<Button size="sm" variant="ghost"><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                     />
                   </td>
                 </tr>
               );
             })}
           </ResponsiveTable>}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className="text-lg font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>;
}
