import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/shared/integrations/supabase/client";
import { useAuth } from "@/shared/hooks/useAuth";
import { toast } from "sonner";
import { generatePromoPdf } from "@/features/cms/lib/promoPdf";

interface Props {
  packageData: {
    title: string;
    image_url?: string | null;
    description?: string | null;
    duration_days?: number | null;
    hotel_makkah?: string;
    hotel_madinah?: string;
    airline?: string;
    startPrice: number;
  };
}

const PromoPdfButton = ({ packageData }: Props) => {
  const { user } = useAuth();
  const [agent, setAgent] = useState<{ name: string; referral_code: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [brand, setBrand] = useState({ name: "UmrohPlus", phone: "" });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("agents")
      .select("name, referral_code")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => setAgent(data as any));
    supabase
      .from("settings")
      .select("key, value")
      .in("key", ["company_name", "contact_phone"])
      .then(({ data }) => {
        const m: Record<string, string> = {};
        (data || []).forEach((r: any) => { m[r.key] = r.value; });
        setBrand({ name: m.company_name || "UmrohPlus", phone: m.contact_phone || "" });
      });
  }, [user]);

  if (!agent?.referral_code) return null;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const referralUrl = `${window.location.origin}/r/${agent.referral_code}?to=${encodeURIComponent(window.location.pathname)}`;
      const blob = await generatePromoPdf({
        packageTitle: packageData.title,
        packageImage: packageData.image_url || undefined,
        description: packageData.description || undefined,
        startPrice: packageData.startPrice,
        durationDays: packageData.duration_days || undefined,
        hotelMakkah: packageData.hotel_makkah,
        hotelMadinah: packageData.hotel_madinah,
        airline: packageData.airline,
        agentName: agent.name,
        referralCode: agent.referral_code!,
        referralUrl,
        brandName: brand.name,
        brandPhone: brand.phone,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `promo-${packageData.title.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF promosi terunduh");
    } catch (e: any) {
      toast.error(e.message || "Gagal membuat PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleGenerate} disabled={loading}>
      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
      Unduh Materi Promosi (Agen)
    </Button>
  );
};

export default PromoPdfButton;
