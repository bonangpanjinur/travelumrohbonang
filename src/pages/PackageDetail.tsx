import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Calendar, Star, Users, Plane, Hotel, MapPin, ArrowRight, Check } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Package {
  id: string;
  title: string;
  slug: string;
  description: string;
  package_type: string;
  image_url: string;
  duration_days: number;
  category: { name: string } | null;
  hotel_makkah: { name: string; star: number } | null;
  hotel_madinah: { name: string; star: number } | null;
  airline: { name: string } | null;
  airport: { name: string; city: string } | null;
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
  const [pkg, setPkg] = useState<Package | null>(null);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [selectedDeparture, setSelectedDeparture] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPackage = async () => {
      const { data: pkgData } = await supabase
        .from("packages")
        .select(`
          *,
          category:package_categories(name),
          hotel_makkah:hotels!packages_hotel_makkah_id_fkey(name, star),
          hotel_madinah:hotels!packages_hotel_madinah_id_fkey(name, star),
          airline:airlines(name),
          airport:airports(name, city)
        `)
        .eq("slug", slug)
        .single();

      if (pkgData) {
        setPkg(pkgData as unknown as Package);

        const { data: depData } = await supabase
          .from("package_departures")
          .select(`
            *,
            prices:departure_prices(room_type, price)
          `)
          .eq("package_id", pkgData.id)
          .eq("status", "active")
          .gte("departure_date", new Date().toISOString().split("T")[0])
          .order("departure_date", { ascending: true });

        setDepartures((depData as unknown as Departure[]) || []);
      }
      setLoading(false);
    };

    fetchPackage();
  }, [slug]);

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
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Paket tidak ditemukan</h1>
        <Link to="/paket">
          <Button>Lihat Semua Paket</Button>
        </Link>
      </div>
    );
  }

  const selectedDep = departures.find((d) => d.id === selectedDeparture);

  return (
    <div className="min-h-screen">
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
            <div className="container-custom">
              <span className="bg-gold text-primary text-xs font-bold px-3 py-1 rounded-full">
                {pkg.category?.name || pkg.package_type}
              </span>
              <h1 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground mt-4">
                {pkg.title}
              </h1>
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
                          Mulai Rp {getLowestPrice(dep.prices).toLocaleString("id-ID")}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {selectedDep && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-sm text-muted-foreground mb-1">Harga mulai dari</div>
                    <div className="text-2xl font-display font-bold text-foreground">
                      Rp {getLowestPrice(selectedDep.prices).toLocaleString("id-ID")}
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
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PackageDetail;
