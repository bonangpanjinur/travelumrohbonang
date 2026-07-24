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
  ChevronRight,
  Ban,
} from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useCurrency } from "@/shared/hooks/useCurrency";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PackageCardData {
  id: string;
  title: string;
  slug: string;
  image_url?: string | null;
  duration_days?: number;
  package_type?: string | null;
  category?: { id: string; name: string } | null;
  /** Package-level fallback (pre-FASE-1 data) */
  hotel_makkah?: { star: number; name?: string } | null;
  airline?: { id: string; name: string } | null;
  airport?: { id: string; name: string; city?: string } | null;
  departures?: DepartureData[];
  lowestPrice?: number;
  hotelStar?: number;
  quota?: number;
  features?: string[];
  popular?: boolean;
}

interface DepartureData {
  id: string;
  departure_date: string;
  return_date?: string | null;
  quota: number | null;
  remaining_quota: number | null;
  status?: string | null;
  prices?: { price: number; room_type: string }[];
  hotel_makkah?: { star: number; name?: string } | null;
  hotel_madinah?: { star: number; name?: string } | null;
  airline?: { id: string; name: string } | null;
  departure_type?: string;
  flight_segments?: { airlineId: string | null; flightNumber: string | null }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Positive prices only — rejects price = 0 (e.g. "single" placeholder rows). */
function validPrices(dep: DepartureData): number[] {
  return (dep.prices ?? [])
    .map((p) => Number(p.price))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/** Cheapest room type label for a departure (for context next to price). */
function cheapestRoomLabel(dep: DepartureData): string {
  const valid = (dep.prices ?? []).filter(
    (p) => Number.isFinite(Number(p.price)) && Number(p.price) > 0,
  );
  if (!valid.length) return "";
  const min = Math.min(...valid.map((p) => Number(p.price)));
  const room = valid.find((p) => Number(p.price) === min)?.room_type ?? "";
  const labels: Record<string, string> = {
    quad: "Quad",
    triple: "Triple",
    double: "Double",
    single: "Single",
  };
  return labels[room.toLowerCase()] ?? room;
}

/**
 * Pick the reference departure for the card:
 *  - Prefer nearest upcoming departure (status != sold_out).
 *  - Fall back to nearest upcoming regardless of status.
 *  - Fall back to the most recent past departure (for packages with only past dates).
 *
 * A separate pass picks the departure with the global lowest VALID price.
 */
function pickReferenceDeparture(pkg: PackageCardData): DepartureData | null {
  const all = pkg.departures ?? [];
  if (!all.length) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = all
    .filter((d) => new Date(d.departure_date) >= today)
    .sort(
      (a, b) =>
        new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime(),
    );

  // Prefer upcoming with seats available
  const withSeats = upcoming.filter((d) => d.status !== "sold_out");
  if (withSeats.length) return withSeats[0];
  if (upcoming.length) return upcoming[0];

  // No upcoming → use most recent past departure
  return all.sort(
    (a, b) =>
      new Date(b.departure_date).getTime() - new Date(a.departure_date).getTime(),
  )[0];
}

/**
 * Scan ALL departures (past + future) to find the globally lowest valid price.
 * Returns { price, roomLabel, depId }.
 */
function globalLowestPrice(pkg: PackageCardData): {
  price: number;
  roomLabel: string;
} {
  let best = { price: 0, roomLabel: "" };
  for (const dep of pkg.departures ?? []) {
    const prices = validPrices(dep);
    if (!prices.length) continue;
    const min = Math.min(...prices);
    if (best.price === 0 || min < best.price) {
      best = { price: min, roomLabel: cheapestRoomLabel(dep) };
    }
  }
  // Package-level fallback
  if (best.price === 0 && pkg.lowestPrice && Number(pkg.lowestPrice) > 0) {
    best = { price: Number(pkg.lowestPrice), roomLabel: "" };
  }
  return best;
}

// ─── Seat status ─────────────────────────────────────────────────────────────

function seatStatus(remainingPct: number) {
  if (remainingPct <= 20)
    return {
      label: "Hampir Penuh",
      barColor: "bg-red-500",
      textColor: "text-red-500",
      badgeBg: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
      dotColor: "bg-red-500",
      dotPulse: true,
    } as const;
  if (remainingPct <= 50)
    return {
      label: "Mengisi Cepat",
      barColor: "bg-amber-500",
      textColor: "text-amber-600",
      badgeBg: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
      dotColor: "bg-amber-500",
      dotPulse: true,
    } as const;
  return {
    label: "Tersedia",
    barColor: "bg-emerald-500",
    textColor: "text-emerald-600",
    badgeBg:
      "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
    dotColor: "bg-emerald-500",
    dotPulse: false,
  } as const;
}

// ─── Star dots ────────────────────────────────────────────────────────────────

function StarDots({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: Math.min(5, Math.max(1, count)) }).map((_, i) => (
        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
      ))}
    </span>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface PackageCardProps {
  pkg: PackageCardData;
  index?: number;
  showFeatures?: boolean;
}

const PackageCard = ({ pkg, index = 0, showFeatures = false }: PackageCardProps) => {
  const { format: formatPrice } = useCurrency();

  const refDep = pickReferenceDeparture(pkg);
  const { price: lowestPrice, roomLabel } = globalLowestPrice(pkg);
  const hasDepartures = (pkg.departures?.length ?? 0) > 0;
  const isSoldOut = refDep?.status === "sold_out";

  /* Hotel & airline from reference departure → package-level fallback */
  const hotelMakkah = refDep?.hotel_makkah ?? pkg.hotel_makkah ?? null;
  const hotelMadinah = refDep?.hotel_madinah ?? null;
  const displayAirline = refDep?.airline ?? pkg.airline ?? null;
  const hotelStar = hotelMakkah?.star ?? pkg.hotelStar ?? 4;
  const categoryName = pkg.category?.name ?? pkg.package_type ?? "Reguler";

  /* Seat quota from reference departure */
  const quota = refDep?.quota ?? null;
  const remaining = refDep?.remaining_quota ?? null;
  const filled =
    quota !== null && remaining !== null ? Math.max(0, quota - remaining) : null;
  const filledPct =
    quota && filled !== null
      ? Math.max(0, Math.min(100, Math.round((filled / quota) * 100)))
      : null;
  const remainingPct =
    quota && remaining !== null
      ? Math.max(0, Math.min(100, Math.round((remaining / quota) * 100)))
      : null;

  const status = remainingPct !== null ? seatStatus(remainingPct) : null;
  const isAlmostFull = remainingPct !== null && remainingPct <= 20;

  /* Date display */
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const depDate = refDep ? new Date(refDep.departure_date) : null;
  const retDate = refDep?.return_date ? new Date(refDep.return_date) : null;
  const isPastDep = depDate ? depDate < today : false;
  const daysUntil =
    depDate && !isPastDep ? differenceInCalendarDays(depDate, today) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.45, ease: "easeOut" }}
      whileHover={{ y: -5 }}
      className={[
        "group relative rounded-3xl overflow-hidden bg-card border flex flex-col",
        "transition-all duration-300 hover:shadow-2xl",
        pkg.popular
          ? "border-amber-400/60 shadow-lg shadow-amber-400/10"
          : "border-border hover:border-amber-400/30",
      ].join(" ")}
    >
      {/* ── Badges ── */}
      <AnimatePresence>
        {pkg.popular && (
          <motion.div
            key="popular"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-4 right-4 z-20 bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md"
          >
            <Flame className="w-3 h-3" /> Terpopuler
          </motion.div>
        )}
        {isAlmostFull && !pkg.popular && (
          <motion.div
            key="almostfull"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [0.95, 1.05, 0.95] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="absolute top-4 right-4 z-20 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md"
          >
            <Flame className="w-3 h-3" /> Hampir Penuh!
          </motion.div>
        )}
        {isSoldOut && !isAlmostFull && !pkg.popular && (
          <motion.div
            key="soldout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-4 right-4 z-20 bg-gray-700 text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1"
          >
            <Ban className="w-3 h-3" /> Penuh
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero image ── */}
      <div className="relative h-48 overflow-hidden flex-shrink-0">
        <img
          src={
            pkg.image_url ||
            "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=600&q=80"
          }
          alt={pkg.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          decoding="async"
          width={600}
          height={400}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Category pill */}
        <div className="absolute bottom-3 left-4">
          <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
            {categoryName}
          </span>
        </div>

        {/* Date chip — shows range if return_date available */}
        {depDate && (
          <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md border border-white/20 text-white text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
            <span className="font-medium whitespace-nowrap">
              {format(depDate, "d MMM", { locale: idLocale })}
              {retDate && (
                <>
                  {" → "}
                  {format(retDate, "d MMM yyyy", { locale: idLocale })}
                </>
              )}
              {!retDate && format(depDate, " yyyy", { locale: idLocale })}
            </span>
          </div>
        )}

        {/* Past departure watermark */}
        {isPastDep && (
          <div className="absolute bottom-10 right-3 text-[10px] text-white/60 font-medium">
            Keberangkatan lalu
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        {/* Title + meta */}
        <div>
          <h3 className="text-base font-display font-bold text-foreground line-clamp-2 leading-snug group-hover:text-amber-600 transition-colors duration-200 min-h-[2.8rem]">
            {pkg.title}
          </h3>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              {pkg.duration_days || 9} Hari
            </span>
            {daysUntil !== null && daysUntil >= 0 && (
              <span className="flex items-center gap-1">
                <span className="text-amber-600 font-semibold">
                  {daysUntil === 0
                    ? "Hari ini!"
                    : `${daysUntil} hari lagi`}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* ── No departure state ── */}
        {!hasDepartures && (
          <div className="flex items-center gap-2 rounded-xl bg-muted/50 border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>Jadwal keberangkatan belum tersedia</span>
          </div>
        )}

        {/* ── Airline + Hotel info ── */}
        {hasDepartures && (
          <div className="space-y-2">
            {/* Airline */}
            {displayAirline ? (
              <div className="flex items-center gap-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 px-3 py-2">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center">
                  <Plane className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 -rotate-45" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Maskapai</p>
                  <p className="text-xs font-semibold text-sky-700 dark:text-sky-300 truncate">
                    {refDep?.departure_type === "transit" &&
                    (refDep.flight_segments?.length ?? 0) > 0
                      ? `${displayAirline.name} (Transit)`
                      : displayAirline.name}
                  </p>
                </div>
              </div>
            ) : (
              /* placeholder keeps card height stable */
              <div className="flex items-center gap-2.5 rounded-xl bg-muted/30 border border-dashed border-border/50 px-3 py-2 opacity-50">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                  <Plane className="w-3.5 h-3.5 text-muted-foreground -rotate-45" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Maskapai</p>
                  <p className="text-xs text-muted-foreground/60">Belum ditentukan</p>
                </div>
              </div>
            )}

            {/* Hotel Makkah */}
            {hotelMakkah?.name ? (
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
            ) : (
              <div className="flex items-center gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 px-3 py-2">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                  <Hotel className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Hotel Makkah</p>
                  <StarDots count={hotelStar} />
                </div>
              </div>
            )}

            {/* Hotel Madinah — only rendered if data exists */}
            {hotelMadinah && (
              <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 px-3 py-2">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                  <Hotel className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Hotel Madinah</p>
                  <div className="flex items-center justify-between gap-1">
                    {hotelMadinah.name && (
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 truncate">
                        {hotelMadinah.name}
                      </p>
                    )}
                    <StarDots count={hotelMadinah.star ?? 4} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Seat progress bar ── */}
        {filledPct !== null && status !== null && quota !== null && (
          <div className="rounded-xl bg-muted/40 border border-border px-3 py-2.5 space-y-2">
            {/* Row 1: "X / Y terisi" | badge | "Z%" */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                <Users className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-medium truncate">
                  <span className="text-foreground font-semibold">{filled}</span>
                  {" / "}
                  <span className="text-foreground font-semibold">{quota}</span>
                  {" terisi"}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={[
                    "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                    status.textColor,
                    status.badgeBg,
                  ].join(" ")}
                >
                  <span
                    className={[
                      "w-1.5 h-1.5 rounded-full",
                      status.dotColor,
                      status.dotPulse ? "animate-pulse" : "",
                    ].join(" ")}
                  />
                  {status.label}
                </span>
                <span className={`text-sm font-bold ${status.textColor}`}>
                  {filledPct}%
                </span>
              </div>
            </div>

            {/* Row 2: progress bar */}
            <div className="relative h-2.5 w-full rounded-full bg-border overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${status.barColor} relative overflow-hidden`}
                initial={{ width: 0 }}
                whileInView={{ width: `${filledPct}%` }}
                viewport={{ once: true }}
                transition={{
                  duration: 1.1,
                  ease: "easeOut",
                  delay: 0.15 + index * 0.08,
                }}
              >
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 2.5,
                    ease: "easeInOut",
                  }}
                />
              </motion.div>
            </div>

            {/* Row 3: "Sisa N kursi" */}
            <p className="text-[11px] text-muted-foreground">
              Sisa{" "}
              <span className={`font-bold ${status.textColor}`}>{remaining}</span>{" "}
              kursi
            </p>
          </div>
        )}

        {/* ── Features (optional mode) ── */}
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
            {lowestPrice > 0 ? (
              <>
                <p className="text-xl font-display font-extrabold text-foreground leading-tight">
                  {formatPrice(lowestPrice)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  / orang{roomLabel ? ` · ${roomLabel}` : ""}
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-display font-bold text-muted-foreground leading-tight">
                  Hubungi kami
                </p>
                <p className="text-[10px] text-muted-foreground">untuk harga terbaik</p>
              </>
            )}
          </div>

          <Link to={`/paket/${pkg.slug}`} aria-label={`Lihat detail paket ${pkg.title}`}>
            <Button
              size="sm"
              className={[
                "gap-1.5 min-h-[44px] px-4 font-semibold text-sm rounded-xl",
                "transition-all duration-300 group/btn hover:scale-105 hover:shadow-lg",
                pkg.popular
                  ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-white hover:shadow-amber-400/30"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/30",
              ].join(" ")}
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
