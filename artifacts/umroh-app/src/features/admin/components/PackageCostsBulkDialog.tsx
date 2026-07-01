import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  sort_order?: number | null;
}

interface PkgOpt { id: string; title: string; }
interface Departure { id: string; package_id: string; departure_date: string; }

interface Props {
  sourcePackageId: string;
  sourceCosts: Cost[];
  packages: PkgOpt[];
  departures: Departure[];
  onDone: () => void;
}

type Mode = "packages" | "departures";

export default function PackageCostsBulkDialog({ sourcePackageId, sourceCosts, packages, departures, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("packages");
  const [selectedCostIds, setSelectedCostIds] = useState<string[]>([]);
  const [targetPackageIds, setTargetPackageIds] = useState<string[]>([]);
  const [targetDepartureIds, setTargetDepartureIds] = useState<string[]>([]);
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedCostIds(sourceCosts.map((c) => c.id));
      setTargetPackageIds([]);
      setTargetDepartureIds([]);
    }
  }, [open, sourceCosts]);

  const targetableDepartures = useMemo(
    () => departures.filter((d) => d.package_id === sourcePackageId),
    [departures, sourcePackageId],
  );
  const otherPackages = useMemo(
    () => packages.filter((p) => p.id !== sourcePackageId),
    [packages, sourcePackageId],
  );

  const toggle = (arr: string[], setArr: (v: string[]) => void, id: string) => {
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  };

  const apply = async () => {
    const source = sourceCosts.filter((c) => selectedCostIds.includes(c.id));
    if (source.length === 0) { toast.error("Pilih minimal satu komponen"); return; }

    let inserts: any[] = [];
    if (mode === "packages") {
      if (targetPackageIds.length === 0) { toast.error("Pilih paket tujuan"); return; }
      for (const pid of targetPackageIds) {
        for (const c of source) {
          inserts.push({
            package_id: pid, departure_id: null,
            category: c.category, item_name: c.item_name, qty: c.qty, unit: c.unit,
            unit_cost: c.unit_cost, currency_code: c.currency_code,
            is_per_pax: c.is_per_pax, is_active: c.is_active, notes: c.notes,
          });
        }
      }
    } else {
      if (targetDepartureIds.length === 0) { toast.error("Pilih keberangkatan tujuan"); return; }
      for (const did of targetDepartureIds) {
        for (const c of source) {
          inserts.push({
            package_id: sourcePackageId, departure_id: did,
            category: c.category, item_name: c.item_name, qty: c.qty, unit: c.unit,
            unit_cost: c.unit_cost, currency_code: c.currency_code,
            is_per_pax: c.is_per_pax, is_active: c.is_active, notes: c.notes,
          });
        }
      }
    }

    setBusy(true);
    try {
      if (overwrite) {
        if (mode === "packages") {
          for (const pid of targetPackageIds) {
            await supabase.from("package_costs").delete().eq("package_id", pid).is("departure_id", null);
          }
        } else {
          for (const did of targetDepartureIds) {
            await supabase.from("package_costs").delete().eq("departure_id", did);
          }
        }
      }
      const { error } = await supabase.from("package_costs").insert(inserts);
      if (error) throw error;
      toast.success(`${inserts.length} komponen disalin`);
      setOpen(false);
      onDone();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyalin");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={sourceCosts.length === 0}>
          <Copy className="w-4 h-4 mr-1" /> Salin Massal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Salin Komponen HPP ke Banyak Tujuan</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Mode</Label>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={mode === "packages" ? "default" : "outline"} onClick={() => setMode("packages")}>
                Ke Paket Lain
              </Button>
              <Button type="button" size="sm" variant={mode === "departures" ? "default" : "outline"} onClick={() => setMode("departures")}>
                Ke Keberangkatan Paket Ini
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Komponen Sumber ({selectedCostIds.length}/{sourceCosts.length})</Label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedCostIds(sourceCosts.map((c) => c.id))}>Pilih semua</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedCostIds([])}>Kosongkan</Button>
              </div>
            </div>
            <ScrollArea className="h-40 border rounded-md p-2">
              {sourceCosts.length === 0 ? (
                <div className="text-sm text-muted-foreground p-2">Tidak ada komponen pada paket ini.</div>
              ) : sourceCosts.map((c) => (
                <label key={c.id} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                  <Checkbox checked={selectedCostIds.includes(c.id)} onCheckedChange={() => toggle(selectedCostIds, setSelectedCostIds, c.id)} />
                  <span className="flex-1">{c.item_name}</span>
                  <Badge variant="outline" className="text-xs">{c.is_per_pax ? "Per pax" : "Tetap"}</Badge>
                  <span className="text-xs text-muted-foreground">{c.currency_code} {Number(c.unit_cost).toLocaleString("id-ID")}</span>
                </label>
              ))}
            </ScrollArea>
          </div>

          {mode === "packages" ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Paket Tujuan ({targetPackageIds.length})</Label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setTargetPackageIds(otherPackages.map((p) => p.id))}>Pilih semua</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setTargetPackageIds([])}>Kosongkan</Button>
                </div>
              </div>
              <ScrollArea className="h-48 border rounded-md p-2">
                {otherPackages.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-2">Tidak ada paket lain.</div>
                ) : otherPackages.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                    <Checkbox checked={targetPackageIds.includes(p.id)} onCheckedChange={() => toggle(targetPackageIds, setTargetPackageIds, p.id)} />
                    <span>{p.title}</span>
                  </label>
                ))}
              </ScrollArea>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Keberangkatan Tujuan ({targetDepartureIds.length})</Label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setTargetDepartureIds(targetableDepartures.map((d) => d.id))}>Pilih semua</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setTargetDepartureIds([])}>Kosongkan</Button>
                </div>
              </div>
              <ScrollArea className="h-48 border rounded-md p-2">
                {targetableDepartures.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-2">Paket ini belum punya keberangkatan.</div>
                ) : targetableDepartures.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                    <Checkbox checked={targetDepartureIds.includes(d.id)} onCheckedChange={() => toggle(targetDepartureIds, setTargetDepartureIds, d.id)} />
                    <span>{new Date(d.departure_date).toLocaleDateString("id-ID")}</span>
                  </label>
                ))}
              </ScrollArea>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={overwrite} onCheckedChange={(v) => setOverwrite(v === true)} />
            <span>Hapus komponen lama pada tujuan sebelum menyalin (timpa)</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Batal</Button>
            <Button onClick={apply} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Salin
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
