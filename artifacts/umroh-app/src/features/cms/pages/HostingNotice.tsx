import { AlertTriangle, Globe, MessageCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DEFAULT_HOSTING_NOTICE, useHostingNotice } from "@/features/admin/hooks/useHostingNotice";

export default function HostingNotice() {
  const { data } = useHostingNotice();
  const notice = { ...DEFAULT_HOSTING_NOTICE, ...data };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 py-16 text-white">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/40 via-slate-950 to-slate-950" />
      <section className="relative z-10 w-full max-w-2xl rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl backdrop-blur sm:p-12">
        <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
          <AlertTriangle className="h-8 w-8" aria-hidden="true" />
        </div>
        <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
          <Globe className="h-4 w-4" aria-hidden="true" /> Pemberitahuan Website
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{notice.title}</h1>
        <p className="mx-auto mt-5 max-w-xl whitespace-pre-line text-base leading-7 text-slate-300 sm:text-lg">{notice.message}</p>
        <div className="mx-auto my-8 h-px max-w-xs bg-white/10" />
        <p className="text-sm text-slate-400">Silakan hubungi pengelola website untuk informasi lebih lanjut.</p>
        {notice.contactUrl ? (
          <Button asChild className="mt-6 min-h-12 bg-amber-400 px-6 font-semibold text-slate-950 hover:bg-amber-300">
            <a href={notice.contactUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />{notice.contactLabel}
            </a>
          </Button>
        ) : (
          <div className="mt-6 space-y-2">
            <Button disabled className="min-h-12 bg-amber-400 px-6 font-semibold text-slate-950 opacity-60">
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />{notice.contactLabel}
            </Button>
            <p className="text-xs text-slate-500">Tautan kontak belum diatur oleh administrator.</p>
          </div>
        )}
      </section>
    </main>
  );
}
