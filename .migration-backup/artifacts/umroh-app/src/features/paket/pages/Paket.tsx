import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/shared/components/layout/Navbar";
import Footer from "@/shared/components/layout/Footer";
import PageFAQ from "@/features/cms/components/PageFAQ";
import BackgroundPattern from "@/shared/components/common/BackgroundPattern";
import { Button } from "@/shared/components/ui/button";
import { motion } from "framer-motion";
import { Search, Filter, X, Building } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/components/ui/sheet";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import PackageCard, { type PackageCardData } from "@/features/paket/components/PackageCard";
import SEO from "@/shared/components/seo/SEO";
import BreadcrumbJsonLd from "@/shared/components/seo/BreadcrumbJsonLd";

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

const API_BASE = import.meta.env.VITE_API_URL || "";

const Paket = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") || "");

  const [selectedMainCategory, setSelectedMainCategory] = useState(searchParams.get("tipe") || "all");
  const [selectedSubCategory, setSelectedSubCategory] = useState(searchParams.get("kategori") || "all");
  const [selectedAirline, setSelectedAirline] = useState(searchParams.get("maskapai") || "all");
  const [selectedAirport, setSelectedAirport] = useState(searchParams.get("bandara") || "all");
  const [selectedHotelStar, setSelectedHotelStar] = useState(searchParams.get("bintang") || "all");
  const [selectedMonth, setSelectedMonth] = useState(searchParams.get("bulan") || "all");
  const [selectedPriceRange, setSelectedPriceRange] = useState(searchParams.get("harga") || "all");
  const [selectedDuration, setSelectedDuration] = useState(searchParams.get("durasi") || "all");

  const [categories, setCategories] = useState<Category[]>([]);
  const [airlines, setAirlines] = useState<FilterOption[]>([]);
  const [airports, setAirports] = useState<FilterOption[]>([]);

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const mainCategories = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const subCategories = useMemo(() => {
    if (selectedMainCategory === "all") return categories.filter((c) => c.parent_id);
    return categories.filter((c) => c.parent_id === selectedMainCategory);
  }, [categories, selectedMainCategory]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pkgsRes, filterRes] = await Promise.all([
          fetch(`${API_BASE}/api/packages`),
          fetch(`${API_BASE}/api/packages/filter-options`),
        ]);

        if (pkgsRes.ok) {
          const json = await pkgsRes.json();
          setPackages((json.data as Package[]) || []);
        }

        if (filterRes.ok) {
          const f = await filterRes.json();
          setCategories(f.categories || []);
          setAirlines(f.airlines || []);
          setAirports(f.airports || []);
        }
      } catch (err) {
        console.error("Failed to fetch packages:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const isFirstMainCategoryRender = useRef(true);
  useEffect(() => {
    if (isFirstMainCategoryRender.current) {
      isFirstMainCategoryRender.current = false;
      return;
    }
    setSelectedSubCategory("all");
  }, [selectedMainCategory]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (selectedMainCategory !== "all") params.set("tipe", selectedMainCategory);
    if (selectedSubCategory !== "all") params.set("kategori", selectedSubCategory);
    if (selectedAirline !== "all") params.set("maskapai", selectedAirline);
    if (selectedAirport !== "all") params.set("bandara", selectedAirport);
    if (selectedHotelStar !== "all") params.set("bintang", selectedHotelStar);
    if (selectedMonth !== "all") params.set("bulan", selectedMonth);
    if (selectedPriceRange !== "all") params.set("harga", selectedPriceRange);
    if (selectedDuration !== "all") params.set("durasi", selectedDuration);
    setSearchParams(params);
  }, [search, selectedMainCategory, selectedSubCategory, selectedAirline, selectedAirport, selectedHotelStar, selectedMonth, selectedPriceRange, selectedDuration, setSearchParams]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    packages.forEach((pkg) => {
      pkg.departures?.forEach((dep) => {
        const date = new Date(dep.departure_date);
        if (date >= new Date()) months.add(format(date, "yyyy-MM"));
      });
    });
    return Array.from(months).sort();
  }, [packages]);

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (search && !(pkg.title ?? "").toLowerCase().includes(search.toLowerCase())) return false;

      if (selectedMainCategory !== "all") {
        const pkgCatParentId = pkg.category?.parent_id;
        const pkgCatId = pkg.category?.id;
        if (pkgCatParentId !== selectedMainCategory && pkgCatId !== selectedMainCategory) return false;
      }

      if (selectedSubCategory !== "all" && pkg.category?.id !== selectedSubCategory) return false;
      if (selectedAirline !== "all" && pkg.airline?.id !== selectedAirline) return false;
      if (selectedAirport !== "all" && pkg.airport?.id !== selectedAirport) return false;
      if (selectedHotelStar !== "all" && pkg.hotel_makkah?.star !== parseInt(selectedHotelStar)) return false;

      if (selectedMonth !== "all") {
        const hasMatch = pkg.departures?.some((dep) => {
          const depMonth = format(new Date(dep.departure_date), "yyyy-MM");
          return depMonth === selectedMonth;
        });
        if (!hasMatch) return false;
      }

      if (selectedPriceRange !== "all") {
        const allPrices = (pkg.departures || []).flatMap((d) => (d.prices || []).map((p) => p.price));
        const min = allPrices.length ? Math.min(...allPrices) : 0;
        const [loStr, hiStr] = selectedPriceRange.split("-");
        const lo = Number(loStr);
        const hi = hiStr === "max" ? Infinity : Number(hiStr);
        if (min < lo || min > hi) return false;
      }

      if (selectedDuration !== "all") {
        const d = pkg.duration_days || 0;
        const [loStr, hiStr] = selectedDuration.split("-");
        const lo = Number(loStr);
        const hi = hiStr === "max" ? Infinity : Number(hiStr);
        if (d < lo || d > hi) return false;
      }

      return true;
    });
  }, [packages, search, selectedMainCategory, selectedSubCategory, selectedAirline, selectedAirport, selectedHotelStar, selectedMonth, selectedPriceRange, selectedDuration]);

  const activeFilterCount = [
    selectedMainCategory !== "all",
    selectedSubCategory !== "all",
    selectedAirline !== "all",
    selectedAirport !== "all",
    selectedHotelStar !== "all",
    selectedMonth !== "all",
    selectedPriceRange !== "all",
    selectedDuration !== "all",
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSelectedMainCategory("all");
    setSelectedSubCategory("all");
    setSelectedAirline("all");
    setSelectedAirport("all");
    setSelectedHotelStar("all");
    setSelectedMonth("all");
    setSelectedPriceRange("all");
    setSelectedDuration("all");
    setSearch("");
  };

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-medium mb-2 block">Kategori Utama</Label>
        <Select value={selectedMainCategory} onValueChange={setSelectedMainCategory}>
          <SelectTrigger><SelectValue placeholder="Semua Kategori" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {mainCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {subCategories.length > 0 && (
        <div>
          <Label className="text-sm font-medium mb-2 block">Sub Kategori</Label>
          <Select value={selectedSubCategory} onValueChange={setSelectedSubCategory}>
            <SelectTrigger><SelectValue placeholder="Semua Sub Kategori" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Sub Kategori</SelectItem>
              {subCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label className="text-sm font-medium mb-2 block">Bintang Hotel</Label>
        <Select value={selectedHotelStar} onValueChange={setSelectedHotelStar}>
          <SelectTrigger><SelectValue placeholder="Semua Bintang" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Bintang</SelectItem>
            <SelectItem value="5">⭐⭐⭐⭐⭐ Bintang 5</SelectItem>
            <SelectItem value="4">⭐⭐⭐⭐ Bintang 4</SelectItem>
            <SelectItem value="3">⭐⭐⭐ Bintang 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Maskapai</Label>
        <Select value={selectedAirline} onValueChange={setSelectedAirline}>
          <SelectTrigger><SelectValue placeholder="Semua Maskapai" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Maskapai</SelectItem>
            {airlines.map((airline) => (
              <SelectItem key={airline.id} value={airline.id}>{airline.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Bandara Keberangkatan</Label>
        <Select value={selectedAirport} onValueChange={setSelectedAirport}>
          <SelectTrigger><SelectValue placeholder="Semua Bandara" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Bandara</SelectItem>
            {airports.map((airport) => (
              <SelectItem key={airport.id} value={airport.id}>
                {airport.name} ({airport.city})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Bulan Keberangkatan</Label>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger><SelectValue placeholder="Semua Bulan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Bulan</SelectItem>
            {availableMonths.map((month) => (
              <SelectItem key={month} value={month}>
                {format(new Date(month + "-01"), "MMMM yyyy", { locale: idLocale })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Rentang Harga</Label>
        <Select value={selectedPriceRange} onValueChange={setSelectedPriceRange}>
          <SelectTrigger><SelectValue placeholder="Semua Harga" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Harga</SelectItem>
            <SelectItem value="0-25000000">{"< Rp 25 jt"}</SelectItem>
            <SelectItem value="25000000-35000000">Rp 25 – 35 jt</SelectItem>
            <SelectItem value="35000000-50000000">Rp 35 – 50 jt</SelectItem>
            <SelectItem value="50000000-max">{"> Rp 50 jt"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Durasi</Label>
        <Select value={selectedDuration} onValueChange={setSelectedDuration}>
          <SelectTrigger><SelectValue placeholder="Semua Durasi" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Durasi</SelectItem>
            <SelectItem value="0-9">≤ 9 hari</SelectItem>
            <SelectItem value="10-12">10 – 12 hari</SelectItem>
            <SelectItem value="13-15">13 – 15 hari</SelectItem>
            <SelectItem value="16-max">{"> 15 hari"}</SelectItem>
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
      <BreadcrumbJsonLd
        items={[
          { name: "Beranda", url: "/" },
          { name: "Paket", url: "/paket" },
        ]}
      />
      <Navbar />
      <main className="pt-20">
        <section className="bg-primary section-padding relative overflow-hidden">
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

        <BackgroundPattern className="section-padding bg-background">
          <div className="container-custom">
            <div className="flex flex-col lg:flex-row gap-8">
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

              <div className="lg:hidden flex items-center justify-between mb-4">
                <p className="text-muted-foreground">{filteredPackages.length} paket ditemukan</p>
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
                        <Filter className="w-5 h-5" /> Filter Paket
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-6"><FilterContent /></div>
                  </SheetContent>
                </Sheet>
              </div>

              <div className="flex-1">
                {activeFilterCount > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {selectedMainCategory !== "all" && (
                      <Badge variant="secondary" className="gap-1">
                        {mainCategories.find((c) => c.id === selectedMainCategory)?.name}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedMainCategory("all")} />
                      </Badge>
                    )}
                    {selectedSubCategory !== "all" && (
                      <Badge variant="secondary" className="gap-1">
                        {subCategories.find((c) => c.id === selectedSubCategory)?.name}
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
                        {airlines.find((a) => a.id === selectedAirline)?.name}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedAirline("all")} />
                      </Badge>
                    )}
                    {selectedAirport !== "all" && (
                      <Badge variant="secondary" className="gap-1">
                        {airports.find((a) => a.id === selectedAirport)?.name}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedAirport("all")} />
                      </Badge>
                    )}
                    {selectedMonth !== "all" && (
                      <Badge variant="secondary" className="gap-1">
                        {format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: idLocale })}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedMonth("all")} />
                      </Badge>
                    )}
                    {selectedPriceRange !== "all" && (
                      <Badge variant="secondary" className="gap-1">
                        Harga: {selectedPriceRange}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedPriceRange("all")} />
                      </Badge>
                    )}
                    {selectedDuration !== "all" && (
                      <Badge variant="secondary" className="gap-1">
                        Durasi: {selectedDuration} hari
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedDuration("all")} />
                      </Badge>
                    )}
                  </div>
                )}

                <div className="hidden lg:flex items-center justify-between mb-6">
                  <p className="text-muted-foreground">
                    {loading ? "Memuat..." : `${filteredPackages.length} paket ditemukan`}
                  </p>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-card rounded-xl h-80 animate-pulse" />
                    ))}
                  </div>
                ) : filteredPackages.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-2xl mb-2">🔍</p>
                    <p className="text-muted-foreground">
                      {packages.length === 0 ? "Belum ada paket tersedia" : "Tidak ada paket yang sesuai filter"}
                    </p>
                    {activeFilterCount > 0 && (
                      <Button variant="outline" className="mt-4" onClick={clearAllFilters}>
                        Hapus semua filter
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredPackages.map((pkg, i) => (
                      <PackageCard key={pkg.id} pkg={pkg} index={i} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </BackgroundPattern>
      </main>
      <PageFAQ scope="general" />
      <Footer />
    </div>
  );
};

export default Paket;
