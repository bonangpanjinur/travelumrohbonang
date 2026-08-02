import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Download, Loader2 } from "lucide-react";
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
    pageUrl?: string;
  };
}

const PromoPdfButton = ({ packageData }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const pageUrl = packageData.pageUrl || window.location.href;
      const blob = await generatePromoPdf({
        packageTitle: packageData.title,
        packageImage: packageData.image_url || undefined,
        description: packageData.description || undefined,
        startPrice: packageData.startPrice,
        durationDays: packageData.duration_days || undefined,
        hotelMakkah: packageData.hotel_makkah,
        hotelMadinah: packageData.hotel_madinah,
        airline: packageData.airline,
        pageUrl,
        brandName: "Umroh Plus",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `brosur-${packageData.title.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Brosur berhasil diunduh");
    } catch (e: any) {
      toast.error(e.message || "Gagal membuat PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleGenerate}
      disabled={loading}
      className="w-full h-11 border-gold/40 text-gold hover:bg-gold/5 hover:border-gold font-semibold gap-2"
    >
      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
      Download Brosur
    </Button>
  );
};

export default PromoPdfButton;
