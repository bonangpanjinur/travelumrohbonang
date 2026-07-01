import { WifiOff, RefreshCw, CheckCircle2, Loader2 } from "lucide-react";
import { useSupabaseHealth } from "../hooks/useSupabaseHealth";

export function AdminHealthBanner() {
  const { status, retry } = useSupabaseHealth();

  if (status === "online" || status === "checking") return null;

  if (status === "recovering") {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-500 text-white animate-in slide-in-from-top duration-300">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>Koneksi ke server pulih kembali.</span>
      </div>
    );
  }

  // status === "offline"
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 text-sm bg-amber-500 text-white animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2 min-w-0">
        <WifiOff className="w-4 h-4 shrink-0" />
        <span className="truncate">
          <strong>Server tidak dapat dijangkau.</strong>{" "}
          <span className="hidden sm:inline">
            Data mungkin tidak termuat. Periksa koneksi internet Anda.
          </span>
        </span>
      </div>
      <button
        onClick={retry}
        className="flex items-center gap-1.5 shrink-0 rounded px-2.5 py-1 text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Coba lagi
      </button>
    </div>
  );
}
