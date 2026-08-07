import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export const Shimmer = ({ className = "" }: { className?: string }) => (
  <div className={`bg-muted animate-pulse rounded ${className}`} />
);

/** Skeleton kartu (paket / artikel). */
export const CardGridSkeleton = ({
  count = 3,
  className = "grid md:grid-cols-2 lg:grid-cols-3 gap-8",
}: {
  count?: number;
  className?: string;
}) => (
  <div className={className}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-2xl overflow-hidden bg-card border border-border">
        <Shimmer className="h-48 rounded-none" />
        <div className="p-5 space-y-3">
          <Shimmer className="h-6 w-3/4" />
          <Shimmer className="h-4 w-1/2" />
          <Shimmer className="h-2 w-full" />
          <div className="flex justify-between items-end pt-2">
            <Shimmer className="h-7 w-28" />
            <Shimmer className="h-9 w-20" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

/** Skeleton grid gambar galeri. */
export const GalleryGridSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px]">
    {Array.from({ length: count }).map((_, i) => (
      <Shimmer key={i} className={`rounded-xl ${i === 0 ? "col-span-2 row-span-2" : ""}`} />
    ))}
  </div>
);

/** Skeleton kartu testimoni (di atas latar gelap). */
export const TestimonialGridSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="grid md:grid-cols-3 gap-8">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-card/10 border border-gold/20 rounded-2xl p-8 space-y-4">
        <Shimmer className="h-4 w-24 bg-muted/30" />
        <Shimmer className="h-3 w-full bg-muted/30" />
        <Shimmer className="h-3 w-5/6 bg-muted/30" />
        <Shimmer className="h-3 w-2/3 bg-muted/30" />
        <div className="flex items-center gap-3 pt-2">
          <Shimmer className="h-12 w-12 rounded-full bg-muted/30" />
          <div className="space-y-2">
            <Shimmer className="h-3 w-24 bg-muted/30" />
            <Shimmer className="h-3 w-16 bg-muted/30" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

/** Pesan gagal muat + tombol coba lagi. */
export const SectionError = ({
  message = "Gagal memuat data. Periksa koneksi Anda lalu coba lagi.",
  onRetry,
  tone = "default",
}: {
  message?: string;
  onRetry: () => void;
  tone?: "default" | "onPrimary";
}) => (
  <div className="text-center py-12 space-y-4">
    <AlertCircle
      className={`w-8 h-8 mx-auto ${tone === "onPrimary" ? "text-gold" : "text-muted-foreground"}`}
    />
    <p className={tone === "onPrimary" ? "text-primary-foreground/80" : "text-muted-foreground"}>
      {message}
    </p>
    <Button variant="outline" size="sm" onClick={onRetry}>
      <RefreshCw className="w-4 h-4 mr-2" />
      Coba Lagi
    </Button>
  </div>
);
