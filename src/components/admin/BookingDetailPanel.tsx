import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, DollarSign, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchInvoiceData, generateInvoiceHTML, openInvoicePrintWindow } from "./InvoiceGenerator";
import { toast } from "sonner";

interface BookingDetailPanelProps {
  bookingId: string;
  packageId: string | null;
  picType: string | null;
  picId: string | null;
  packageTitle: string;
}

interface Pilgrim {
  id: string;
  name: string;
  gender: string | null;
}

const BookingDetailPanel = ({ bookingId, packageId, picType, picId, packageTitle }: BookingDetailPanelProps) => {
  const [pilgrims, setPilgrims] = useState<Pilgrim[]>([]);
  const [commissionRate, setCommissionRate] = useState<number>(0);
  const [picName, setPicName] = useState<string>("-");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);

      // Fetch pilgrims
      const { data: pilgrimsData } = await supabase
        .from("booking_pilgrims")
        .select("id, name, gender")
        .eq("booking_id", bookingId);
      setPilgrims(pilgrimsData || []);

      // Fetch commission rate
      if (packageId && picType && picType !== "pusat") {
        const { data: commData } = await supabase
          .from("package_commissions")
          .select("commission_amount")
          .eq("package_id", packageId)
          .eq("pic_type", picType)
          .maybeSingle();
        setCommissionRate(commData?.commission_amount || 0);
      }

      // Fetch PIC name
      if (picId && picType) {
        if (picType === "agen") {
          const { data } = await supabase.from("agents").select("name").eq("id", picId).maybeSingle();
          setPicName(data?.name || "-");
        } else if (picType === "cabang") {
          const { data } = await supabase.from("branches").select("name").eq("id", picId).maybeSingle();
          setPicName(data?.name || "-");
        } else if (picType === "karyawan") {
          const { data } = await supabase.from("profiles").select("name").eq("id", picId).maybeSingle();
          setPicName(data?.name || "-");
        }
      }

      setLoading(false);
    };

    fetchDetails();
  }, [bookingId, packageId, picType, picId]);

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  const picTypeLabel: Record<string, string> = {
    cabang: "Cabang",
    agen: "Agen",
    karyawan: "Karyawan",
    pusat: "Kantor Pusat",
  };

  const totalCommission = commissionRate * pilgrims.length;
  const isPusat = !picType || picType === "pusat";

  const handleDownloadInvoice = async () => {
    const data = await fetchInvoiceData(bookingId);
    if (!data) {
      toast.error("Gagal mengambil data invoice");
      return;
    }
    const html = generateInvoiceHTML(data);
    openInvoicePrintWindow(html);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={handleDownloadInvoice}>
          <FileDown className="w-4 h-4 mr-2" /> Cetak Invoice
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
      {/* Commission Info */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <h4 className="font-semibold flex items-center gap-2 text-sm">
          <DollarSign className="w-4 h-4 text-primary" /> Info Komisi
        </h4>
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">PIC</span>
            <span className="font-medium">
              {isPusat ? "Kantor Pusat" : `${picTypeLabel[picType!] || picType} - ${picName}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Paket</span>
            <span className="font-medium">{packageTitle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Jumlah Jemaah</span>
            <span className="font-medium">{pilgrims.length} orang</span>
          </div>
          {isPusat ? (
            <div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground text-center">
              Tidak ada komisi (Kantor Pusat)
            </div>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Komisi/Jemaah</span>
                <span className="font-medium">Rp {commissionRate.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border mt-2">
                <span className="font-semibold">TOTAL KOMISI</span>
                <span className="font-bold text-primary">Rp {totalCommission.toLocaleString("id-ID")}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pilgrim List */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <h4 className="font-semibold flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-primary" /> Daftar Jemaah ({pilgrims.length})
        </h4>
        {pilgrims.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada data jemaah</p>
        ) : (
          <ul className="text-sm space-y-1">
            {pilgrims.map((p, i) => (
              <li key={p.id} className="flex items-center gap-2">
                <UserCheck className="w-3 h-3 text-muted-foreground" />
                <span>{i + 1}. {p.name}</span>
                {p.gender && <span className="text-muted-foreground text-xs">- {p.gender === "L" || p.gender === "Laki-laki" ? "Laki-laki" : "Perempuan"}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>
    </div>
  );
};

export default BookingDetailPanel;
