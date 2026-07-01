import { useState, useCallback } from "react";
import { LogOut, RefreshCw, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { useSessionTimeout } from "../hooks/useSessionTimeout";
import { useAuth } from "@/shared/hooks/useAuth";

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Colour the ring based on urgency */
function ringColor(seconds: number): string {
  if (seconds <= 60) return "text-red-500";
  if (seconds <= 120) return "text-orange-500";
  return "text-amber-500";
}

export function AdminSessionTimeoutModal() {
  const { secondsLeft, isWarning, extend } = useSessionTimeout();
  const { signOut } = useAuth();
  const [extending, setExtending] = useState(false);

  const handleExtend = useCallback(async () => {
    setExtending(true);
    await extend();
    setExtending(false);
  }, [extend]);

  // Only open when in the warning window and session hasn't expired yet
  const open = isWarning && (secondsLeft ?? 0) > 0;

  if (!open) return null;

  const secs = secondsLeft!;
  const urgent = secs <= 60;

  return (
    <Dialog open modal>
      <DialogContent
        className="sm:max-w-sm"
        // Prevent closing by clicking outside or pressing Escape —
        // admin must actively choose to extend or sign out.
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        // Hide the default X close button via CSS
        hideCloseButton
      >
        <DialogHeader className="items-center text-center gap-3">
          {/* Countdown ring */}
          <div
            className={`relative flex items-center justify-center w-20 h-20 rounded-full border-4 ${
              urgent ? "border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900" : "border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900"
            }`}
          >
            <Clock
              className={`absolute w-5 h-5 opacity-20 ${ringColor(secs)}`}
            />
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${ringColor(secs)}`}
            >
              {formatCountdown(secs)}
            </span>
          </div>

          <DialogTitle className="text-base">
            {urgent ? "Sesi Anda hampir habis!" : "Sesi akan segera berakhir"}
          </DialogTitle>

          <DialogDescription className="text-sm text-center leading-relaxed">
            {urgent
              ? "Anda akan otomatis keluar dalam kurang dari 1 menit. Perpanjang sesi sekarang untuk tetap masuk."
              : "Sesi login Anda akan berakhir dalam beberapa menit. Perpanjang sekarang agar tidak kehilangan pekerjaan yang sedang berlangsung."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 mt-2">
          <Button
            onClick={handleExtend}
            disabled={extending}
            className="w-full gap-2"
          >
            {extending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {extending ? "Memperpanjang..." : "Perpanjang Sesi"}
          </Button>

          <Button
            variant="outline"
            onClick={() => signOut()}
            className="w-full gap-2 text-muted-foreground"
          >
            <LogOut className="w-4 h-4" />
            Keluar Sekarang
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
