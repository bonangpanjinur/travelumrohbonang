import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { Star, Calendar, Users, ArrowRight, Plane, MapPin, Flame, Clock } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useCurrency } from "@/shared/hooks/useCurrency";

export interface PackageCardData {
  id: string;
  title: string;
  slug: string;
  image_url?: string | null;
  duration_days?: number;
  package_type?: string | null;
  category?: { id: string; name: string } | null;
  // hotel_makkah kept for backward compat with static/preview data
  hotel_makkah?: { star: number; name?: string } | null;
  airline?: { id: string; name: string } | null;
  airport?: { id: string; name: string; city?: string } | null;
  departures?: {
    id: string;
    departure_date: string;
    remaining_quota: number;
    prices?: { price: number; room_type: string }[];
    // FASE 3.4: hotel & airline are now per-departure
    hotel_makkah?: { star: number; name?: string } | null;
    airline?: { id: string; name: string } | null;
    departure_type?: string;
    flight_segments?: { airlineId: string | null; flightNumber: string | null }[];
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
  const { format: formatPrice } = useCurrency();
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

  // FASE 4: hotel star derived from nearest departure first, then package-level fallback
  const hotelStar =
    nextDep?.hotel_makkah?.star ??
    pkg.hotel_makkah?.star ??
    pkg.hotelStar ??
    4;

  // FASE 4: airline from nearest departure first, then package-level fallback
  const displayAirline = nextDep?.airline ?? pkg.airline ?? null;

  const categoryName = pkg.category?.name || pkg.package_type || "Reguler";
  const remainingQuota = nextDep?.remaining_quota ?? pkg.quota;
  const totalQuota = pkg.quota || remainingQuota;
  const seatPercent =
    totalQuota && remainingQuota !== undefined
      ? Math.max(0, Math.min(100, Math.round((remainingQuota / totalQuota) * 100)))
      : null;
  const isAlmostFull = seatPercent !== null && seatPercent <= 25;
  const isFillingUp = seatPercent !== null && seatPercent > 25 && seatPercent <= 50;
  const seatBarColor = isAlmostFull ? "bg-destructive" : isFillingUp ? "bg-gold" : "bg-emerald-500";
  const daysToDeparture = nextDep ? differenceInCalendarDays(new Date(nextDep.departure_date), new Date()) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -6 }}
      className={`group relative rounded-2xl overflow-hidden bg-card border transition-shadow duration-300 hover:shadow-xl ${
        pkg.popular ? "border-gold shadow-lg shadow-gold/10" : "border-border hover:border-gold/30"
      }`}
    >
      {pkg.popular && (
        <div className="absolute top-4 right-4 z-10 gradient-gold text-primary text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
          <Flame className="w-3 h-3" /> Terpopuler
        </div>
      )}

      {isAlmostFull && !pkg.popular && (
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="absolute top-4 right-4 z-10 bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"
        >
          <Flame className="w-3 h-3" /> Hampir Penuh
        </motion.div>
      )}

      <div className="relative h-48 overflow-hidden">
        <img
          src={pkg.image_url || "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=600&q=80"}
          alt={`${pkg.title} - paket umroh ${categoryName}`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          decoding="async"
          width={600}
          height={400}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
        <div className="absolute bottom-3 left-4">
          <span className="bg-primary/90 text-primary-foreground text-xs px-3 py-1 rounded-full">
            {categoryName}
          </span>
        </div>
        {nextDep && (
          <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(nextDep.departure_date), "d MMM", { locale: idLocale })}
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="text-lg font-display font-bold text-foreground line-clamp-1 transition-colors group-hover:text-gold">
          {pkg.title}
        </h3>

        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> {pkg.duration_days || 9} Hari
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5" /> Bintang {hotelStar}
          </span>
          {daysToDeparture !== null && daysToDeparture >= 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {daysToDeparture} hari lagi
            </span>
          )}
        </div>

        {seatPercent !== null && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Users className="w-3.5 h-3.5" /> Sisa kuota seat
              </span>
              <span
                className={`font-semibold ${
                  isAlmostFull ? "text-destructive" : isFillingUp ? "text-gold" : "text-emerald-600"
                }`}
              >
                {remainingQuota} / {totalQuota} seat
              </span>
            </div>
            <Progress
              value={seatPercent}
              className="h-2"
              indicatorClassName={seatBarColor}
            />
          </div>
        )}

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

        {(displayAirline || pkg.airport) && !showFeatures && (
          <div className="flex flex-wrap gap-2 mt-3">
            {nextDep?.departure_type === "transit" && nextDep.flight_segments && nextDep.flight_segments.length > 0 ? (
              <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-1 rounded flex items-center gap-1">
                <Plane className="w-3 h-3" /> Transit ({nextDep.flight_segments.length}x)
              </span>
            ) : displayAirline ? (
              <span className="text-xs bg-muted px-2 py-1 rounded flex items-center gap-1">
                <Plane className="w-3 h-3" /> {displayAirline.name}
              </span>
            ) : null}
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
              {formatPrice(lowestPrice)}
            </div>
          </div>
          <Link to={`/paket/${pkg.slug}`} aria-label={`Lihat detail paket ${pkg.title}`}>
            <Button
              size="sm"
              className={`group/btn transition-transform duration-300 hover:scale-105 min-h-[44px] ${
                pkg.popular ? "gradient-gold text-primary" : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              Detail
              <ArrowRight className="w-4 h-4 ml-1 transition-transform duration-300 group-hover/btn:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default PackageCard;
