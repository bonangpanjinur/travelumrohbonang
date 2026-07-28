import { ShieldX } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useNavigate } from "react-router-dom";

interface AccessDeniedProps {
  /** Pesan kustom — defaultnya "Anda tidak memiliki akses ke data ini." */
  message?: string;
  /** Tampilkan tombol "Kembali" */
  showBack?: boolean;
}

/**
 * E-3: Tampilkan pesan akses ditolak (403) yang informatif
 * — menggantikan halaman kosong / blank screen.
 */
export function AccessDenied({ message, showBack = true }: AccessDeniedProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
        <ShieldX className="w-8 h-8 text-destructive" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Akses Ditolak</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          {message ?? "Anda tidak memiliki akses ke data ini."}
        </p>
      </div>
      {showBack && (
        <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
          Kembali ke Dashboard
        </Button>
      )}
    </div>
  );
}
