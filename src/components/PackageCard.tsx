import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Star, Calendar, Users, ArrowRight, Plane, MapPin } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export interface PackageCardData {
  id: string;
  title: string;
  slug: string;
  image_url?: string | null;
  duration_days?: number;
  package_type?: string | null;
  category?: { id: string; name: string } | null;
  hotel_makkah?: { star: number; name?: string } | null;
  airline?: { id: string; name: string } | null;
  airport?: { id: string; name: string; city?: string } | null;
  departures?: {
    id: string;
    departure_date: string;
    remaining_quota: number;
    prices?: { price: number; room_type: string }[];
  }[];
  // For static/preview data
  lowestPrice?: number;
  hotelStar?: number;
  quota?: number;
  features?: string[];
  popular?: boolean;
}

interface PackageCardProps {
  pkg: PackageCardData;
  index?: number;
  showFeatures?: boolean;
}

const PackageCard = ({ pkg, index = 0, showFeatures = false }: PackageCardProps) => {
  // Calculate lowest price from departures if available
  const getLowestPrice = () => {
    if (pkg.lowestPrice !== undefined) return pkg.lowestPrice;
    if (!pkg.departures || pkg.departures.length === 0) return 0;
    const allPrices = pkg.departures.flatMap((d) => d.prices?.map((p) => p.price) || []);
    return allPrices.length > 0 ? Math.min(...allPrices) : 0;
  };

  // Get next departure date
  const getNextDeparture = () => {
    if (!pkg.departures || pkg.departures.length === 0) return null;
    const future = pkg.departures
      .filter((d) => new Date(d.departure_date) >= new Date())
      .sort((a, b) => new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime());
    return future[0] || null;
  };

  const lowestPrice = getLowestPrice();
  const nextDep = getNextDeparture();
  const hotelStar = pkg.hotel_makkah?.star || pkg.hotelStar || 4;
  const categoryName = pkg.category?.name || pkg.package_type || "Reguler";
  const remainingQuota = nextDep?.remaining_quota || pkg.quota;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className={`relative rounded-2xl overflow-hidden bg-card border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
        pkg.popular ? "border-gold shadow-lg shadow-gold/10" : "border-border hover:border-gold/30"
      }`}
    >
      {pkg.popular && (
        <div className="absolute top-4 right-4 z-10 gradient-gold text-primary text-xs font-bold px-3 py-1 rounded-full">
          Terpopuler
        </div>
      )}

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
            {categoryName}
          </span>
        </div>
        {nextDep && (
          <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm text-xs px-2 py-1 rounded-full">
            {format(new Date(nextDep.departure_date), "d MMM", { locale: idLocale })}
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="text-lg font-display font-bold text-foreground line-clamp-1">{pkg.title}</h3>

        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> {pkg.duration_days || 9} Hari
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5" /> Bintang {hotelStar}
          </span>
          {remainingQuota && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {remainingQuota} seat
            </span>
          )}
        </div>

        {showFeatures && pkg.features && pkg.features.length > 0 && (
          <div className="mt-4 space-y-2">
            {pkg.features.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                {f}
              </div>
            ))}
          </div>
        )}

        {(pkg.airline || pkg.airport) && !showFeatures && (
          <div className="flex flex-wrap gap-2 mt-3">
            {pkg.airline && (
              <span className="text-xs bg-muted px-2 py-1 rounded flex items-center gap-1">
                <Plane className="w-3 h-3" /> {pkg.airline.name}
              </span>
            )}
            {pkg.airport && (
              <span className="text-xs bg-muted px-2 py-1 rounded flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {pkg.airport.city}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border flex items-end justify-between">
          <div>
            <span className="text-xs text-muted-foreground">Mulai dari</span>
            <div className="text-xl font-display font-bold text-foreground">
              Rp {lowestPrice.toLocaleString("id-ID")}
            </div>
          </div>
          <Link to={`/paket/${pkg.slug}`}>
            <Button
              size="sm"
              className={pkg.popular ? "gradient-gold text-primary" : "bg-primary text-primary-foreground hover:bg-primary/90"}
            >
              Detail
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default PackageCard;
