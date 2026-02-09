import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Star, Calendar, Users, ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Package {
  id: string;
  title: string;
  slug: string;
  description: string;
  package_type: string;
  image_url: string;
  duration_days: number;
  category: { name: string } | null;
  hotel_makkah: { star: number } | null;
  departures: { id: string; departure_date: string; remaining_quota: number; prices: { price: number }[] }[];
}

const Paket = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchPackages = async () => {
      const { data } = await supabase
        .from("packages")
        .select(`
          id, title, slug, description, package_type, image_url, duration_days,
          category:package_categories(name),
          hotel_makkah:hotels!packages_hotel_makkah_id_fkey(star),
          departures:package_departures(id, departure_date, remaining_quota, prices:departure_prices(price))
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      setPackages((data as unknown as Package[]) || []);
      setLoading(false);
    };

    fetchPackages();
  }, []);

  const getLowestPrice = (departures: Package["departures"]) => {
    if (!departures || departures.length === 0) return 0;
    const allPrices = departures.flatMap((d) => d.prices.map((p) => p.price));
    return allPrices.length > 0 ? Math.min(...allPrices) : 0;
  };

  const getNextDeparture = (departures: Package["departures"]) => {
    if (!departures || departures.length === 0) return null;
    const future = departures
      .filter((d) => new Date(d.departure_date) >= new Date())
      .sort((a, b) => new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime());
    return future[0] || null;
  };

  const filteredPackages = packages.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20">
        {/* Header */}
        <section className="gradient-emerald section-padding islamic-pattern">
          <div className="container-custom text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-5xl font-display font-bold text-primary-foreground mb-4"
            >
              Paket <span className="text-gradient-gold">Umroh</span>
            </motion.h1>
            <p className="text-primary-foreground/70 max-w-xl mx-auto mb-8">
              Temukan paket umroh terbaik sesuai kebutuhan dan budget Anda
            </p>

            {/* Search */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Cari paket..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 bg-card border-none h-12"
              />
            </div>
          </div>
        </section>

        {/* Packages Grid */}
        <section className="section-padding bg-background">
          <div className="container-custom">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
              </div>
            ) : filteredPackages.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">Belum ada paket tersedia</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPackages.map((pkg, index) => {
                  const lowestPrice = getLowestPrice(pkg.departures);
                  const nextDep = getNextDeparture(pkg.departures);

                  return (
                    <motion.div
                      key={pkg.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="rounded-2xl overflow-hidden bg-card border border-border hover:border-gold/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                    >
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={pkg.image_url || "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=600&q=80"}
                          alt={pkg.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                        <div className="absolute bottom-3 left-4">
                          <span className="bg-primary/90 text-primary-foreground text-xs px-3 py-1 rounded-full">
                            {pkg.category?.name || pkg.package_type || "Reguler"}
                          </span>
                        </div>
                      </div>

                      <div className="p-6">
                        <h3 className="text-xl font-display font-bold text-foreground">{pkg.title}</h3>

                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" /> {pkg.duration_days} Hari
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4" /> Bintang {pkg.hotel_makkah?.star || 4}
                          </span>
                          {nextDep && (
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" /> {nextDep.remaining_quota} seat
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                          {pkg.description || "Paket umroh dengan pelayanan terbaik"}
                        </p>

                        <div className="mt-6 pt-4 border-t border-border flex items-end justify-between">
                          <div>
                            <span className="text-xs text-muted-foreground">Mulai dari</span>
                            <div className="text-2xl font-display font-bold text-foreground">
                              Rp {lowestPrice.toLocaleString("id-ID")}
                            </div>
                          </div>
                          <Link to={`/paket/${pkg.slug}`}>
                            <Button size="sm" className="gradient-gold text-primary">
                              Detail
                              <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Paket;
