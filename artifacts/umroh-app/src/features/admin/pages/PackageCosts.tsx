import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calculator, Plus, Trash2, TrendingUp, Wallet, Percent, Filter, Pencil } from "lucide-react";
import { toast } from "sonner";
import DeleteAlertDialog from "@/features/admin/components/DeleteAlertDialog";
import ResponsiveTable from "@/features/admin/components/ResponsiveTable";
import PackageCostsBulkDialog from "@/features/admin/components/PackageCostsBulkDialog";

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

const PACKAGE_TYPES = [
  { value: "umroh", label: "Umroh" },
  { value: "umroh_plus", label: "Umroh Plus" },
  { value: "haji", label: "Haji" },
  { value: "haji_plus", label: "Haji Plus" },
];

interface PkgOpt { id: string; title: string; category_id: string | null; package_type: string | null; }
interface PkgCategory { id: string; name: string; }
interface Departure { id: string; package_id: string; departure_date: string; quota: number; remaining_quota: number; }
interface Currency { code: string; rate_to_idr: number; symbol: string; }
interface Cost {
  id: string;
  package_id: string;
  departure_id: string | null;
  category: string;
  item_name: string;
  qty: number;
  unit: string | null;
  unit_cost: number;
  currency_code: string;
  is_per_pax: boolean;
  is_active: boolean;
  notes: string | null;
}

const fmtIDR = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

const emptyForm: Partial<Cost> = {
  category: "ticket", item_name: "", qty: 1, unit: "pax",
  unit_cost: 0, currency_code: "IDR", is_per_pax: true,
  is_active: true, departure_id: null, notes: "",
};

export default function AdminPackageCosts() {
  const [packages, setPackages] = useState<PkgOpt[]>([]);
  const [pkgCategories, setPkgCategories] = useState<PkgCategory[]>([]);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [allCosts, setAllCosts] = useState<Cost[]>([]);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>("__all__");
  const [filterType, setFilterType] = useState<string>("__all__");
  const [filterDeparture, setFilterDeparture] = useState<string>("__all__");
  const [showInactive, setShowInactive] = useState(false);

  const [selectedPkg, setSelectedPkg] = useState<string>("");
  const [costs, setCosts] = useState<Cost[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Cost>>(emptyForm);
  const [profit, setProfit] = useState<{
    pkg_price_avg: number; sold_pax: number; revenue: number;
    agent_commission: number; pic_commission: number; marketing: number;
  } | null>(null);

  const [overview, setOverview] = useState<Array<{
    package_id: string; title: string; type: string | null;
    hpp_per_pax: number; hpp_fixed: number; sold_pax: number;
    revenue: number; net_profit: number; margin: number;
  }>>([]);

  const refreshAllCosts = async () => {
    const { data } = await supabase.from("package_costs").select("*");
    setAllCosts((data || []) as Cost[]);
  };

  useEffect(() => {
    Promise.all([
      supabase.from("packages").select("id,title,category_id,package_type").eq("is_active", true).order("title"),
      supabase.from("package_categories").select("id,name").eq("is_active", true).order("name"),
      supabase.from("package_departures").select("id,package_id,departure_date,quota,remaining_quota").eq("status", "active").order("departure_date"),
      supabase.from("currencies").select("code,rate_to_idr,symbol").eq("is_active", true),
      supabase.from("package_costs").select("*"),
    ]).then(([pk, pc, dp, cu, cs]) => {
      setPackages((pk.data || []) as PkgOpt[]);
      setPkgCategories((pc.data || []) as PkgCategory[]);
      setDepartures((dp.data || []) as Departure[]);
      setCurrencies((cu.data || []) as Currency[]);
      setAllCosts((cs.data || []) as Cost[]);
    });
  }, []);

  const toIDR = (amount: number, code: string) => {
    const c = currencies.find((x) => x.code === code);
    return amount * (c?.rate_to_idr || 1);
  };

  const filteredPackages = useMemo(() => {
    return packages.filter((p) => {
      if (filterCategory !== "__all__" && p.category_id !== filterCategory) return false;
      if (filterType !== "__all__" && p.package_type !== filterType) return false;
      if (filterDeparture !== "__all__") {
        const dep = departures.find((d) => d.id === filterDeparture);
        if (!dep || dep.package_id !== p.id) return false;
      }
      return true;
    });
  }, [packages, departures, filterCategory, filterType, filterDeparture]);

  useEffect(() => {
    if (selectedPkg && !filteredPackages.find((p) => p.id === selectedPkg)) setSelectedPkg("");
  }, [filteredPackages, selectedPkg]);

  const departuresForSelected = useMemo(
    () => departures.filter((d) => !selectedPkg || d.package_id === selectedPkg),
    [departures, selectedPkg],
  );

  const loadCosts = async (pid: string) => {
    if (!pid) return;
    setLoading(true);
    let q = supabase.from("package_costs").select("*").eq("package_id", pid);
    if (filterDeparture !== "__all__") {
      q = q.or(`departure_id.eq.${filterDeparture},departure_id.is.null`);
    }
    const { data } = await q.order("sort_order").order("created_at");
    setCosts((data || []) as Cost[]);
    setLoading(false);
    void loadProfitability(pid);
  };

  const loadProfitability = async (pid: string) => {
    let q = supabase.from("bookings").select("id,total_price,status,departure_id").eq("package_id", pid).eq("status", "paid");
    if (filterDeparture !== "__all__") q = q.eq("departure_id", filterDeparture);
    const [bkRes, pcRes] = await Promise.all([
      q,
      supabase.from("package_commissions").select("commission_amount").eq("package_id", pid),
    ]);
    const paidBookings = (bkRes.data || []) as any[];
    const revenue = paidBookings.reduce((s, b) => s + Number(b.total_price || 0), 0);
    const soldPax = paidBookings.length;
    const bookingIds = paidBookings.map((b) => b.id).filter(Boolean);
    let agentCommission = 0;
    if (bookingIds.length) {
      const { data: ac } = await supabase.from("agent_commissions").select("amount").in("booking_id", bookingIds);
      agentCommission = (ac || []).reduce((s, x: any) => s + Number(x.amount || 0), 0);
    }
    const picCommission = ((pcRes.data || []) as any[])
      .reduce((s, x) => s + Number(x.commission_amount || 0), 0) * soldPax;
    const { data: ftx } = await supabase.from("financial_transactions")
      .select("amount,type,category").is("booking_id", null);
    const marketing = (ftx || [])
      .filter((t: any) => t.category === "marketing" && t.type === "expense")
      .reduce((s, t: any) => s + Number(t.amount || 0), 0);
    setProfit({
      pkg_price_avg: soldPax ? revenue / soldPax : 0,
      sold_pax: soldPax, revenue, agent_commission: agentCommission,
      pic_commission: picCommission, marketing,
    });
  };

  useEffect(() => { if (selectedPkg) loadCosts(selectedPkg); else { setCosts([]); setProfit(null); } }, [selectedPkg, filterDeparture]);

  useEffect(() => {
    (async () => {
      if (filteredPackages.length === 0) { setOverview([]); return; }
      const ids = filteredPackages.map((p) => p.id);
      let bq = supabase.from("bookings").select("id,package_id,total_price,status,departure_id").in("package_id", ids).eq("status", "paid");
      if (filterDeparture !== "__all__") bq = bq.eq("departure_id", filterDeparture);
      const [bk, pc] = await Promise.all([
        bq,
        supabase.from("package_commissions").select("package_id,commission_amount").in("package_id", ids),
      ]);
      const bookings = (bk.data || []) as any[];
      const bookingIds = bookings.map((b) => b.id).filter(Boolean);
      const agentByBooking: Record<string, number> = {};
      if (bookingIds.length) {
        const { data: ac } = await supabase.from("agent_commissions").select("booking_id,amount").in("booking_id", bookingIds);
        for (const r of (ac || []) as any[]) {
          agentByBooking[r.booking_id] = (agentByBooking[r.booking_id] || 0) + Number(r.amount || 0);
        }
      }
      const picByPkg: Record<string, number> = {};
      for (const r of (pc.data || []) as any[]) {
        picByPkg[r.package_id] = (picByPkg[r.package_id] || 0) + Number(r.commission_amount || 0);
      }
      const rows = filteredPackages.map((p) => {
        let perPax = 0, fixed = 0;
        const pkgCosts = allCosts.filter((x) =>
          x.package_id === p.id && x.is_active !== false &&
          (filterDeparture === "__all__" || !x.departure_id || x.departure_id === filterDeparture)
        );
        for (const c of pkgCosts) {
          const idr = toIDR(Number(c.unit_cost || 0), c.currency_code) * Number(c.qty || 0);
          if (c.is_per_pax) perPax += idr; else fixed += idr;
        }
        const pkgBookings = bookings.filter((b) => b.package_id === p.id);
        const soldPax = pkgBookings.length;
        const revenue = pkgBookings.reduce((s, b) => s + Number(b.total_price || 0), 0);
        const agent = pkgBookings.reduce((s, b) => s + (agentByBooking[b.id] || 0), 0);
        const pic = (picByPkg[p.id] || 0) * soldPax;
        const hppTotal = perPax * soldPax + fixed;
        const netProfit = revenue - hppTotal - agent - pic;
        const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
        return {
          package_id: p.id, title: p.title, type: p.package_type,
          hpp_per_pax: perPax, hpp_fixed: fixed, sold_pax: soldPax,
          revenue, net_profit: netProfit, margin,
        };
      });
      setOverview(rows);
    })();
  }, [filteredPackages, allCosts, currencies, filterDeparture]);

  const visibleCosts = useMemo(() => costs.filter((c) => showInactive || c.is_active !== false), [costs, showInactive]);

  const totals = useMemo(() => {
    let perPax = 0, fixed = 0;
    for (const c of visibleCosts) {
      if (c.is_active === false) continue;
      const idrAmt = toIDR(Number(c.unit_cost || 0), c.currency_code) * Number(c.qty || 0);
      if (c.is_per_pax) perPax += idrAmt; else fixed += idrAmt;
    }
    return { perPax, fixed };
  }, [visibleCosts, currencies]);

  const profitNet = useMemo(() => {
    if (!profit) return 0;
    const hppTotal = totals.perPax * profit.sold_pax + totals.fixed;
    return profit.revenue - hppTotal - profit.agent_commission - profit.pic_commission - profit.marketing;
  }, [profit, totals]);

  const profitMargin = useMemo(() => {
    if (!profit || profit.revenue === 0) return 0;
    return (profitNet / profit.revenue) * 100;
  }, [profitNet, profit]);

  const overviewTotals = useMemo(() => overview.reduce((acc, r) => ({
    revenue: acc.revenue + r.revenue,
    net_profit: acc.net_profit + r.net_profit,
    sold_pax: acc.sold_pax + r.sold_pax,
  }), { revenue: 0, net_profit: 0, sold_pax: 0 }), [overview]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      departure_id: filterDeparture !== "__all__" ? filterDeparture : null,
    });
    setOpen(true);
  };

  const openEdit = (c: Cost) => {
    setEditingId(c.id);
    setForm({
      category: c.category, item_name: c.item_name, qty: c.qty,
      unit: c.unit || "pax", unit_cost: c.unit_cost, currency_code: c.currency_code,
      is_per_pax: c.is_per_pax, is_active: c.is_active !== false,
      departure_id: c.departure_id, notes: c.notes || "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!selectedPkg || !form.item_name || !form.category) {
      toast.error("Lengkapi data terlebih dahulu"); return;
    }
    const payload = {
      package_id: selectedPkg,
      departure_id: form.departure_id || null,
      category: form.category,
      item_name: form.item_name,
      qty: Number(form.qty || 1),
      unit: form.unit || "pax",
      unit_cost: Number(form.unit_cost || 0),
      currency_code: form.currency_code || "IDR",
      is_per_pax: form.is_per_pax !== false,
      is_active: form.is_active !== false,
      notes: form.notes || null,
    };
    const { error } = editingId
      ? await supabase.from("package_costs").update(payload).eq("id", editingId)
      : await supabase.from("package_costs").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "Komponen diperbarui" : "Komponen disimpan");
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    loadCosts(selectedPkg);
    refreshAllCosts();
  };

  const toggleActive = async (c: Cost) => {
    const { error } = await supabase.from("package_costs")
      .update({ is_active: !(c.is_active !== false) }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    toast.success(c.is_active !== false ? "Dinonaktifkan" : "Diaktifkan");
    loadCosts(selectedPkg);
    refreshAllCosts();
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("package_costs").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Dihapus");
    loadCosts(selectedPkg);
    refreshAllCosts();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="w-7 h-7 text-primary" /> HPP & Profitabilitas Paket
          </h1>
          <p className="text-muted-foreground text-sm">Kelola komponen biaya per paket & per keberangkatan, lalu analisa laba bersih.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Filter className="w-4 h-4" /> Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Kategori Paket</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Semua Kategori</SelectItem>
                {pkgCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Jenis Paket</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Semua Jenis</SelectItem>
                {PACKAGE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Keberangkatan</Label>
            <Select value={filterDeparture} onValueChange={setFilterDeparture}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Semua Keberangkatan</SelectItem>
                {departuresForSelected.map((d) => {
                  const pkg = packages.find((p) => p.id === d.package_id);
                  return (
                    <SelectItem key={d.id} value={d.id}>
                      {new Date(d.departure_date).toLocaleDateString("id-ID")} {pkg ? `· ${pkg.title}` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Ringkasan Paket ({overview.length})</CardTitle>
          <div className="text-xs text-muted-foreground">
            Total Revenue: <span className="font-semibold text-foreground">{fmtIDR(overviewTotals.revenue)}</span> ·
            Laba: <span className={`font-semibold ${overviewTotals.net_profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmtIDR(overviewTotals.net_profit)}</span>
          </div>
        </CardHeader>
        <CardContent>
          {overview.length === 0 ? (
            <div className="text-muted-foreground text-sm">Tidak ada paket sesuai filter.</div>
          ) : (
            <ResponsiveTable>
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase">
                  <tr>
                    <th className="p-2 text-left">Paket</th>
                    <th className="p-2 text-left">Jenis</th>
                    <th className="p-2 text-right">HPP/Pax</th>
                    <th className="p-2 text-right">HPP Tetap</th>
                    <th className="p-2 text-right">Pax</th>
                    <th className="p-2 text-right">Revenue</th>
                    <th className="p-2 text-right">Laba Bersih</th>
                    <th className="p-2 text-right">Margin</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {overview.map((r) => (
                    <tr key={r.package_id} className={`border-b cursor-pointer hover:bg-muted/30 ${selectedPkg === r.package_id ? "bg-primary/5" : ""}`} onClick={() => setSelectedPkg(r.package_id)}>
                      <td className="p-2 font-medium">{r.title}</td>
                      <td className="p-2"><Badge variant="outline">{PACKAGE_TYPES.find((t) => t.value === r.type)?.label || r.type || "-"}</Badge></td>
                      <td className="p-2 text-right">{fmtIDR(r.hpp_per_pax)}</td>
                      <td className="p-2 text-right">{fmtIDR(r.hpp_fixed)}</td>
                      <td className="p-2 text-right">{r.sold_pax}</td>
                      <td className="p-2 text-right">{fmtIDR(r.revenue)}</td>
                      <td className={`p-2 text-right font-semibold ${r.net_profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmtIDR(r.net_profit)}</td>
                      <td className="p-2 text-right">{r.margin.toFixed(1)}%</td>
                      <td className="p-2 text-right">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedPkg(r.package_id); }}>Detail</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[240px]">
            <Label>Paket Terpilih</Label>
            <Select value={selectedPkg || "__none__"} onValueChange={(v) => setSelectedPkg(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Pilih paket" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Pilih paket —</SelectItem>
                {filteredPackages.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
            <Label htmlFor="show-inactive" className="cursor-pointer">Tampilkan nonaktif</Label>
          </div>
          <PackageCostsBulkDialog
            sourcePackageId={selectedPkg}
            sourceCosts={costs}
            packages={packages}
            departures={departures}
            onDone={() => { loadCosts(selectedPkg); refreshAllCosts(); }}
          />
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild>
              <Button disabled={!selectedPkg} onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Tambah Biaya</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingId ? "Edit Komponen Biaya" : "Komponen Biaya HPP"}</DialogTitle></DialogHeader>
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
                <div>
                  <Label>Keberangkatan (opsional)</Label>
                  <Select
                    value={form.departure_id || "__all__"}
                    onValueChange={(v) => setForm({ ...form, departure_id: v === "__all__" ? null : v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Berlaku untuk semua keberangkatan</SelectItem>
                      {departuresForSelected.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {new Date(d.departure_date).toLocaleDateString("id-ID")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      <SelectItem value="per_pax">Variabel — Per Jemaah</SelectItem>
                      <SelectItem value="fixed">Tetap per Keberangkatan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Catatan</Label>
                  <Input value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="active-toggle" checked={form.is_active !== false} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label htmlFor="active-toggle" className="cursor-pointer">Aktif (dihitung dalam HPP)</Label>
                </div>
                <Button onClick={save} className="w-full">{editingId ? "Simpan Perubahan" : "Simpan"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {selectedPkg && (
        <>
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
            <CardHeader><CardTitle className="text-base">Komponen HPP ({visibleCosts.length})</CardTitle></CardHeader>
            <CardContent>
              {loading ? <div className="text-muted-foreground text-sm">Memuat…</div> :
               visibleCosts.length === 0 ? <div className="text-muted-foreground text-sm">Belum ada komponen biaya untuk paket ini.</div> :
               <ResponsiveTable>
                 <table className="w-full text-sm">
                   <thead className="bg-muted/40 text-xs uppercase">
                     <tr>
                       <th className="p-2 text-left">Kategori</th>
                       <th className="p-2 text-left">Item</th>
                       <th className="p-2 text-left">Keberangkatan</th>
                       <th className="p-2 text-left">Qty × Harga</th>
                       <th className="p-2 text-left">IDR</th>
                       <th className="p-2 text-left">Tipe</th>
                       <th className="p-2 text-left">Status</th>
                       <th className="p-2 text-right">Aksi</th>
                     </tr>
                   </thead>
                   <tbody>
                     {visibleCosts.map((c) => {
                       const cat = CATEGORIES.find((x) => x.value === c.category)?.label || c.category;
                       const idr = toIDR(Number(c.unit_cost), c.currency_code) * Number(c.qty);
                       const dep = c.departure_id ? departures.find((d) => d.id === c.departure_id) : null;
                       const inactive = c.is_active === false;
                       return (
                         <tr key={c.id} className={`border-b ${inactive ? "opacity-50" : ""}`}>
                           <td className="p-2"><Badge variant="outline">{cat}</Badge></td>
                           <td className="p-2">{c.item_name}{c.notes && <div className="text-xs text-muted-foreground">{c.notes}</div>}</td>
                           <td className="p-2 text-xs">{dep ? new Date(dep.departure_date).toLocaleDateString("id-ID") : <span className="text-muted-foreground">Semua</span>}</td>
                           <td className="p-2">{c.qty} {c.unit} × {c.currency_code} {Number(c.unit_cost).toLocaleString("id-ID")}</td>
                           <td className="p-2 font-medium">{fmtIDR(idr)}</td>
                           <td className="p-2 text-xs">{c.is_per_pax ? "Per pax" : "Tetap"}</td>
                           <td className="p-2">
                             <Badge variant={inactive ? "secondary" : "default"}>{inactive ? "Nonaktif" : "Aktif"}</Badge>
                           </td>
                           <td className="p-2 text-right whitespace-nowrap">
                             <Button size="sm" variant="ghost" onClick={() => openEdit(c)} title="Edit">
                               <Pencil className="w-4 h-4" />
                             </Button>
                             <Button size="sm" variant="ghost" onClick={() => toggleActive(c)} title={inactive ? "Aktifkan" : "Nonaktifkan"}>
                               <Switch checked={!inactive} className="pointer-events-none" />
                             </Button>
                             <Button size="sm" variant="ghost" onClick={() => setDeleteId(c.id)} title="Hapus">
                               <Trash2 className="w-4 h-4 text-destructive" />
                             </Button>
                           </td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </ResponsiveTable>}
            </CardContent>
          </Card>
        </>
      )}

      <DeleteAlertDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        title="Hapus komponen biaya?"
        description="Item akan dihapus permanen. Gunakan toggle nonaktif jika ingin menyimpan riwayat."
        onConfirm={async () => { if (deleteId) { await del(deleteId); setDeleteId(null); } }}
      />
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
