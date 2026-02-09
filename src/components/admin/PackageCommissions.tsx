import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("package_commissions")
        .select("pic_type, commission_amount")
        .eq("package_id", packageId);

      if (data) {
        const map: Commission = { cabang: 0, agen: 0, karyawan: 0 };
        data.forEach((d: any) => {
          if (d.pic_type in map) map[d.pic_type as keyof Commission] = d.commission_amount;
        });
        setCommissions(map);
      }
    };
    fetch();
  }, [packageId]);

  const handleSave = async () => {
    setSaving(true);
    // Upsert all 3 types
    for (const { key } of PIC_TYPES) {
      await supabase
        .from("package_commissions")
        .upsert(
          { package_id: packageId, pic_type: key, commission_amount: commissions[key] },
          { onConflict: "package_id,pic_type" }
        );
    }
    setSaving(false);
    toast({ title: "Komisi disimpan!" });
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="w-4 h-4 text-gold" />
        <span className="font-semibold text-sm">Komisi per Jemaah — {packageTitle}</span>
      </div>
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
      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={saving} className="gradient-gold text-primary">
          {saving ? "Menyimpan..." : "Simpan Komisi"}
        </Button>
      </div>
    </div>
  );
};

export default PackageCommissions;
