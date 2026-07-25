import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiFetch } from "@/shared/lib/apiClient";
import { useAuth } from "@/shared/hooks/useAuth";
import Navbar from "@/shared/components/layout/Navbar";
import Footer from "@/shared/components/layout/Footer";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Star, Users, Plane, Hotel, MapPin, ArrowRight,
  Check, BookOpen, ChevronDown, ChevronUp, Images, X,
  ChevronLeft, ChevronRight, ArrowLeft, Shield,
  Package, FileCheck, UtensilsCrossed, GraduationCap,
  BadgeCheck, Clock, Info, Calculator, MessageCircle,
  Share2, Link2, Facebook,
} from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
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

// ── Tab definitions ──────────────────────────────────────────────────────────
type TabId = "about" | "itinerary" | "accommodation" | "gallery" | "reviews" | "cicilan";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "about",         label: "Tentang",    icon: Info },
  { id: "itinerary",    label: "Itinerary",  icon: BookOpen },
  { id: "accommodation",label: "Akomodasi",  icon: Hotel },
  { id: "gallery",      label: "Galeri",     icon: Images },
  { id: "reviews",      label: "Ulasan",     icon: Star },
  { id: "cicilan",      label: "Cicilan",    icon: Calculator },
];

// ── Section title component ─────────────────────────────────────────────────
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4 flex items-center gap-2.5 sm:mb-6 sm:gap-3">
    <div className="h-6 w-1 flex-shrink-0 rounded-full bg-gold sm:h-7" />
    <h2 className="text-xl font-display font-bold sm:text-2xl">{children}</h2>
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
  const [activeTab, setActiveTab] = useState<TabId>("about");
  const tabContentRef = useRef<HTMLDivElement>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Close share panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    };
    if (shareOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [shareOpen]);

  const pageUrl = typeof window !== "undefined" ? window.location.href : `${getAppOrigin()}/paket/${slug}`;

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      toast({ title: "Link disalin!", description: "Tempel di caption atau bio Anda." });
    } catch {
      toast({ title: "Gagal menyalin link", description: pageUrl });
    }
    setShareOpen(false);
  }, [pageUrl, toast]);

  const handleShareFacebook = useCallback(() => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`, "_blank", "noopener,noreferrer,width=600,height=400");
    setShareOpen(false);
  }, [pageUrl]);

  const handleShareWhatsApp = useCallback(() => {
    const text = `Cek paket umroh ini: *${pkg?.title}* — ${pageUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    setShareOpen(false);
  }, [pageUrl, pkg?.title]);

  const handleShareInstagram = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: pkg?.title, url: pageUrl });
        setShareOpen(false);
        return;
      } catch { /* user cancelled */ }
    }
    await navigator.clipboard.writeText(pageUrl).catch(() => {});
    toast({ title: "Link disalin!", description: "Buka Instagram → buat Story/Post → tempel link di caption atau bio." });
    setShareOpen(false);
  }, [pageUrl, pkg?.title, toast]);

  const handleShareTikTok = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: pkg?.title, url: pageUrl });
        setShareOpen(false);
        return;
      } catch { /* user cancelled */ }
    }
    await navigator.clipboard.writeText(pageUrl).catch(() => {});
    toast({ title: "Link disalin!", description: "Buka TikTok → buat video → tempel link di caption atau bio." });
    setShareOpen(false);
  }, [pageUrl, pkg?.title, toast]);

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
    if (!selectedDeparture || !selectedDep || selectedDep.remaining_quota <= 0) return;
    navigate(`/booking/${slug}/${selectedDeparture}`);
  };

  const handleKonsultasi = () => {
    const waNumber = (tenant?.whatsapp_number ?? tenant?.phone ?? "").replace(/\D/g, "");
    const depDate = selectedDep
      ? format(new Date(selectedDep.departure_date), "d MMMM yyyy", { locale: localeId })
      : "";
    const lines = [
      `Halo, saya ingin konsultasi mengenai paket umroh:`,
      `📦 *${pkg?.title}*`,
      depDate ? `🗓️ Keberangkatan: ${depDate}` : "",
      ``,
      `Mohon informasi lebih lanjut, terima kasih.`,
    ].filter(Boolean).join("\n");
    const url = waNumber
      ? `https://wa.me/${waNumber}?text=${encodeURIComponent(lines)}`
      : `https://wa.me/?text=${encodeURIComponent(lines)}`;
    window.open(url, "_blank", "noopener,noreferrer");
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
        price={(() => { const all = departures.flatMap((d) => d.prices.map((p) => p.price)).filter((p) => p > 0); return all.length ? Math.min(...all) : undefined; })()}
        currency="IDR"
        availability={departures.some((d) => d.remaining_quota > 0) ? "InStock" : "SoldOut"}
        validFrom={departures[0]?.departure_date}
        validThrough={departures[departures.length - 1]?.return_date}
        url={typeof window !== "undefined" ? window.location.href : `${getAppOrigin()}/paket/${slug}`}
      />
      <Navbar />

      <main>
        {/* ══ HERO ══════════════════════════════════════════════════════════ */}
        <div className="relative h-[380px] min-h-[380px] w-full sm:h-[480px] sm:min-h-[480px] lg:h-[65vh] lg:min-h-[520px]">
          {/* Background image — clipped independently so share dropdown isn't clipped */}
          <div className="absolute inset-0 overflow-hidden">
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
          </div>

          {/* Back link */}
          <div className="absolute left-0 right-0 top-[4.5rem] sm:top-24">
            <div className="container-custom px-3 sm:px-6">
              <Link
                to="/paket"
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm transition-colors hover:text-white sm:text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Semua </span>Paket
              </Link>
            </div>
          </div>

          {/* Hero content */}
          <div className="absolute bottom-0 left-0 right-0 pb-5 pt-20 sm:pb-8 sm:pt-16">
            <div className="container-custom px-3 sm:px-6">
              <div className="flex items-end justify-between gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                  {/* Category badge */}
                  <span className="mb-2 inline-block rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary sm:mb-3 sm:px-3 sm:text-xs">
                    {pkg.category?.name || pkg.package_type}
                  </span>
                  <h1 className="mb-2 break-words text-xl font-display font-bold leading-tight text-white sm:mb-4 sm:text-3xl md:text-5xl">
                    {pkg.title}
                  </h1>
                  {/* Quick-stat chips */}
                  <div className="flex max-w-full flex-wrap gap-1 sm:gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/15 px-2 py-1 text-[10px] text-white backdrop-blur-sm sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs">
                      <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gold" />
                      {pkg.duration_days} Hari
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/15 px-2 py-1 text-[10px] text-white backdrop-blur-sm sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs">
                      <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gold fill-gold" />
                      Bintang {displayHotelStar}
                    </span>
                    <span className="inline-flex max-w-[42%] items-center gap-1 rounded-full border border-white/20 bg-white/15 px-2 py-1 text-[10px] text-white backdrop-blur-sm sm:max-w-none sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs">
                      <Plane className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gold" />
                      <span className="truncate sm:max-w-none">
                        {selectedDep?.departure_type === "transit" ? "Transit" : displayAirline}
                      </span>
                    </span>
                    {departures.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/15 px-2 py-1 text-[10px] text-white backdrop-blur-sm sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs">
                        <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gold" />
                        {departures.length} Jadwal
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5 self-end pb-0.5 sm:gap-2">
                  {/* Share button — panel opens upward so it clears the hero boundary */}
                  <div ref={shareRef} className="relative">
                    <button
                      onClick={() => setShareOpen((v) => !v)}
                      aria-label="Bagikan paket"
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-2.5 py-2 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-white/25 sm:px-3 sm:text-sm"
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Bagikan</span>
                    </button>

                    {/* Share panel — opens upward to avoid overflow clipping */}
                    <AnimatePresence>
                      {shareOpen && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 bottom-full mb-2 w-56 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50"
                        >
                          <div className="px-3 py-2.5 border-b border-border">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bagikan ke</p>
                          </div>
                          <div className="p-1.5 space-y-0.5">
                            {/* Copy link */}
                            <ShareItem
                              onClick={handleCopyLink}
                              icon={<Link2 className="w-4 h-4" />}
                              bg="bg-muted/60"
                              color="text-foreground"
                              label="Salin Link"
                            />
                            {/* Facebook */}
                            <ShareItem
                              onClick={handleShareFacebook}
                              icon={<Facebook className="w-4 h-4" />}
                              bg="bg-[#1877F2]/10"
                              color="text-[#1877F2]"
                              label="Facebook"
                            />
                            {/* WhatsApp */}
                            <ShareItem
                              onClick={handleShareWhatsApp}
                              icon={
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.549 4.103 1.516 5.835L.057 23.882l6.19-1.622A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 01-5.003-1.367l-.36-.213-3.718.975.99-3.615-.234-.37A9.817 9.817 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
                                </svg>
                              }
                              bg="bg-[#25D366]/10"
                              color="text-[#25D366]"
                              label="WhatsApp"
                            />
                            {/* Instagram */}
                            <ShareItem
                              onClick={handleShareInstagram}
                              icon={
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                </svg>
                              }
                              bg="bg-[#E1306C]/10"
                              color="text-[#E1306C]"
                              label="Instagram"
                              hint="Salin link → tempel di bio/caption"
                            />
                            {/* TikTok */}
                            <ShareItem
                              onClick={handleShareTikTok}
                              icon={
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.26 8.26 0 004.84 1.54V6.78a4.85 4.85 0 01-1.07-.09z"/>
                                </svg>
                              }
                              bg="bg-black/10 dark:bg-white/10"
                              color="text-foreground"
                              label="TikTok"
                              hint="Salin link → tempel di caption video"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <WishlistButton packageId={pkg.id} variant="outline" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ MAIN CONTENT ══════════════════════════════════════════════════ */}
        <div className="mx-auto w-full max-w-7xl px-3 pb-36 pt-5 sm:px-6 sm:pb-24 sm:pt-8 lg:px-8">
          <div className="grid min-w-0 gap-7 lg:grid-cols-3 lg:gap-10 xl:gap-14">

            {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
            <div className="min-w-0 lg:col-span-2">
              {/* ── Tab Bar ──────────────────────────────────────────────── */}
              <div className="sticky top-14 z-20 -mx-3 mb-6 border-b border-border bg-background/95 backdrop-blur-sm sm:top-16 sm:mx-0 sm:mb-8">
                <div
                  className="flex px-3 sm:px-0"
                  style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          tabContentRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                        }}
                        className={`flex min-h-12 flex-shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-xs font-medium transition-all sm:px-4 sm:py-3.5 sm:text-sm ${
                          isActive
                            ? "border-gold text-gold"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Tab Content ──────────────────────────────────────────── */}
              <div ref={tabContentRef}>
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                  >

                    {/* ── TENTANG tab ─────────────────────────────────── */}
                    {activeTab === "about" && (
                      <div className="space-y-10">
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

                        {/* Facilities */}
                        <section>
                          <SectionTitle>Fasilitas Termasuk</SectionTitle>
                          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
                            {FACILITIES.map(({ icon: Icon, label }) => (
                              <div
                                key={label}
                                className="flex min-h-[126px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-3 text-center transition-all hover:border-gold/40 hover:bg-gold/5 sm:p-4"
                              >
                                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/20 bg-gold/10 sm:h-10 sm:w-10">
                                  <Icon className="w-5 h-5 text-gold" />
                                </div>
                                <span className="text-[11px] font-medium leading-snug sm:text-xs">{label}</span>
                              </div>
                            ))}
                          </div>
                        </section>

                      </div>
                    )}

                    {/* ── ITINERARY tab ───────────────────────────────── */}
                    {activeTab === "itinerary" && (
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
                                <div className="relative">
                                  <div className="absolute left-[19px] top-6 bottom-6 w-px bg-border" />
                                  <div className="space-y-2">
                                    {itinerary.days.map((day) => {
                                      const isOpen = expandedDay === day.id;
                                      return (
                                        <motion.div key={day.id} initial={false} className="relative pl-11">
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
                    )}

                    {/* ── AKOMODASI tab ───────────────────────────────── */}
                    {activeTab === "accommodation" && (
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
                    )}

                    {/* ── GALERI tab ──────────────────────────────────── */}
                    {activeTab === "gallery" && (
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

                        {gallery.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-2xl bg-muted/30">
                            <Images className="w-10 h-10 text-muted-foreground/30 mb-3" />
                            <p className="text-sm text-muted-foreground">Galeri foto belum tersedia untuk paket ini.</p>
                          </div>
                        ) : gallery.length === 1 ? (
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

                    {/* ── ULASAN tab ──────────────────────────────────── */}
                    {activeTab === "reviews" && (
                      <PackageReviews packageId={pkg.id} packageTitle={pkg.title} />
                    )}

                    {/* ── CICILAN tab ─────────────────────────────────── */}
                    {activeTab === "cicilan" && (
                      <section>
                        <InstallmentCalculator
                          defaultPrice={(() => {
                            const allPrices = departures.flatMap((d) => d.prices.map((p) => p.price)).filter((p) => p > 0);
                            return allPrices.length ? Math.min(...allPrices) : 30_000_000;
                          })()}
                        />
                      </section>
                    )}

                  </motion.div>
              </div>
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
                        <div className="space-y-3">
                          <Select
                            value={selectedDeparture ?? undefined}
                            onValueChange={setSelectedDeparture}
                          >
                            <SelectTrigger className="h-auto min-h-12 rounded-xl border-border bg-background px-3 py-2.5 text-left">
                              <SelectValue placeholder="Pilih tanggal keberangkatan" />
                            </SelectTrigger>
                            <SelectContent>
                              {departures.map((dep) => {
                                const isSoldOut = dep.remaining_quota <= 0;
                                return (
                                  <SelectItem
                                    key={dep.id}
                                    value={dep.id}
                                    disabled={isSoldOut}
                                  >
                                    <span className="flex items-center gap-2">
                                      <span className="font-medium">
                                        {format(new Date(dep.departure_date), "d MMM yyyy", { locale: localeId })}
                                      </span>
                                      <span className={isSoldOut ? "text-destructive" : "text-muted-foreground"}>
                                        {isSoldOut ? "Habis" : `· Sisa ${dep.remaining_quota} kursi`}
                                      </span>
                                    </span>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>

                          {selectedDep && (
                            <div className="rounded-xl border border-gold/30 bg-gold/5 p-3.5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs text-muted-foreground">Jadwal terpilih</p>
                                  <p className="font-semibold text-sm mt-0.5">
                                    {format(new Date(selectedDep.departure_date), "d MMMM yyyy", { locale: localeId })}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Pulang {format(new Date(selectedDep.return_date), "d MMMM yyyy", { locale: localeId })}
                                  </p>
                                </div>
                                <div className={`text-xs font-semibold text-right flex-shrink-0 ${selectedDep.remaining_quota <= 0 ? "text-destructive" : "text-gold"}`}>
                                  {selectedDep.remaining_quota <= 0 ? "Kuota habis" : `${selectedDep.remaining_quota} kursi tersisa`}
                                </div>
                              </div>
                              {(selectedDep.departure_type === "transit" || selectedDep.airline) && (
                                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gold/20 text-xs text-muted-foreground">
                                  <Plane className="w-3.5 h-3.5 text-gold" />
                                  <span>
                                    {selectedDep.departure_type === "transit"
                                      ? "Penerbangan transit"
                                      : selectedDep.airline?.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          <p className="text-[11px] text-muted-foreground">
                            {departures.length} pilihan jadwal tersedia
                          </p>
                          {/*
                            Keep sold-out dates visible in the dropdown so users understand
                            the package's availability, while preventing selection.
                          */}
                          {departures.every((dep) => dep.remaining_quota <= 0) && (
                            <p className="text-xs text-destructive">Semua jadwal keberangkatan sudah penuh.</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="space-y-2 pt-1">
                      <Button
                        onClick={handleBookNow}
                        disabled={!selectedDeparture || !selectedDep || selectedDep.remaining_quota <= 0}
                        className="w-full gradient-gold text-primary font-bold h-11 text-base"
                      >
                        {user ? "Booking Sekarang" : "Login untuk Booking"}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <Button
                        onClick={handleKonsultasi}
                        variant="outline"
                        className="w-full h-11 border-gold/40 text-gold hover:bg-gold/5 hover:border-gold font-semibold gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Konsultasi Paket
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
        disabled={!selectedDeparture || !selectedDep || selectedDep.remaining_quota <= 0}
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

// ── ShareItem subcomponent ───────────────────────────────────────────────────
const ShareItem = ({
  onClick, icon, bg, color, label, hint,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  bg: string;
  color: string;
  label: string;
  hint?: string;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left"
  >
    <div className={`w-8 h-8 rounded-lg ${bg} ${color} flex items-center justify-center flex-shrink-0`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-sm font-medium leading-none">{label}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{hint}</p>}
    </div>
  </button>
);

export default PackageDetail;
