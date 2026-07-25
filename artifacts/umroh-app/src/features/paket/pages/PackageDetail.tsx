import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiFetch } from "@/shared/lib/apiClient";
import { useAuth } from "@/shared/hooks/useAuth";
import Navbar from "@/shared/components/layout/Navbar";
import Footer from "@/shared/components/layout/Footer";
import { Button } from "@/shared/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Star, Users, Plane, Hotel, MapPin, ArrowRight,
  Check, BookOpen, ChevronDown, ChevronUp, Images, X,
  ChevronLeft, ChevronRight, ArrowLeft, Shield,
  Package, FileCheck, UtensilsCrossed, GraduationCap,
  BadgeCheck, Clock,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import SEO from "@/shared/components/seo/SEO";
import BreadcrumbJsonLd from "@/shared/components/seo/BreadcrumbJsonLd";
import ProductJsonLd from "@/shared/components/seo/ProductJsonLd";
import WishlistButton from "@/features/paket/components/WishlistButton";
import PackageReviews from "@/features/paket/components/PackageReviews";
import InstallmentCalculator from "@/features/booking/components/InstallmentCalculator";
import StickyMobileCTA from "@/shared/components/layout/StickyMobileCTA";
import PageFAQ from "@/features/cms/components/PageFAQ";
import RelatedPackages from "@/features/paket/components/RelatedPackages";
import RelatedArticles from "@/features/cms/components/RelatedArticles";
import { lookupSlugRedirect, buildRedirectPath } from "@/features/cms/lib/slugRedirect";
import { useTenant } from "@/shared/hooks/useTenant";
import PromoPdfButton from "@/features/cms/components/PromoPdfButton";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { getAppOrigin } from "@/shared/lib/env";

interface Package {
  id: string;
  title: string;
  slug: string;
  description: string;
  package_type: string;
  image_url: string;
  duration_days: number;
  category_id: string | null;
  category: { name: string } | null;
  departures: Departure[];
}

interface ExtraHotel {
  id: string;
  label: string;
  hotel: { name: string; star: number; city: string | null } | null;
}

interface Departure {
  id: string;
  departure_date: string;
  return_date: string;
  quota: number;
  remaining_quota: number;
  status: string | null;
  hotel_makkah: { name: string; star: number } | null;
  hotel_madinah: { name: string; star: number } | null;
  airline: { name: string; code?: string | null } | null;
  extra_hotels?: ExtraHotel[];
  prices: { room_type: string; price: number }[];
  departure_type?: string;
  flight_segments?: { airlineId: string | null; airlineName?: string | null; flightNumber: string | null }[];
}

interface ItineraryDay {
  id: string;
  day_number: number;
  title: string | null;
  description: string | null;
  image_url: string | null;
}

interface Itinerary {
  id: string;
  title: string | null;
  notes: string | null;
  days: ItineraryDay[];
}

// ── Facilities definition ────────────────────────────────────────────────────
const FACILITIES = [
  { icon: Plane,           label: "Tiket Pesawat PP" },
  { icon: Hotel,           label: "Hotel Dekat Masjidil Haram" },
  { icon: UtensilsCrossed, label: "Makan 3x Sehari" },
  { icon: Users,           label: "Muthawif Berpengalaman" },
  { icon: FileCheck,       label: "Visa Umroh" },
  { icon: Package,         label: "Perlengkapan Umroh" },
  { icon: GraduationCap,   label: "Manasik Umroh" },
  { icon: Shield,          label: "Asuransi Perjalanan" },
];

// ── Section title component ─────────────────────────────────────────────────
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="w-1 h-7 bg-gold rounded-full flex-shrink-0" />
    <h2 className="text-2xl font-display font-bold">{children}</h2>
  </div>
);

const PackageDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { format: formatPrice } = useCurrency();
  const [pkg, setPkg] = useState<Package | null>(null);
  const [selectedDeparture, setSelectedDeparture] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [gallery, setGallery] = useState<{ id: string; image_url: string; caption: string | null }[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const fetchPackage = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const data: Package = await apiFetch(`/api/packages/${encodeURIComponent(slug)}`);
        setPkg(data);
        const firstAvailable = data.departures?.find((d) => d.remaining_quota > 0);
        if (firstAvailable) {
          setSelectedDeparture(firstAvailable.id);
        } else if (data.departures?.length) {
          setSelectedDeparture(data.departures[0].id);
        }
      } catch (err: any) {
        if (err?.status === 404 || err?.message?.includes("404")) {
          const redirectTo = await lookupSlugRedirect("package", slug, tenant?.id);
          if (redirectTo) {
            navigate(buildRedirectPath("package", redirectTo), { replace: true });
            return;
          }
        } else {
          console.error("[PackageDetail] failed to fetch package by slug:", slug, err);
          setFetchError(err?.message ?? "Unknown error");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPackage();
  }, [slug, tenant?.id, navigate]);

  useEffect(() => {
    if (!selectedDeparture) { setItinerary(null); return; }
    const fetchItinerary = async () => {
      setItineraryLoading(true);
      try {
        const data = await apiFetch(`/api/packages/itinerary/${encodeURIComponent(selectedDeparture)}`) as any;
        setItinerary(data?.itinerary ?? null);
        if (data?.itinerary?.days?.length) setExpandedDay(data.itinerary.days[0].id);
      } catch { setItinerary(null); }
      finally { setItineraryLoading(false); }
    };
    fetchItinerary();
  }, [selectedDeparture]);

  useEffect(() => {
    if (!pkg?.id) return;
    apiFetch<{ data: { id: string; image_url: string; caption: string | null }[] }>(
      `/api/packages/gallery/by-package/${encodeURIComponent(pkg.id)}`,
    ).then((res) => setGallery(res.data ?? [])).catch(() => setGallery([]));
  }, [pkg?.id]);

  const handleBookNow = () => {
    if (!user) { navigate("/auth"); return; }
    if (!selectedDeparture) return;
    navigate(`/booking/${slug}/${selectedDeparture}`);
  };

  const getLowestPrice = (prices: { room_type: string; price: number }[]) => {
    if (!prices || prices.length === 0) return 0;
    const validPrices = prices.filter((p) => p.price > 0);
    if (validPrices.length === 0) return 0;
    return Math.min(...validPrices.map((p) => p.price));
  };

  const departures = pkg?.departures ?? [];
  const selectedDep = departures.find((d) => d.id === selectedDeparture);
  const displayHotelStar = selectedDep?.hotel_makkah?.star ?? (departures[0]?.hotel_makkah?.star ?? 4);
  const displayAirline = selectedDep?.airline?.name ?? departures[0]?.airline?.name ?? "TBA";
  const extraHotels = selectedDep?.extra_hotels ?? [];

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-20">
          <div className="relative h-[65vh] bg-muted animate-pulse" />
          <div className="container-custom section-padding">
            <div className="grid lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <div className="h-7 bg-muted animate-pulse rounded w-40" />
                    <div className="h-4 bg-muted animate-pulse rounded w-full" />
                    <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
                  </div>
                ))}
              </div>
              <div className="lg:col-span-1">
                <div className="bg-muted animate-pulse rounded-2xl h-96" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Error / 404 ───────────────────────────────────────────────────────────
  if (!pkg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">
          {fetchError ? "Gagal memuat paket" : "Paket tidak ditemukan"}
        </h1>
        {fetchError && (
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            Terjadi kendala teknis. Coba muat ulang halaman, atau hubungi admin jika masalah berlanjut.
          </p>
        )}
        <Link to="/paket"><Button>Lihat Semua Paket</Button></Link>
      </div>
    );
  }

  // ── Derived helpers ───────────────────────────────────────────────────────
  const descText = pkg.description || "Paket umroh terbaik dengan pelayanan premium dan bimbingan ibadah lengkap.";
  const descLong = descText.length > 300;

  // Gallery layout helpers
  const GALLERY_PREVIEW = 5; // max shown before "+N" overlay
  const galleryVisible = gallery.slice(0, GALLERY_PREVIEW);
  const galleryExtra = gallery.length - GALLERY_PREVIEW;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={pkg.title}
        description={pkg.description || `Paket ${pkg.title} dengan pelayanan premium dan bimbingan ibadah lengkap.`}
        image={pkg.image_url}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Beranda", url: "/" },
          { name: "Paket", url: "/paket" },
          { name: pkg.title, url: `/paket/${pkg.id}` },
        ]}
      />
      <ProductJsonLd
        name={pkg.title}
        description={pkg.description || `Paket ${pkg.title} dengan pelayanan premium dan bimbingan ibadah lengkap.`}
        image={pkg.image_url}
        sku={pkg.id}
        price={departures.length ? Math.min(...departures.flatMap((d) => d.prices.map((p) => p.price))) : undefined}
        currency="IDR"
        availability={departures.some((d) => d.remaining_quota > 0) ? "InStock" : "SoldOut"}
        validFrom={departures[0]?.departure_date}
        validThrough={departures[departures.length - 1]?.return_date}
        url={typeof window !== "undefined" ? window.location.href : `${getAppOrigin()}/paket/${slug}`}
      />
      <Navbar />

      <main>
        {/* ══ HERO ══════════════════════════════════════════════════════════ */}
        <div className="relative h-[65vh] min-h-[480px] overflow-hidden">
          {/* Background image */}
          <img
            src={pkg.image_url || "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1400&q=80"}
            alt={pkg.title}
            className="w-full h-full object-cover scale-105"
            fetchPriority="high"
            decoding="async"
          />
          {/* Gradient layers */}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-transparent" />

          {/* Back link */}
          <div className="absolute top-24 left-0 right-0">
            <div className="container-custom">
              <Link
                to="/paket"
                className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm font-medium backdrop-blur-sm bg-white/10 px-3 py-1.5 rounded-full border border-white/20"
              >
                <ArrowLeft className="w-4 h-4" />
                Semua Paket
              </Link>
            </div>
          </div>

          {/* Hero content */}
          <div className="absolute bottom-0 left-0 right-0 pb-8 pt-16">
            <div className="container-custom">
              <div className="flex items-end justify-between gap-4">
                <div className="flex-1">
                  {/* Category badge */}
                  <span className="inline-block bg-gold text-primary text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
                    {pkg.category?.name || pkg.package_type}
                  </span>
                  <h1 className="text-3xl md:text-5xl font-display font-bold text-white leading-tight mb-4">
                    {pkg.title}
                  </h1>
                  {/* Quick-stat chips */}
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs px-3 py-1.5 rounded-full">
                      <Clock className="w-3.5 h-3.5 text-gold" />
                      {pkg.duration_days} Hari
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs px-3 py-1.5 rounded-full">
                      <Star className="w-3.5 h-3.5 text-gold fill-gold" />
                      Bintang {displayHotelStar}
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs px-3 py-1.5 rounded-full">
                      <Plane className="w-3.5 h-3.5 text-gold" />
                      {selectedDep?.departure_type === "transit" ? "Penerbangan Transit" : displayAirline}
                    </span>
                    {departures.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs px-3 py-1.5 rounded-full">
                        <Calendar className="w-3.5 h-3.5 text-gold" />
                        {departures.length} Jadwal Tersedia
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <WishlistButton packageId={pkg.id} variant="outline" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ MAIN CONTENT ══════════════════════════════════════════════════ */}
        <div className="container-custom section-padding">
          <div className="grid lg:grid-cols-3 gap-10 xl:gap-14">

            {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-10">

              {/* Description */}
              <section>
                <SectionTitle>Tentang Paket</SectionTitle>
                <div className="relative">
                  <p className={`text-muted-foreground leading-relaxed ${!descExpanded && descLong ? "line-clamp-4" : ""}`}>
                    {descText}
                  </p>
                  {descLong && (
                    <button
                      onClick={() => setDescExpanded((v) => !v)}
                      className="mt-2 text-sm font-medium text-gold hover:underline flex items-center gap-1"
                    >
                      {descExpanded ? "Lebih sedikit" : "Baca selengkapnya"}
                      {descExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </section>

              {/* Accommodation */}
              <section>
                <SectionTitle>Akomodasi</SectionTitle>
                {selectedDep ? (
                  (selectedDep.hotel_makkah || selectedDep.hotel_madinah || extraHotels.length > 0) ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {selectedDep.hotel_makkah && (
                        <HotelCard
                          title="Hotel Makkah"
                          name={selectedDep.hotel_makkah.name}
                          star={selectedDep.hotel_makkah.star}
                        />
                      )}
                      {selectedDep.hotel_madinah && (
                        <HotelCard
                          title="Hotel Madinah"
                          name={selectedDep.hotel_madinah.name}
                          star={selectedDep.hotel_madinah.star}
                        />
                      )}
                      {extraHotels.map((eh) => (
                        <HotelCard
                          key={eh.id}
                          title={eh.label || `Hotel ${eh.hotel?.city || "Tambahan"}`}
                          name={eh.hotel?.name || "Hotel"}
                          star={eh.hotel?.star}
                          city={eh.hotel?.city ?? undefined}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Hotel untuk keberangkatan ini belum ditentukan.</p>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground italic">Pilih keberangkatan di samping untuk melihat informasi hotel.</p>
                )}
              </section>

              {/* Gallery */}
              {gallery.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-7 bg-gold rounded-full flex-shrink-0" />
                      <h2 className="text-2xl font-display font-bold">Galeri Foto</h2>
                    </div>
                    {gallery.length > GALLERY_PREVIEW && (
                      <button
                        onClick={() => setLightboxIdx(0)}
                        className="text-sm text-gold font-medium hover:underline flex items-center gap-1"
                      >
                        <Images className="w-4 h-4" />
                        Lihat semua ({gallery.length})
                      </button>
                    )}
                  </div>

                  {/* Featured layout */}
                  {gallery.length === 1 ? (
                    <button
                      onClick={() => setLightboxIdx(0)}
                      className="w-full overflow-hidden rounded-2xl aspect-video bg-muted border border-border group"
                    >
                      <img
                        src={gallery[0].image_url}
                        alt={gallery[0].caption || "Foto paket"}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
                      />
                    </button>
                  ) : (
                    <div className={`grid gap-2 ${gallery.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                      {/* Featured first photo */}
                      <button
                        onClick={() => setLightboxIdx(0)}
                        className={`relative overflow-hidden rounded-2xl bg-muted border border-border group ${gallery.length >= 3 ? "row-span-2 col-span-2" : ""}`}
                        style={{ aspectRatio: gallery.length >= 3 ? "auto" : "1" }}
                      >
                        {gallery.length >= 3 && <div className="absolute inset-0" style={{ paddingBottom: "calc(200% / 2 + 4px)" }} />}
                        <img
                          src={gallery[0].image_url}
                          alt={gallery[0].caption || "Foto 1"}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                          <Images className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {gallery[0].caption && (
                          <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
                            <p className="text-white text-xs truncate">{gallery[0].caption}</p>
                          </div>
                        )}
                      </button>

                      {/* Thumbnail photos */}
                      {galleryVisible.slice(1).map((item, idx) => {
                        const realIdx = idx + 1;
                        const isLast = realIdx === galleryVisible.length - 1 && galleryExtra > 0;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setLightboxIdx(realIdx)}
                            className="relative overflow-hidden rounded-2xl aspect-square bg-muted border border-border group"
                          >
                            <img
                              src={item.image_url}
                              alt={item.caption || `Foto ${realIdx + 1}`}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                            {isLast ? (
                              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1">
                                <Images className="w-6 h-6 text-white" />
                                <span className="text-white font-bold text-lg">+{galleryExtra}</span>
                                <span className="text-white/70 text-xs">foto lainnya</span>
                              </div>
                            ) : (
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200" />
                            )}
                            {item.caption && !isLast && (
                              <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/70 to-transparent">
                                <p className="text-white text-[10px] truncate">{item.caption}</p>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* Itinerary */}
              <section>
                <SectionTitle>Program Perjalanan</SectionTitle>
                {selectedDeparture ? (
                  <>
                    {selectedDep && (
                      <p className="text-sm text-muted-foreground mb-5 -mt-2">
                        Itinerary untuk keberangkatan{" "}
                        <span className="font-semibold text-foreground">
                          {format(new Date(selectedDep.departure_date), "d MMMM yyyy", { locale: localeId })}
                        </span>
                      </p>
                    )}
                    {itineraryLoading ? (
                      <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="bg-muted animate-pulse rounded-xl h-16" />
                        ))}
                      </div>
                    ) : itinerary && itinerary.days.length > 0 ? (
                      <div>
                        {itinerary.title && (
                          <p className="text-sm font-medium text-gold mb-4">{itinerary.title}</p>
                        )}
                        {/* Timeline */}
                        <div className="relative">
                          {/* Vertical line */}
                          <div className="absolute left-[19px] top-6 bottom-6 w-px bg-border" />
                          <div className="space-y-2">
                            {itinerary.days.map((day, idx) => {
                              const isOpen = expandedDay === day.id;
                              return (
                                <motion.div key={day.id} initial={false} className="relative pl-11">
                                  {/* Circle */}
                                  <div className={`absolute left-0 top-3.5 w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 bg-background transition-all ${isOpen ? "border-gold bg-gold/10" : "border-border"}`}>
                                    <span className={`text-xs font-bold transition-colors ${isOpen ? "text-gold" : "text-muted-foreground"}`}>{day.day_number}</span>
                                  </div>
                                  <div className={`border rounded-xl overflow-hidden transition-colors ${isOpen ? "border-gold/30 bg-gold/5" : "border-border bg-card"}`}>
                                    <button
                                      onClick={() => setExpandedDay(isOpen ? null : day.id)}
                                      className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
                                    >
                                      <span className={`font-semibold text-sm ${isOpen ? "text-foreground" : ""}`}>
                                        Hari {day.day_number}{day.title ? ` — ${day.title}` : ""}
                                      </span>
                                      {isOpen
                                        ? <ChevronUp className="w-4 h-4 text-gold flex-shrink-0" />
                                        : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                                    </button>
                                    <AnimatePresence initial={false}>
                                      {isOpen && (
                                        <motion.div
                                          key="content"
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: "auto", opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.25, ease: "easeInOut" }}
                                          className="overflow-hidden"
                                        >
                                          <div className="px-4 pb-4 pt-1">
                                            {day.image_url && (
                                              <img
                                                src={day.image_url}
                                                alt={day.title || `Hari ${day.day_number}`}
                                                className="w-full h-44 object-cover rounded-lg mb-3"
                                              />
                                            )}
                                            {day.description ? (
                                              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                                                {day.description}
                                              </p>
                                            ) : (
                                              <p className="text-sm text-muted-foreground italic">Detail program hari ini belum tersedia.</p>
                                            )}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                        {itinerary.notes && (
                          <p className="text-xs text-muted-foreground mt-4 italic pl-11">{itinerary.notes}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-2xl bg-muted/30">
                        <BookOpen className="w-10 h-10 text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">Program perjalanan untuk keberangkatan ini belum tersedia.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-2xl bg-muted/30">
                    <BookOpen className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Pilih keberangkatan di samping untuk melihat program perjalanan.</p>
                  </div>
                )}
              </section>

              {/* Facilities */}
              <section>
                <SectionTitle>Fasilitas Termasuk</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {FACILITIES.map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center gap-2 text-center p-4 rounded-xl bg-card border border-border hover:border-gold/40 hover:bg-gold/5 transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gold" />
                      </div>
                      <span className="text-xs font-medium leading-snug">{label}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Installment Calculator */}
              <section>
                <InstallmentCalculator
                  defaultPrice={departures.length ? Math.min(...departures.flatMap((d) => d.prices.map((p) => p.price))) : 30_000_000}
                />
              </section>

              {/* Reviews */}
              <PackageReviews packageId={pkg.id} packageTitle={pkg.title} />
            </div>

            {/* ── RIGHT COLUMN — Sticky Booking Sidebar ───────────────────── */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                {/* Booking card */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
                  {/* Price header */}
                  {selectedDep && (
                    <div className="gradient-gold px-5 py-4">
                      <div className="text-primary/70 text-xs font-medium mb-0.5">Harga mulai dari</div>
                      <div className="text-2xl font-display font-bold text-primary">
                        {formatPrice(getLowestPrice(selectedDep.prices))}
                      </div>
                      <div className="text-primary/60 text-xs">per orang (Quad)</div>
                    </div>
                  )}

                  <div className="p-5 space-y-4">
                    {/* Departure selector */}
                    <div>
                      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gold" />
                        Pilih Keberangkatan
                      </p>
                      {departures.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Belum ada jadwal keberangkatan tersedia.</p>
                      ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1 -mr-1">
                          {departures.map((dep) => {
                            const isSelected = selectedDeparture === dep.id;
                            const isSoldOut = dep.remaining_quota === 0;
                            return (
                              <button
                                key={dep.id}
                                onClick={() => !isSoldOut && setSelectedDeparture(dep.id)}
                                disabled={isSoldOut}
                                className={`w-full text-left p-3 rounded-xl border transition-all ${
                                  isSelected
                                    ? "border-gold bg-gold/10 shadow-sm"
                                    : isSoldOut
                                      ? "border-border bg-muted/50 opacity-50 cursor-not-allowed"
                                      : "border-border hover:border-gold/50 hover:bg-muted/50"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className={`font-semibold text-sm ${isSelected ? "text-foreground" : ""}`}>
                                      {format(new Date(dep.departure_date), "d MMM yyyy", { locale: localeId })}
                                    </div>
                                    <div className={`text-xs mt-0.5 ${isSoldOut ? "text-destructive" : "text-muted-foreground"}`}>
                                      {isSoldOut ? "Habis" : `Sisa ${dep.remaining_quota} kursi`}
                                    </div>
                                    {dep.departure_type === "transit" ? (
                                      <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                                        <Plane className="w-3 h-3" />
                                        <span>Transit</span>
                                      </div>
                                    ) : dep.airline ? (
                                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                        <Plane className="w-3 h-3" />
                                        <span className="truncate">{dep.airline.name}</span>
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className={`text-xs font-bold flex-shrink-0 mt-0.5 ${isSelected ? "text-gold" : "text-muted-foreground"}`}>
                                    {formatPrice(getLowestPrice(dep.prices))}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="space-y-2 pt-1">
                      <Button
                        onClick={handleBookNow}
                        disabled={!selectedDeparture}
                        className="w-full gradient-gold text-primary font-bold h-11 text-base"
                      >
                        {user ? "Booking Sekarang" : "Login untuk Booking"}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <PromoPdfButton
                        packageData={{
                          title: pkg.title,
                          image_url: pkg.image_url,
                          description: pkg.description,
                          duration_days: pkg.duration_days,
                          hotel_makkah: selectedDep?.hotel_makkah?.name ?? departures[0]?.hotel_makkah?.name,
                          hotel_madinah: selectedDep?.hotel_madinah?.name ?? departures[0]?.hotel_madinah?.name,
                          startPrice: selectedDep
                            ? getLowestPrice(selectedDep.prices)
                            : departures[0] ? getLowestPrice(departures[0].prices) : 0,
                        }}
                      />
                    </div>

                    {/* Trust badges */}
                    <div className="border-t border-border pt-4 grid grid-cols-3 gap-2 text-center">
                      {[
                        { icon: BadgeCheck, label: "Terpercaya" },
                        { icon: Shield,     label: "Bergaransi" },
                        { icon: Users,      label: "10.000+ Jamaah" },
                      ].map(({ icon: Icon, label }) => (
                        <div key={label} className="flex flex-col items-center gap-1">
                          <Icon className="w-4 h-4 text-gold" />
                          <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick info summary card */}
                <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ringkasan Paket</p>
                  {[
                    { icon: Clock,  label: "Durasi",      value: `${pkg.duration_days} Hari` },
                    { icon: Star,   label: "Hotel",       value: `Bintang ${displayHotelStar}` },
                    { icon: Plane,  label: "Maskapai",    value: selectedDep?.departure_type === "transit" ? "Transit" : displayAirline },
                    { icon: Calendar, label: "Jadwal",    value: `${departures.length} keberangkatan` },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Icon className="w-4 h-4 text-gold flex-shrink-0" />
                        {label}
                      </div>
                      <span className="font-semibold text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── BELOW-FOLD SECTIONS ═══════════════════════════════════════════ */}
        <PageFAQ
          scopes={["package"]}
          packageId={pkg.id}
          title={`FAQ ${pkg.title}`}
          description="Pertanyaan jamaah tentang paket ini: jadwal, fasilitas, hotel, hingga pembayaran."
        />
        <RelatedPackages
          excludeId={pkg.id}
          categoryId={pkg.category_id}
          heading={`Paket ${pkg.category?.name || "Umroh"} Lainnya`}
          intro={`Bandingkan dengan paket ${pkg.category?.name || "umroh"} lain dari kami: hotel, maskapai, dan jadwal keberangkatan yang fleksibel.`}
        />
        <RelatedArticles
          category={pkg.category?.name || null}
          heading="Panduan & Artikel Umroh Terkait"
          intro="Pelajari tips persiapan, tata cara, dan informasi penting sebelum berangkat umroh."
        />
      </main>

      {/* ══ LIGHTBOX ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {lightboxIdx !== null && gallery.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setLightboxIdx(null)}
          >
            {/* Close */}
            <button
              onClick={() => setLightboxIdx(null)}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full p-2"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/50 text-sm font-medium">
              {lightboxIdx + 1} / {gallery.length}
            </div>

            {/* Prev */}
            {gallery.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((i) => (i! - 1 + gallery.length) % gallery.length);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Image */}
            <motion.div
              key={lightboxIdx}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-5xl w-full max-h-[85vh] flex flex-col items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={gallery[lightboxIdx].image_url}
                alt={gallery[lightboxIdx].caption || `Foto ${lightboxIdx + 1}`}
                className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl"
              />
              {gallery[lightboxIdx].caption && (
                <p className="text-white/70 text-sm text-center">{gallery[lightboxIdx].caption}</p>
              )}
            </motion.div>

            {/* Next */}
            {gallery.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((i) => (i! + 1) % gallery.length);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Thumbnail strip */}
            {gallery.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-xs overflow-x-auto px-2">
                {gallery.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); setLightboxIdx(idx); }}
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all ${idx === lightboxIdx ? "bg-gold w-4" : "bg-white/30 hover:bg-white/60"}`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <StickyMobileCTA
        price={selectedDep ? getLowestPrice(selectedDep.prices) : (departures[0] ? getLowestPrice(departures[0].prices) : undefined)}
        onBook={handleBookNow}
        disabled={!selectedDeparture}
      />
      <Footer />
    </div>
  );
};

// ── HotelCard subcomponent ───────────────────────────────────────────────────
const HotelCard = ({
  title, name, star, city,
}: {
  title: string;
  name: string;
  star?: number;
  city?: string;
}) => (
  <div className="flex gap-4 p-4 bg-card border border-border rounded-xl hover:border-gold/30 hover:shadow-sm transition-all">
    <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
      <Hotel className="w-5 h-5 text-gold" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">{title}</div>
      <div className="font-semibold text-sm leading-snug truncate">{name}</div>
      {city && (
        <div className="flex items-center gap-1 mt-1">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{city}</span>
        </div>
      )}
      {star && (
        <div className="flex gap-0.5 mt-1.5">
          {[...Array(star)].map((_, i) => (
            <Star key={i} className="w-3 h-3 fill-gold text-gold" />
          ))}
        </div>
      )}
    </div>
  </div>
);

export default PackageDetail;
