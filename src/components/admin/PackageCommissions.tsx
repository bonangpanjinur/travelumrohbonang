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
      const { data, error } = await supabase
        .from("package_commissions")
        .select("pic_type, commission_amount")
        .eq("package_id", packageId);

      if (error) {
        console.error("Error fetching commissions:", error);
        return;
      }

      if (data) {
        const map: Commission = { cabang: 0, agen: 0, karyawan: 0 };
        data.forEach((d: any) => {
          const type = d.pic_type.toLowerCase();
          if (type in map) {
            map[type as keyof Commission] = d.commission_amount;
          }
        });
        setCommissions(map);
      }
    };
    fetch();
  }, [packageId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert all 3 types concurrently
      const promises = PIC_TYPES.map(({ key }) => 
        supabase
          .from("package_commissions")
          .upsert(
            { 
              package_id: packageId, 
              pic_type: key, 
              commission_amount: commissions[key] 
            },
            { onConflict: "package_id,pic_type" }
          )
      );

      const results = await Promise.all(promises);
      const firstError = results.find(r => r.error)?.error;

      if (firstError) {
        throw firstError;
      }

      toast({ title: "Komisi disimpan!" });
    } catch (error: any) {
      console.error("Error saving commissions:", error);
      toast({ 
        title: "Gagal menyimpan komisi", 
        description: error.message, 
        variant: "destructive" 
      });
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
