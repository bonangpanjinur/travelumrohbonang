import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { useSupabaseHealth } from "@/features/admin/hooks/useSupabaseHealth";

/**
 * Banner status backend untuk halaman publik.
 * Tampil hanya ketika server tidak dapat dijangkau, dan sebentar saat pulih.
 */
export default function BackendStatusBanner() {
  const { status, retry } = useSupabaseHealth();

  if (status === "online" || status === "checking") return null;

  if (status === "recovering") {
    return (
      <div
        role="status"
        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-success text-success-foreground"
      >
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>Koneksi ke server pulih kembali.</span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 px-4 py-2 text-sm bg-destructive text-destructive-foreground"
    >
      <div className="flex items-center gap-2 min-w-0">
        <WifiOff className="w-4 h-4 shrink-0" />
        <span className="truncate">
          <strong>Server sedang tidak tersedia.</strong>{" "}
          <span className="hidden sm:inline">
            Sebagian data mungkin belum tampil. Periksa koneksi internet Anda atau coba beberapa saat lagi.
          </span>
        </span>
      </div>
      <button
        onClick={retry}
        className="flex items-center gap-1.5 shrink-0 rounded px-2.5 py-1 text-xs font-semibold bg-background/20 hover:bg-background/30 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Coba lagi
      </button>
    </div>
  );
}
