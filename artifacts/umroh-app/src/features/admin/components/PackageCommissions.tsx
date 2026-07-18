import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/hooks/use-toast";
import { DollarSign } from "lucide-react";

interface Commission {
  cabang: number;
  agen: number;
  karyawan: number;
}

interface PackageCommissionsProps {
  packageId: string;
  packageTitle: string;
}

const PIC_TYPES = [
  { key: "cabang", label: "Cabang" },
  { key: "agen", label: "Agen" },
  { key: "karyawan", label: "Karyawan" },
] as const;

const PackageCommissions = ({ packageId, packageTitle }: PackageCommissionsProps) => {
  const [commissions, setCommissions] = useState<Commission>({ cabang: 0, agen: 0, karyawan: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await apiFetch<{ data: Array<{ label: string; commissionAmount: string }> }>(
          `/api/admin/packages/${packageId}/commissions`
        );
        const map: Commission = { cabang: 0, agen: 0, karyawan: 0 };
        data.forEach((d) => {
          const key = d.label?.toLowerCase() as keyof Commission;
          if (key in map) map[key] = parseFloat(d.commissionAmount) || 0;
        });
        setCommissions(map);
      } catch (err: any) {
        console.error("[PackageCommissions] fetch error:", err);
        toast({ title: "Gagal memuat data komisi", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [packageId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/admin/packages/${packageId}/commissions`, {
        method: "PUT",
        body: JSON.stringify(commissions),
      });
      toast({ title: "Komisi disimpan!" });
    } catch (err: any) {
      console.error("[PackageCommissions] save error:", err);
      toast({ title: "Gagal menyimpan komisi", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="w-4 h-4 text-gold" />
        <span className="font-semibold text-sm">Komisi per Jemaah — {packageTitle}</span>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground">Memuat...</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {PIC_TYPES.map(({ key, label }) => (
            <div key={key}>
              <Label className="text-xs">{label}</Label>
              <Input
                type="number"
                value={commissions[key]}
                onChange={(e) => setCommissions({ ...commissions, [key]: parseInt(e.target.value) || 0 })}
                className="mt-1"
                placeholder="0"
              />
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={saving || loading} className="gradient-gold text-primary">
          {saving ? "Menyimpan..." : "Simpan Komisi"}
        </Button>
      </div>
    </div>
  );
};

export default PackageCommissions;
