import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { supabaseAuth } from "@/shared/integrations/supabase/auth-client";
import { toast } from "sonner";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

interface ConfirmationPdfButtonProps {
  bookingId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
  className?: string;
}

/**
 * Downloads the server-generated "Surat Konfirmasi Booking" PDF.
 * Fetches via XHR (so the Authorization header is included) instead of
 * opening a bare URL in a new tab (which strips auth headers and returns 401).
 */
const ConfirmationPdfButton = ({
  bookingId,
  variant = "outline",
  size = "sm",
  showLabel = true,
  className,
}: ConfirmationPdfButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      // Get current Supabase session token
      const { data: { session } } = await supabaseAuth.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(
        `${API_BASE}/api/bookings/${bookingId}/confirmation.pdf`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error ?? `HTTP ${res.status}`);
      }

      // Stream response as blob and open in new tab
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `konfirmasi-booking-${bookingId.slice(0, 8)}.pdf`;
      a.click();
      // Also open in new tab for preview
      window.open(url, "_blank");
      // Clean up after short delay
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err: any) {
      toast.error(err.message ?? "Gagal mengunduh Konfirmasi PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileDown className="w-4 h-4" />
      )}
      {showLabel && <span className="ml-1">Konfirmasi PDF</span>}
    </Button>
  );
};

export default ConfirmationPdfButton;
