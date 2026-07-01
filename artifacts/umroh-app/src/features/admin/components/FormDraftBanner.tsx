import { RotateCcw, X, Clock } from "lucide-react";

interface Props {
  onRestore: () => void;
  onDiscard: () => void;
}

export function FormDraftBanner({ onRestore, onDiscard }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2.5 text-sm animate-in slide-in-from-top duration-200">
      <div className="flex items-center gap-2 min-w-0">
        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-amber-800 dark:text-amber-300 truncate">
          <strong>Draft tersimpan ditemukan.</strong>{" "}
          <span className="hidden sm:inline">Pulihkan data formulir Anda sebelumnya?</span>
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onRestore}
          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Pulihkan
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="p-1 rounded text-amber-600 hover:text-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
          aria-label="Abaikan draft"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
