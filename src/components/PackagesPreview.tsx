import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PackageCard, { PackageCardData } from "./PackageCard";

const PackagesPreview = () => {
  const [packages, setPackages] = useState<PackageCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPackages = async () => {
      const { data } = await supabase
        .from("packages")
        .select(`
          id, title, slug, image_url, duration_days, package_type,
          category:package_categories(id, name),
          hotel_makkah:hotels!packages_hotel_makkah_id_fkey(star, name),
          airline:airlines!packages_airline_id_fkey(id, name),
          airport:airports!packages_airport_id_fkey(id, name, city),
          departures:package_departures(id, departure_date, remaining_quota, prices:departure_prices(price, room_type))
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(6);

      setPackages((data as unknown as PackageCardData[]) || []);
      setLoading(false);
    };

    fetchPackages();
  }, []);

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
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
          </div>
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
