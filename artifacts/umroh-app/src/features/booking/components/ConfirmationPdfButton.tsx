import { FileDown } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

interface ConfirmationPdfButtonProps {
  bookingId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
  className?: string;
}

/**
 * Downloads the server-generated "Surat Konfirmasi Booking" PDF (F-06).
 * Opens in a new tab; the browser's session cookie authenticates the
 * request against the API server (credentials: same-origin via cookie).
 */
const ConfirmationPdfButton = ({
  bookingId,
  variant = "outline",
  size = "sm",
  showLabel = true,
  className,
}: ConfirmationPdfButtonProps) => {
  const handleOpen = () => {
    window.open(`${API_BASE}/api/bookings/${bookingId}/confirmation.pdf`, "_blank");
  };

  return (
    <Button variant={variant} size={size} onClick={handleOpen} className={className}>
      <FileDown className="w-4 h-4" />
      {showLabel && <span className="ml-1">Konfirmasi PDF</span>}
    </Button>
  );
};

export default ConfirmationPdfButton;
