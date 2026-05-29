import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowRight } from "lucide-react";

export default function StickyMobileCTA({ price, onBook, disabled, waLink }: {
  price?: number; onBook: () => void; disabled?: boolean; waLink?: string;
}) {
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border p-3 flex items-center gap-2 shadow-2xl">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Mulai dari</div>
        <div className="font-bold text-sm truncate">{price ? `Rp ${price.toLocaleString("id-ID")}` : "Hubungi kami"}</div>
      </div>
      {waLink && (
        <a href={waLink} target="_blank" rel="noopener noreferrer" aria-label="Chat WhatsApp">
          <Button variant="outline" size="icon"><MessageCircle className="w-4 h-4" /></Button>
        </a>
      )}
      <Button onClick={onBook} disabled={disabled} className="gradient-gold text-primary font-semibold">
        Pesan <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}
