import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download, Printer, Loader2 } from "lucide-react";
import { 
  fetchInvoiceData, 
  generateInvoiceHTML, 
  openInvoicePrintWindow 
} from "@/components/admin/InvoiceGenerator";
import { useToast } from "@/hooks/use-toast";

interface InvoiceButtonProps {
  bookingId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
  className?: string;
}

const InvoiceButton = ({ 
  bookingId, 
  variant = "outline", 
  size = "sm",
  showLabel = true,
  className 
}: InvoiceButtonProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePrint = async () => {
    setLoading(true);
    try {
      const data = await fetchInvoiceData(bookingId);
      if (!data) {
        toast({ 
          title: "Gagal", 
          description: "Data invoice tidak ditemukan", 
          variant: "destructive" 
        });
        return;
      }
      const html = generateInvoiceHTML(data);
      openInvoicePrintWindow(html);
    } catch (error: any) {
      toast({ 
        title: "Gagal membuat invoice", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handlePrint}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Printer className="w-4 h-4" />
      )}
      {showLabel && <span className="ml-1">{loading ? "Memuat..." : "Invoice"}</span>}
    </Button>
  );
};

export default InvoiceButton;
