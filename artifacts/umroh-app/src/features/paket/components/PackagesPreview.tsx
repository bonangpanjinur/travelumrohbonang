import { motion } from "framer-motion";
import { Button } from "@/shared/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/shared/lib/apiClient";
import { supabase } from "@/shared/integrations/supabase/client";
import PackageCard, { type PackageCardData } from "./PackageCard";
import { useAsyncRetry } from "@/shared/hooks/useAsyncRetry";
import { CardGridSkeleton, SectionError } from "@/shared/components/common/SectionSkeleton";

/**
 * Fallback ketika /api/packages tidak tersedia (api-server mati):
 * ambil langsung dari database lewat REST agar homepage tetap berisi.
 */
async function fetchPackagesFromDb(): Promise<PackageCardData[]> {
  const { data, error } = await supabase
    .from("packages")
    .select(
      `id, title, slug, image_url, duration_days, package_type,
       package_departures ( id, departure_date, return_date, quota, remaining_quota, status,
         departure_prices ( price, room_type ) )`,
    )
    .eq("is_active", true)
    .limit(6);

  if (error || !data) return [];

  return (data as any[]).map((p) => {
    const departures = (p.package_departures ?? []).map((d: any) => ({
      ...d,
      prices: d.departure_prices ?? [],
    }));
    const prices = departures.flatMap((d: any) =>
      (d.prices ?? []).map((pr: any) => Number(pr.price)),
    );
    return {
      ...p,
      departures,
      lowestPrice: prices.length ? Math.min(...prices) : undefined,
    } as PackageCardData;
  });
}

const PackagesPreview = () => {
  const { data, loading, error, retry } = useAsyncRetry<PackageCardData[]>(
    async () => {
      try {
        const result = await apiFetch<{ data: PackageCardData[] }>("/api/packages");
        if (result?.data?.length) return result.data;
      } catch {
        // fallback ke database di bawah
      }
      return await fetchPackagesFromDb();
    },
    [],
    { retries: 2, retryDelayMs: 1000, timeoutMs: 8000 },
  );

  const packages = data ?? [];

  return (
    <section className="section-padding bg-background">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-accent uppercase tracking-widest">
            Paket Umroh
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mt-3">
            Pilih Paket <span className="text-gradient-gold">Terbaik</span> Anda
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Berbagai pilihan paket umroh yang sesuai dengan kebutuhan dan budget Anda
          </p>
        </motion.div>

        {loading ? (
          <CardGridSkeleton count={3} />
        ) : error ? (
          <SectionError onRetry={retry} message="Gagal memuat paket umroh. Silakan coba lagi." />
        ) : packages.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            Belum ada paket tersedia
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packages.map((pkg, index) => (
              <PackageCard key={pkg.id} pkg={pkg} index={index} />
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <Link to="/paket">
            <Button variant="outline" size="lg" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              Lihat Semua Paket
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PackagesPreview;
