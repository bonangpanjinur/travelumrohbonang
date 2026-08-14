import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export default function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("portal-pwa-install-dismissed") === "1");

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!installEvent || dismissed) return null;

  const install = async () => {
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstallEvent(null);
  };

  const dismiss = () => {
    localStorage.setItem("portal-pwa-install-dismissed", "1");
    setDismissed(true);
  };

  return <div className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-2xl border bg-card p-4 shadow-xl lg:bottom-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-2 text-primary"><Download className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="font-semibold">Pasang Portal Jemaah</p><p className="mt-1 text-xs text-muted-foreground">Akses lebih cepat seperti aplikasi, termasuk saat koneksi kurang stabil.</p><div className="mt-3 flex gap-2"><Button size="sm" onClick={install}>Pasang sekarang</Button><Button size="sm" variant="ghost" onClick={dismiss}>Nanti</Button></div></div><button aria-label="Tutup" onClick={dismiss} className="text-muted-foreground"><X className="h-4 w-4" /></button></div></div>;
}
