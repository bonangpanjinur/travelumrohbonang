import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiFetch } from "@/shared/lib/apiClient";
import { useAuth } from "@/shared/hooks/useAuth";
import Navbar from "@/shared/components/layout/Navbar";
import Footer from "@/shared/components/layout/Footer";
import { Button } from "@/shared/components/ui/button";
import { motion } from "framer-motion";
import { Calendar, Star, Users, Plane, Hotel, MapPin, ArrowRight, Check, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
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

  useEffect(() => {
    if (!slug) return;

    const fetchPackage = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const data: Package = await apiFetch(`/api/packages/${encodeURIComponent(slug)}`);
        setPkg(data);
        // Auto-select first available departure
        const firstAvailable = data.departures?.find((d) => d.remaining_quota > 0);
        if (firstAvailable) {
          setSelectedDeparture(firstAvailable.id);
        } else if (data.departures?.length) {
          setSelectedDeparture(data.departures[0].id);
        }
      } catch (err: any) {
        // 404 → check slug redirect table
        if (err?.status === 404 || err?.message?.includes("404")) {
          const redirectTo = await lookupSlugRedirect("package", slug, tenant?.id);
          if (redirectTo) {
            navigate(buildRedirectPath("package", redirectTo), { replace: true });
            return;
          }
          // No redirect — genuine 404, leave pkg as null
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

  // Fetch itinerary whenever selected departure changes
  useEffect(() => {
    if (!selectedDeparture) {
      setItinerary(null);
      return;
    }

    const fetchItinerary = async () => {
      setItineraryLoading(true);
      try {
        const data = await apiFetch(`/api/packages/itinerary/${encodeURIComponent(selectedDeparture)}`) as any;
        setItinerary(data?.itinerary ?? null);
        // Auto-expand first day
        if (data?.itinerary?.days?.length) {
          setExpandedDay(data.itinerary.days[0].id);
        }
      } catch (err) {
        console.error("[PackageDetail] failed to fetch itinerary:", err);
        setItinerary(null);
      } finally {
        setItineraryLoading(false);
      }
    };

    fetchItinerary();
  }, [selectedDeparture]);

  const handleBookNow = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!selectedDeparture) return;
    navigate(`/booking/${slug}/${selectedDeparture}`);
  };

  const getLowestPrice = (prices: { room_type: string; price: number }[]) => {
    if (!prices || prices.length === 0) return 0;
    return Math.min(...prices.map((p) => p.price));
  };

  const departures = pkg?.departures ?? [];

  // Derive hotel/airline info from selected departure
  const selectedDep = departures.find((d) => d.id === selectedDeparture);
  const displayHotelStar = selectedDep?.hotel_makkah?.star ?? (departures[0]?.hotel_makkah?.star ?? 4);
  const displayAirline = selectedDep?.airline?.name ?? departures[0]?.airline?.name ?? "TBA";
  const extraHotels = selectedDep?.extra_hotels ?? [];

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-20">
          {/* Hero skeleton */}
          <div className="relative h-[50vh] bg-muted animate-pulse" />
          <div className="container-custom section-padding">
            <div className="grid lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-8">
                {/* Quick info skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-muted animate-pulse rounded-xl h-24" />
                  ))}
                </div>
                {/* Description skeleton */}
                <div className="space-y-3">
                  <div className="h-7 bg-muted animate-pulse rounded w-48" />
                  <div className="h-4 bg-muted animate-pulse rounded w-full" />
                  <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
                  <div className="h-4 bg-muted animate-pulse rounded w-4/6" />
                </div>
                {/* Hotels skeleton */}
                <div className="space-y-3">
                  <div className="h-7 bg-muted animate-pulse rounded w-36" />
                  <div className="grid md:grid-cols-2 gap-4">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="bg-muted animate-pulse rounded-xl h-32" />
                    ))}
                  </div>
                </div>
              </div>
              {/* Sidebar skeleton */}
              <div className="lg:col-span-1">
                <div className="bg-muted animate-pulse rounded-2xl h-72" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">
          {fetchError ? "Gagal memuat paket" : "Paket tidak ditemukan"}
        </h1>
        {fetchError && (
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            Terjadi kendala teknis saat mengambil data paket ini. Coba muat ulang halaman, atau hubungi admin jika
            masalah berlanjut.
          </p>
        )}
        <Link to="/paket">
          <Button>Lihat Semua Paket</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
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
      <main className="pt-20">
        {/* Hero */}
        <div className="relative h-[50vh] overflow-hidden">
          <img
            src={pkg.image_url || "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200&q=80"}
            alt={`${pkg.title} — foto paket umroh`}
            className="w-full h-full object-cover"
            fetchPriority="high"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="container-custom flex items-end justify-between gap-4">
              <div>
                <span className="bg-gold text-primary text-xs font-bold px-3 py-1 rounded-full">
                  {pkg.category?.name || pkg.package_type}
                </span>
                <h1 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground mt-4">
                  {pkg.title}
                </h1>
              </div>
              <WishlistButton packageId={pkg.id} variant="outline" />
            </div>
          </div>
        </div>

        <div className="container-custom section-padding">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Quick Info — data from selected departure */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <Calendar className="w-6 h-6 mx-auto text-gold mb-2" />
                  <div className="text-sm text-muted-foreground">Durasi</div>
                  <div className="font-bold">{pkg.duration_days} Hari</div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <Star className="w-6 h-6 mx-auto text-gold mb-2" />
                  <div className="text-sm text-muted-foreground">Hotel</div>
                  <div className="font-bold">Bintang {displayHotelStar}</div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <Plane className="w-6 h-6 mx-auto text-gold mb-2" />
                  <div className="text-sm text-muted-foreground">Maskapai</div>
                  {selectedDep?.departure_type === "transit" ? (
                    <div className="font-bold text-sm text-amber-600">Transit</div>
                  ) : (
                    <div className="font-bold text-sm">{displayAirline}</div>
                  )}
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <Users className="w-6 h-6 mx-auto text-gold mb-2" />
                  <div className="text-sm text-muted-foreground">Keberangkatan</div>
                  <div className="font-bold text-sm">{departures.length} Jadwal</div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h2 className="text-2xl font-display font-bold mb-4">Deskripsi Paket</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {pkg.description || "Paket umroh terbaik dengan pelayanan premium dan bimbingan ibadah lengkap."}
                </p>
              </div>

              {/* Akomodasi — from selected departure */}
              <div>
                <h2 className="text-2xl font-display font-bold mb-2">Akomodasi</h2>
                {selectedDep ? (
                  <>
                    {(selectedDep.hotel_makkah || selectedDep.hotel_madinah || extraHotels.length > 0) ? (
                      <div className="grid md:grid-cols-2 gap-4">
                        {selectedDep.hotel_makkah && (
                          <div className="bg-card border border-border rounded-xl p-6">
                            <Hotel className="w-8 h-8 text-gold mb-3" />
                            <h3 className="font-bold mb-1">Hotel Makkah</h3>
                            <p className="text-sm text-muted-foreground">{selectedDep.hotel_makkah.name}</p>
                            <div className="flex gap-1 mt-2">
                              {[...Array(selectedDep.hotel_makkah.star || 5)].map((_, i) => (
                                <Star key={i} className="w-4 h-4 fill-gold text-gold" />
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedDep.hotel_madinah && (
                          <div className="bg-card border border-border rounded-xl p-6">
                            <Hotel className="w-8 h-8 text-gold mb-3" />
                            <h3 className="font-bold mb-1">Hotel Madinah</h3>
                            <p className="text-sm text-muted-foreground">{selectedDep.hotel_madinah.name}</p>
                            <div className="flex gap-1 mt-2">
                              {[...Array(selectedDep.hotel_madinah.star || 5)].map((_, i) => (
                                <Star key={i} className="w-4 h-4 fill-gold text-gold" />
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Extra Hotels */}
                        {extraHotels.map((eh) => (
                          <div key={eh.id} className="bg-card border border-border rounded-xl p-6">
                            <Hotel className="w-8 h-8 text-gold mb-3" />
                            <h3 className="font-bold mb-1">{eh.label || `Hotel ${eh.hotel?.city || "Tambahan"}`}</h3>
                            <p className="text-sm text-muted-foreground">{eh.hotel?.name || "Hotel"}</p>
                            {eh.hotel?.city && (
                              <div className="flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{eh.hotel.city}</span>
                              </div>
                            )}
                            {eh.hotel?.star && (
                              <div className="flex gap-1 mt-2">
                                {[...Array(eh.hotel.star)].map((_, i) => (
                                  <Star key={i} className="w-4 h-4 fill-gold text-gold" />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Hotel untuk keberangkatan ini belum ditentukan.</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Pilih keberangkatan untuk melihat informasi hotel.</p>
                )}
              </div>

              {/* Itinerary */}
              <div>
                <h2 className="text-2xl font-display font-bold mb-2">Program Perjalanan</h2>
                {selectedDeparture ? (
                  <>
                    {/* departure label */}
                    {selectedDep && (
                      <p className="text-sm text-muted-foreground mb-4">
                        Itinerary untuk keberangkatan{" "}
                        <span className="font-medium text-foreground">
                          {format(new Date(selectedDep.departure_date), "d MMMM yyyy", { locale: localeId })}
                        </span>
                      </p>
                    )}

                    {itineraryLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="bg-muted animate-pulse rounded-xl h-16" />
                        ))}
                      </div>
                    ) : itinerary && itinerary.days.length > 0 ? (
                      <div className="space-y-3">
                        {itinerary.title && (
                          <p className="text-sm font-medium text-gold mb-2">{itinerary.title}</p>
                        )}
                        {itinerary.days.map((day) => {
                          const isOpen = expandedDay === day.id;
                          return (
                            <motion.div
                              key={day.id}
                              initial={false}
                              className="border border-border rounded-xl overflow-hidden bg-card"
                            >
                              <button
                                onClick={() => setExpandedDay(isOpen ? null : day.id)}
                                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-bold text-gold">{day.day_number}</span>
                                  </div>
                                  <span className="font-semibold text-sm">
                                    Hari {day.day_number}
                                    {day.title ? ` — ${day.title}` : ""}
                                  </span>
                                </div>
                                {isOpen ? (
                                  <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                )}
                              </button>
                              {isOpen && (
                                <div className="px-5 pb-5">
                                  {day.image_url && (
                                    <img
                                      src={day.image_url}
                                      alt={day.title || `Hari ${day.day_number}`}
                                      className="w-full h-40 object-cover rounded-lg mb-3"
                                    />
                                  )}
                                  {day.description ? (
                                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                                      {day.description}
                                    </p>
                                  ) : (
                                    <p className="text-sm text-muted-foreground italic">
                                      Detail program hari ini belum tersedia.
                                    </p>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                        {itinerary.notes && (
                          <p className="text-xs text-muted-foreground mt-2 italic">{itinerary.notes}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border rounded-xl">
                        <BookOpen className="w-10 h-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Program perjalanan untuk keberangkatan ini belum tersedia.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border rounded-xl">
                    <BookOpen className="w-10 h-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Pilih keberangkatan di samping untuk melihat program perjalanan.
                    </p>
                  </div>
                )}
              </div>

              {/* Facilities */}
              <div>
                <h2 className="text-2xl font-display font-bold mb-4">Fasilitas Termasuk</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    "Tiket Pesawat PP",
                    "Hotel Dekat Masjidil Haram",
                    "Makan 3x Sehari",
                    "Muthawif Berpengalaman",
                    "Visa Umroh",
                    "Perlengkapan Umroh",
                    "Manasik Umroh",
                    "Asuransi Perjalanan",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-gold" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Calculator */}
              <InstallmentCalculator defaultPrice={
                departures.length ? Math.min(...departures.flatMap(d => d.prices.map(p => p.price))) : 30000000
              } />

              {/* Reviews */}
              <PackageReviews packageId={pkg.id} packageTitle={pkg.title} />
            </div>

            {/* Sidebar - Booking */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-card border border-border rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-display font-bold mb-4">Pilih Keberangkatan</h3>

                {departures.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Belum ada jadwal keberangkatan tersedia.</p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {departures.map((dep) => (
                      <motion.div
                        key={dep.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setSelectedDeparture(dep.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          selectedDeparture === dep.id
                            ? "border-gold bg-gold/10"
                            : "border-border hover:border-gold/50"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold">
                              {format(new Date(dep.departure_date), "d MMMM yyyy", { locale: localeId })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Sisa {dep.remaining_quota} kursi
                            </div>
                            {dep.departure_type === "transit" && dep.flight_segments && dep.flight_segments.length > 0 ? (
                              <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                                <Plane className="w-3 h-3" />
                                <span>Transit ({dep.flight_segments.length} penerbangan)</span>
                              </div>
                            ) : dep.airline ? (
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <Plane className="w-3 h-3" />
                                <span>{dep.airline.name}</span>
                              </div>
                            ) : null}
                          </div>
                          <Users className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="text-sm font-bold text-gold">
                          Mulai {formatPrice(getLowestPrice(dep.prices))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {selectedDep && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-sm text-muted-foreground mb-1">Harga mulai dari</div>
                    <div className="text-2xl font-display font-bold text-foreground">
                      {formatPrice(getLowestPrice(selectedDep.prices))}
                    </div>
                    <div className="text-xs text-muted-foreground">per orang (Quad)</div>
                  </div>
                )}

                <Button
                  onClick={handleBookNow}
                  disabled={!selectedDeparture}
                  className="w-full mt-4 gradient-gold text-primary font-semibold"
                >
                  {user ? "Booking Sekarang" : "Login untuk Booking"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <div className="mt-3">
                  <PromoPdfButton
                    packageData={{
                      title: pkg.title,
                      image_url: pkg.image_url,
                      description: pkg.description,
                      duration_days: pkg.duration_days,
                      hotel_makkah: selectedDep?.hotel_makkah?.name ?? departures[0]?.hotel_makkah?.name,
                      hotel_madinah: selectedDep?.hotel_madinah?.name ?? departures[0]?.hotel_madinah?.name,
                      startPrice: selectedDep ? getLowestPrice(selectedDep.prices) : (departures[0] ? getLowestPrice(departures[0].prices) : 0),
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
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
      <StickyMobileCTA
        price={selectedDep ? getLowestPrice(selectedDep.prices) : (departures[0] ? getLowestPrice(departures[0].prices) : undefined)}
        onBook={handleBookNow}
        disabled={!selectedDeparture}
      />
      <Footer />
    </div>
  );
};

export default PackageDetail;
