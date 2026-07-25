import { Button } from "@/shared/components/ui/button";
import { MessageCircle, ArrowRight } from "lucide-react";
import { useCurrency } from "@/shared/hooks/useCurrency";

export default function StickyMobileCTA({ price, onBook, disabled, waLink }: {
  price?: number; onBook: () => void; disabled?: boolean; waLink?: string;
}) {
  const { format } = useCurrency();
  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-2 border-t border-border bg-card px-3 py-2.5 shadow-2xl sm:px-4 lg:hidden">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Mulai dari</div>
        <div className="font-bold text-sm truncate">{price ? format(price) : "Hubungi kami"}</div>
      </div>
      {waLink && (
        <a href={waLink} target="_blank" rel="noopener noreferrer" aria-label="Chat WhatsApp">
          <Button variant="outline" size="icon" className="shrink-0"><MessageCircle className="w-4 h-4" /></Button>
        </a>
      )}
      <Button onClick={onBook} disabled={disabled} className="min-h-11 shrink-0 bg-gradient-to-r from-gold to-gold-dark px-3 text-sm font-semibold text-primary hover:opacity-90 sm:px-5 sm:text-base">
        Pesan Sekarang <ArrowRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}
