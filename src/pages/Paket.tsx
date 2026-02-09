import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackgroundPattern from "@/components/BackgroundPattern";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Calendar, ArrowRight, Search, Filter, X, Plane, MapPin, Building } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import PackageCard, { PackageCardData } from "@/components/PackageCard";
import SEO from "@/components/SEO";

interface Package extends PackageCardData {
  description: string;
  airline_id: string | null;
  airport_id: string | null;
  category_id: string | null;
  hotel_makkah_id: string | null;
  category: { id: string; name: string; parent_id: string | null } | null;
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

interface FilterOption {
  id: string;
  name: string;
  star?: number;
  city?: string;
}

const Paket = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  
  // Filter states
  const [selectedMainCategory, setSelectedMainCategory] = useState(searchParams.get("tipe") || "all");
  const [selectedSubCategory, setSelectedSubCategory] = useState(searchParams.get("kategori") || "all");
  const [selectedAirline, setSelectedAirline] = useState(searchParams.get("maskapai") || "all");
  const [selectedAirport, setSelectedAirport] = useState(searchParams.get("bandara") || "all");
  const [selectedHotelStar, setSelectedHotelStar] = useState(searchParams.get("bintang") || "all");
  const [selectedMonth, setSelectedMonth] = useState(searchParams.get("bulan") || "all");
  
  // Filter options
  const [categories, setCategories] = useState<Category[]>([]);
  const [airlines, setAirlines] = useState<FilterOption[]>([]);
  const [airports, setAirports] = useState<FilterOption[]>([]);
  
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Derived category data
  const mainCategories = useMemo(() => categories.filter(c => !c.parent_id), [categories]);
  const subCategories = useMemo(() => {
    if (selectedMainCategory === "all") {
      return categories.filter(c => c.parent_id);
    }
    return categories.filter(c => c.parent_id === selectedMainCategory);
  }, [categories, selectedMainCategory]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch packages with relations
      const { data: packagesData } = await supabase
        .from("packages")
        .select(`
          id, title, slug, description, package_type, image_url, duration_days,
          airline_id, airport_id, category_id, hotel_makkah_id,
          category:package_categories(id, name, parent_id),
          hotel_makkah:hotels!packages_hotel_makkah_id_fkey(id, star, name),
          airline:airlines!packages_airline_id_fkey(id, name),
          airport:airports!packages_airport_id_fkey(id, name, city),
          departures:package_departures(id, departure_date, remaining_quota, prices:departure_prices(price, room_type))
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      setPackages((packagesData as unknown as Package[]) || []);
      setLoading(false);

      // Fetch filter options in parallel
      const [categoriesRes, airlinesRes, airportsRes] = await Promise.all([
        supabase.from("package_categories").select("id, name, parent_id").eq("is_active", true).order("sort_order"),
        supabase.from("airlines").select("id, name"),
        supabase.from("airports").select("id, name, city"),
      ]);

      setCategories((categoriesRes.data as Category[]) || []);
      setAirlines(airlinesRes.data || []);
      setAirports(airportsRes.data || []);
    };

    fetchData();
  }, []);

  // Reset sub-category when main category changes
  useEffect(() => {
    setSelectedSubCategory("all");
  }, [selectedMainCategory]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (selectedMainCategory !== "all") params.set("tipe", selectedMainCategory);
    if (selectedSubCategory !== "all") params.set("kategori", selectedSubCategory);
    if (selectedAirline !== "all") params.set("maskapai", selectedAirline);
    if (selectedAirport !== "all") params.set("bandara", selectedAirport);
    if (selectedHotelStar !== "all") params.set("bintang", selectedHotelStar);
    if (selectedMonth !== "all") params.set("bulan", selectedMonth);
    setSearchParams(params);
  }, [search, selectedMainCategory, selectedSubCategory, selectedAirline, selectedAirport, selectedHotelStar, selectedMonth, setSearchParams]);

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

  // Get available months from departures
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    packages.forEach(pkg => {
      pkg.departures?.forEach(dep => {
        const date = new Date(dep.departure_date);
        if (date >= new Date()) {
          months.add(format(date, "yyyy-MM"));
        }
      });
    });
    return Array.from(months).sort();
  }, [packages]);

  // Filter packages
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      // Search filter
      if (search && !pkg.title.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      
      // Main category filter (Umroh, Haji)
      if (selectedMainCategory !== "all") {
        // Check if package's category or its parent matches
        const pkgCatParentId = pkg.category?.parent_id;
        const pkgCatId = pkg.category?.id;
        if (pkgCatParentId !== selectedMainCategory && pkgCatId !== selectedMainCategory) {
          return false;
        }
      }
      
      // Sub-category filter (Ekonomi, Plus, etc)
      if (selectedSubCategory !== "all" && pkg.category?.id !== selectedSubCategory) {
        return false;
      }
      
      // Airline filter
      if (selectedAirline !== "all" && pkg.airline?.id !== selectedAirline) {
        return false;
      }
      
      // Airport filter
      if (selectedAirport !== "all" && pkg.airport?.id !== selectedAirport) {
        return false;
      }
      
      // Hotel star filter
      if (selectedHotelStar !== "all" && pkg.hotel_makkah?.star !== parseInt(selectedHotelStar)) {
        return false;
      }
      
      // Month filter
      if (selectedMonth !== "all") {
        const hasMatchingDeparture = pkg.departures?.some(dep => {
          const depMonth = format(new Date(dep.departure_date), "yyyy-MM");
          return depMonth === selectedMonth;
        });
        if (!hasMatchingDeparture) return false;
      }
      
      return true;
    });
  }, [packages, search, selectedMainCategory, selectedSubCategory, selectedAirline, selectedAirport, selectedHotelStar, selectedMonth]);

  const activeFilterCount = [
    selectedMainCategory !== "all",
    selectedSubCategory !== "all",
    selectedAirline !== "all",
    selectedAirport !== "all",
    selectedHotelStar !== "all",
    selectedMonth !== "all"
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSelectedMainCategory("all");
    setSelectedSubCategory("all");
    setSelectedAirline("all");
    setSelectedAirport("all");
    setSelectedHotelStar("all");
    setSelectedMonth("all");
    setSearch("");
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Main Category */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Kategori Utama</Label>
        <Select value={selectedMainCategory} onValueChange={setSelectedMainCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {mainCategories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sub Category */}
      {subCategories.length > 0 && (
        <div>
          <Label className="text-sm font-medium mb-2 block">Sub Kategori</Label>
          <Select value={selectedSubCategory} onValueChange={setSelectedSubCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Semua Sub Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Sub Kategori</SelectItem>
              {subCategories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Hotel Star */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Bintang Hotel</Label>
        <Select value={selectedHotelStar} onValueChange={setSelectedHotelStar}>
          <SelectTrigger>
            <SelectValue placeholder="Semua Bintang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Bintang</SelectItem>
            <SelectItem value="5">⭐⭐⭐⭐⭐ Bintang 5</SelectItem>
            <SelectItem value="4">⭐⭐⭐⭐ Bintang 4</SelectItem>
            <SelectItem value="3">⭐⭐⭐ Bintang 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Airline */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Maskapai</Label>
        <Select value={selectedAirline} onValueChange={setSelectedAirline}>
          <SelectTrigger>
            <SelectValue placeholder="Semua Maskapai" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Maskapai</SelectItem>
            {airlines.map(airline => (
              <SelectItem key={airline.id} value={airline.id}>{airline.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Airport */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Bandara Keberangkatan</Label>
        <Select value={selectedAirport} onValueChange={setSelectedAirport}>
          <SelectTrigger>
            <SelectValue placeholder="Semua Bandara" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Bandara</SelectItem>
            {airports.map(airport => (
              <SelectItem key={airport.id} value={airport.id}>
                {airport.name} ({airport.city})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Departure Month */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Bulan Keberangkatan</Label>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger>
            <SelectValue placeholder="Semua Bulan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Bulan</SelectItem>
            {availableMonths.map(month => (
              <SelectItem key={month} value={month}>
                {format(new Date(month + "-01"), "MMMM yyyy", { locale: idLocale })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activeFilterCount > 0 && (
        <Button variant="outline" onClick={clearAllFilters} className="w-full">
          <X className="w-4 h-4 mr-2" />
          Hapus Filter ({activeFilterCount})
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen">
      <SEO
        title="Paket Perjalanan Umroh"
        description="Temukan paket perjalanan umroh terbaik sesuai kebutuhan dan budget Anda. Berbagai pilihan paket dari ekonomi hingga VIP."
      />
      <Navbar />
      <main className="pt-20">
        {/* Header */}
        <section className="bg-primary section-padding relative overflow-hidden">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 islamic-pattern pointer-events-none" />
          
          <div className="container-custom text-center relative z-10">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-5xl font-display font-bold text-primary-foreground mb-4"
            >
              Paket <span className="text-gradient-gold">Perjalanan</span>
            </motion.h1>
            <p className="text-primary-foreground/80 max-w-xl mx-auto mb-6">
              Temukan paket perjalanan terbaik sesuai kebutuhan dan budget Anda
            </p>

            {/* Main Category Tabs */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <Button
                variant={selectedMainCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMainCategory("all")}
                className={selectedMainCategory === "all" ? "gradient-gold text-primary" : "bg-card/50 text-primary-foreground border-gold/30 hover:bg-gold/20"}
              >
                Semua
              </Button>
              {mainCategories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedMainCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMainCategory(cat.id)}
                  className={selectedMainCategory === cat.id ? "gradient-gold text-primary" : "bg-card/50 text-primary-foreground border-gold/30 hover:bg-gold/20"}
                >
                  {cat.name}
                </Button>
              ))}
            </div>

            {/* Sub Category Tabs */}
            {subCategories.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSubCategory("all")}
                  className={selectedSubCategory === "all" ? "text-gold underline" : "text-primary-foreground/70 hover:text-gold"}
                >
                  Semua
                </Button>
                {subCategories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedSubCategory(cat.id)}
                    className={selectedSubCategory === cat.id ? "text-gold underline" : "text-primary-foreground/70 hover:text-gold"}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            )}

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

        {/* Main Content */}
        <BackgroundPattern className="section-padding bg-background">
          <div className="container-custom">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Sidebar Filters - Desktop */}
              <aside className="hidden lg:block w-72 flex-shrink-0">
                <div className="sticky top-24 bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                      <Filter className="w-5 h-5" />
                      Filter Paket
                    </h3>
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary">{activeFilterCount}</Badge>
                    )}
                  </div>
                  <FilterContent />
                </div>
              </aside>

              {/* Mobile Filter Button */}
              <div className="lg:hidden flex items-center justify-between mb-4">
                <p className="text-muted-foreground">
                  {filteredPackages.length} paket ditemukan
                </p>
                <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                      {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <Filter className="w-5 h-5" />
                        Filter Paket
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <FilterContent />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Packages Grid */}
              <div className="flex-1">
                {/* Active Filters Display */}
                {activeFilterCount > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {selectedMainCategory !== "all" && (
                      <Badge variant="secondary" className="gap-1">
                        {mainCategories.find(c => c.id === selectedMainCategory)?.name}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedMainCategory("all")} />
                      </Badge>
                    )}
                    {selectedSubCategory !== "all" && (
                      <Badge variant="secondary" className="gap-1">
                        {subCategories.find(c => c.id === selectedSubCategory)?.name}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedSubCategory("all")} />
                      </Badge>
                    )}
                    {selectedHotelStar !== "all" && (
                      <Badge variant="secondary" className="gap-1">
                        <Building className="w-3 h-3" /> Bintang {selectedHotelStar}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedHotelStar("all")} />
                      </Badge>
                    )}
                    {selectedAirline !== "all" && (
                      <Badge variant="secondary" className="gap-1">
                        <Plane className="w-3 h-3" /> {airlines.find(a => a.id === selectedAirline)?.name}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedAirline("all")} />
                      </Badge>
                    )}
                    {selectedAirport !== "all" && (
                      <Badge variant="secondary" className="gap-1">
                        <MapPin className="w-3 h-3" /> {airports.find(a => a.id === selectedAirport)?.city}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedAirport("all")} />
                      </Badge>
                    )}
                    {selectedMonth !== "all" && (
                      <Badge variant="secondary" className="gap-1">
                        <Calendar className="w-3 h-3" /> {format(new Date(selectedMonth + "-01"), "MMM yyyy", { locale: idLocale })}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedMonth("all")} />
                      </Badge>
                    )}
                  </div>
                )}

                {/* Results count */}
                <p className="hidden lg:block text-muted-foreground mb-6">
                  {filteredPackages.length} paket ditemukan
                </p>

                {loading ? (
                  <div className="flex justify-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
                  </div>
                ) : filteredPackages.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-muted-foreground mb-4">Tidak ada paket yang sesuai dengan filter</p>
                    <Button variant="outline" onClick={clearAllFilters}>
                      Hapus Semua Filter
                    </Button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredPackages.map((pkg, index) => (
                      <PackageCard key={pkg.id} pkg={pkg} index={index} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </BackgroundPattern>
      </main>
      <Footer />
    </div>
  );
};

export default Paket;
