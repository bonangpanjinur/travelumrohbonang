import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/shared/components/ui/button";
import {
  Star,
  Calendar,
  Users,
  ArrowRight,
  Plane,
  Hotel,
  Flame,
  Clock,
  ChevronRight,
} from "lucide-react";
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
  hotel_makkah?: { star: number; name?: string } | null;
  airline?: { id: string; name: string } | null;
  airport?: { id: string; name: string; city?: string } | null;
  departures?: {
    id: string;
    departure_date: string;
    quota: number;
    remaining_quota: number;
    prices?: { price: number; room_type: string }[];
    hotel_makkah?: { star: number; name?: string } | null;
    hotel_madinah?: { star: number; name?: string } | null;
    airline?: { id: string; name: string } | null;
    departure_type?: string;
    flight_segments?: { airlineId: string | null; flightNumber: string | null }[];
  }[];
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

/** Pick the departure with the cheapest price among future departures */
function getCheapestDeparture(pkg: PackageCardData) {
  const future = (pkg.departures || []).filter(
    (d) => new Date(d.departure_date) >= new Date(),
  );
  if (future.length === 0) return null;

  return future.reduce(
    (best, dep) => {
      const minPrice = Math.min(
        ...(dep.prices?.map((p) => Number(p.price)).filter(Number.isFinite) ?? [Infinity]),
      );
      const bestPrice = Math.min(
        ...(best.prices?.map((p) => Number(p.price)).filter(Number.isFinite) ?? [Infinity]),
      );
      return minPrice < bestPrice ? dep : best;
    },
    future[0],
  );
}

type Departure = NonNullable<PackageCardData["departures"]>[number];

function getLowestPriceFromDep(dep: Departure | null): number {
  if (!dep?.prices?.length) return 0;
  const prices = dep.prices.map((p: { price: number; room_type: string }) => Number(p.price)).filter(Number.isFinite);
  return prices.length ? Math.min(...prices) : 0;
}

/* ── Seat bar helpers ─────────────────────────────────────────── */
function seatStatus(pct: number) {
  if (pct <= 20) return { label: "Hampir Penuh", color: "from-red-500 to-rose-600", text: "text-red-500", bg: "bg-red-50 dark:bg-red-950/30", dot: "bg-red-500" };
  if (pct <= 50) return { label: "Mengisi Cepat", color: "from-amber-400 to-orange-500", text: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", dot: "bg-amber-500" };
  return { label: "Tersedia", color: "from-emerald-400 to-teal-500", text: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", dot: "bg-emerald-500" };
}

/* ── Star dots ─────────────────────────────────────────────────── */
function StarDots({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[...Array(Math.min(5, count))].map((_, i) => (
        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
      ))}
    </span>
  );
}

const PackageCard = ({ pkg, index = 0, showFeatures = false }: PackageCardProps) => {
  const { format: formatPrice } = useCurrency();

  const cheapestDep = getCheapestDeparture(pkg);
  const lowestPrice =
    getLowestPriceFromDep(cheapestDep) ||
    (Number.isFinite(Number(pkg.lowestPrice)) ? Number(pkg.lowestPrice) : 0);

  /* hotel & airline from cheapest dep → fallback to package-level */
  const hotelMakkah = cheapestDep?.hotel_makkah ?? pkg.hotel_makkah ?? null;
  const hotelMadinah = cheapestDep?.hotel_madinah ?? null;
  const displayAirline = cheapestDep?.airline ?? pkg.airline ?? null;

  const categoryName = pkg.category?.name ?? pkg.package_type ?? "Reguler";
  const hotelStar = hotelMakkah?.star ?? pkg.hotelStar ?? 4;

  /* seat quota */
  const remaining = cheapestDep?.remaining_quota ?? pkg.quota ?? null;
  const total = cheapestDep?.quota ?? pkg.quota ?? null;
  const seatPct =
    total && remaining !== null
      ? Math.max(0, Math.min(100, Math.round((remaining / total) * 100)))
      : null;

  const status = seatPct !== null ? seatStatus(seatPct) : null;
  const isAlmostFull = seatPct !== null && seatPct <= 20;

  const daysToDep = cheapestDep
    ? differenceInCalendarDays(new Date(cheapestDep.departure_date), new Date())
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -6 }}
      className={`group relative rounded-3xl overflow-hidden bg-card border flex flex-col
        transition-all duration-300 hover:shadow-2xl
        ${pkg.popular
          ? "border-amber-400/60 shadow-lg shadow-amber-400/10"
          : "border-border hover:border-amber-400/30"
        }`}
    >
      {/* ── Popular / Almost full badge ── */}
      <AnimatePresence>
        {pkg.popular && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-4 right-4 z-20 bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md"
          >
            <Flame className="w-3 h-3" /> Terpopuler
          </motion.div>
        )}
        {isAlmostFull && !pkg.popular && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [0.95, 1.05, 0.95] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="absolute top-4 right-4 z-20 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md"
          >
            <Flame className="w-3 h-3" /> Hampir Penuh!
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero image ── */}
      <div className="relative h-48 overflow-hidden flex-shrink-0">
        <img
          src={pkg.image_url || "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=600&q=80"}
          alt={pkg.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          decoding="async"
          width={600}
          height={400}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Category pill */}
        <div className="absolute bottom-3 left-4">
          <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
            {categoryName}
          </span>
        </div>

        {/* Departure date chip */}
        {cheapestDep && (
          <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md border border-white/20 text-white text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-300" />
            <span className="font-medium">
              {format(new Date(cheapestDep.departure_date), "d MMM yyyy", { locale: idLocale })}
            </span>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 p-5 gap-4">
        {/* Title */}
        <div>
          <h3 className="text-base font-display font-bold text-foreground line-clamp-2 leading-snug group-hover:text-amber-600 transition-colors duration-200">
            {pkg.title}
          </h3>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              {pkg.duration_days || 9} Hari
            </span>
            {daysToDep !== null && daysToDep >= 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-amber-600 font-semibold">{daysToDep}h lagi</span>
              </span>
            )}
          </div>
        </div>

        {/* ── Airline + Hotel info ── */}
        <div className="space-y-2">
          {/* Airline row */}
          {displayAirline && (
            <div className="flex items-center gap-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 px-3 py-2">
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center">
                <Plane className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 -rotate-45" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Maskapai</p>
                <p className="text-xs font-semibold text-sky-700 dark:text-sky-300 truncate">
                  {cheapestDep?.departure_type === "transit" && cheapestDep.flight_segments?.length
                    ? `${displayAirline.name} (Transit)`
                    : displayAirline.name}
                </p>
              </div>
            </div>
          )}

          {/* Hotel row — Makkah */}
          {hotelMakkah?.name && (
            <div className="flex items-center gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 px-3 py-2">
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <Hotel className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Hotel Makkah</p>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 truncate">
                    {hotelMakkah.name}
                  </p>
                  <StarDots count={hotelStar} />
                </div>
              </div>
            </div>
          )}

          {/* Hotel row — Madinah */}
          {hotelMadinah?.name && (
            <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 px-3 py-2">
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <Hotel className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Hotel Madinah</p>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 truncate">
                    {hotelMadinah.name}
                  </p>
                  <StarDots count={hotelMadinah.star ?? 4} />
                </div>
              </div>
            </div>
          )}

          {/* Fallback: show hotel stars only (no name) */}
          {!hotelMakkah?.name && !hotelMadinah?.name && (
            <div className="flex items-center gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 px-3 py-2">
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <Hotel className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Hotel</p>
                <StarDots count={hotelStar} />
              </div>
            </div>
          )}
        </div>

        {/* ── Seat progress ── */}
        {seatPct !== null && status && (
          <div className={`rounded-xl ${status.bg} border border-current/10 px-3 py-2.5`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span>Ketersediaan Seat</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse`} />
                <span className={`text-[11px] font-bold ${status.text}`}>{status.label}</span>
              </div>
            </div>

            {/* Custom gradient progress bar */}
            <div className="relative h-2.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${status.color} relative`}
                initial={{ width: 0 }}
                whileInView={{ width: `${seatPct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 + index * 0.08 }}
              >
                {/* Shimmer */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
                />
              </motion.div>
            </div>

            <div className="flex items-center justify-between mt-1.5">
              <span className={`text-[11px] font-bold ${status.text}`}>
                {remaining} seat tersisa
              </span>
              <span className="text-[10px] text-muted-foreground">dari {total} seat</span>
            </div>
          </div>
        )}

        {/* ── Features (optional) ── */}
        {showFeatures && pkg.features && pkg.features.length > 0 && (
          <div className="space-y-1.5">
            {pkg.features.map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                <ChevronRight className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        )}

        {/* ── Price + CTA ── */}
        <div className="mt-auto pt-3 border-t border-border/60 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
              Mulai dari
            </p>
            <motion.p
              className="text-xl font-display font-extrabold text-foreground leading-tight"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              {formatPrice(lowestPrice)}
            </motion.p>
            <p className="text-[10px] text-muted-foreground">/ orang</p>
          </div>

          <Link to={`/paket/${pkg.slug}`} aria-label={`Lihat detail paket ${pkg.title}`}>
            <Button
              size="sm"
              className={`gap-1.5 min-h-[44px] px-4 font-semibold text-sm rounded-xl transition-all duration-300
                group/btn hover:scale-105 hover:shadow-lg
                ${pkg.popular
                  ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-white hover:shadow-amber-400/30"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/30"
                }`}
            >
              Detail
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default PackageCard;
