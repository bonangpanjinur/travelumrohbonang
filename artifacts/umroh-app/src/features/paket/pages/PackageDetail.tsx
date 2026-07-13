import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/shared/integrations/supabase/client";
import { useAuth } from "@/shared/hooks/useAuth";
import Navbar from "@/shared/components/layout/Navbar";
import Footer from "@/shared/components/layout/Footer";
import { Button } from "@/shared/components/ui/button";
import { motion } from "framer-motion";
import { Calendar, Star, Users, Plane, Hotel, MapPin, ArrowRight, Check } from "lucide-react";
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
  hotel_makkah: { name: string; star: number } | null;
  hotel_madinah: { name: string; star: number } | null;
  airline: { name: string } | null;
  airport: { name: string; city: string } | null;
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
  prices: { room_type: string; price: number }[];
}

const PackageDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { format: formatPrice } = useCurrency();
  const [pkg, setPkg] = useState<Package | null>(null);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [extraHotels, setExtraHotels] = useState<ExtraHotel[]>([]);
  const [selectedDeparture, setSelectedDeparture] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPackage = async () => {
      const { data: pkgData, error } = await supabase
        .from("packages")
        .select(`
          *,
          category:package_categories(name),
          hotel_makkah:hotels!packages_hotel_makkah_id_fkey(name, star),
          hotel_madinah:hotels!packages_hotel_madinah_id_fkey(name, star),
          airline:airlines(name),
          airport:airports(name, city)
        `)
        .eq("slug", slug!)
        .maybeSingle();

      if (error) {
        // A real query error (RLS denial, missing FK constraint breaking the embed, network, etc.)
        // is a different situation than "no such package" — surface it instead of silently
        // falling through to the generic not-found screen, which makes this undiagnosable.
        console.error("[PackageDetail] failed to fetch package by slug:", slug, error);
        setFetchError(error.message);
        setLoading(false);
        return;
      }

      if (pkgData) {
        setPkg(pkgData as unknown as Package);

        const [depRes, extraRes] = await Promise.all([
          supabase
            .from("package_departures")
            .select(`*, prices:departure_prices(room_type, price)`)
            .eq("package_id", pkgData.id)
            .order("departure_date", { ascending: true }),
          supabase
            .from("package_hotels")
            .select(`id, label, hotel:hotels(name, star, city)`)
            .eq("package_id", pkgData.id)
            .order("sort_order"),
        ]);

        setDepartures((depRes.data as unknown as Departure[]) || []);
        setExtraHotels((extraRes.data as unknown as ExtraHotel[]) || []);
      } else if (slug) {
        // No package matched — check the slug redirect table for an old → new mapping
        const redirectTo = await lookupSlugRedirect("package", slug, tenant?.id);
        if (redirectTo) {
          navigate(buildRedirectPath("package", redirectTo), { replace: true });
          return;
        }
      }
      setLoading(false);
    };

    fetchPackage();
  }, [slug, tenant?.id, navigate]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
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

  const selectedDep = departures.find((d) => d.id === selectedDeparture);

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
            alt={pkg.title}
            className="w-full h-full object-cover"
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
              {/* Quick Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <Calendar className="w-6 h-6 mx-auto text-gold mb-2" />
                  <div className="text-sm text-muted-foreground">Durasi</div>
                  <div className="font-bold">{pkg.duration_days} Hari</div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <Star className="w-6 h-6 mx-auto text-gold mb-2" />
                  <div className="text-sm text-muted-foreground">Hotel</div>
                  <div className="font-bold">Bintang {pkg.hotel_makkah?.star || 4}</div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <Plane className="w-6 h-6 mx-auto text-gold mb-2" />
                  <div className="text-sm text-muted-foreground">Maskapai</div>
                  <div className="font-bold text-sm">{pkg.airline?.name || "TBA"}</div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <MapPin className="w-6 h-6 mx-auto text-gold mb-2" />
                  <div className="text-sm text-muted-foreground">Keberangkatan</div>
                  <div className="font-bold text-sm">{pkg.airport?.city || "Jakarta"}</div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h2 className="text-2xl font-display font-bold mb-4">Deskripsi Paket</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {pkg.description || "Paket umroh terbaik dengan pelayanan premium dan bimbingan ibadah lengkap."}
                </p>
              </div>

              {/* Hotels */}
              <div>
                <h2 className="text-2xl font-display font-bold mb-4">Akomodasi</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-card border border-border rounded-xl p-6">
                    <Hotel className="w-8 h-8 text-gold mb-3" />
                    <h3 className="font-bold mb-1">Hotel Makkah</h3>
                    <p className="text-sm text-muted-foreground">{pkg.hotel_makkah?.name || "Hotel Bintang 5"}</p>
                    <div className="flex gap-1 mt-2">
                      {[...Array(pkg.hotel_makkah?.star || 5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-gold text-gold" />
                      ))}
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-6">
                    <Hotel className="w-8 h-8 text-gold mb-3" />
                    <h3 className="font-bold mb-1">Hotel Madinah</h3>
                    <p className="text-sm text-muted-foreground">{pkg.hotel_madinah?.name || "Hotel Bintang 5"}</p>
                    <div className="flex gap-1 mt-2">
                      {[...Array(pkg.hotel_madinah?.star || 5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-gold text-gold" />
                      ))}
                    </div>
                  </div>
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
                      hotel_makkah: pkg.hotel_makkah?.name,
                      hotel_madinah: pkg.hotel_madinah?.name,
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
