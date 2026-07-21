import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Calendar, Search, Clock, Users, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";

interface Departure {
  id: string;
  departureDate: string;
  returnDate: string | null;
  quota: number;
  remainingQuota: number;
  status: string;
  package: {
    id: string;
    title: string;
    slug: string;
    durationDays: number | null;
  };
  lowestPrice: number | null;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);

const getStatusInfo = (dep: Departure) => {
  if (dep.remainingQuota === 0 || dep.status === "penuh")
    return { label: "Penuh", className: "bg-red-100 text-red-700 border-red-200" };
  if (dep.quota > 0 && dep.remainingQuota / dep.quota <= 0.2)
    return { label: "Hampir Penuh", className: "bg-amber-100 text-amber-700 border-amber-200" };
  if (dep.status === "closed")
    return { label: "Ditutup", className: "bg-gray-100 text-gray-600 border-gray-200" };
  return { label: "Tersedia", className: "bg-green-100 text-green-700 border-green-200" };
};

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const currentYear = new Date().getFullYear();
const YEARS = [currentYear, currentYear + 1, currentYear + 2];

export default function Jadwal() {
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");

  const params = new URLSearchParams();
  if (selectedMonth !== "all") params.set("month", selectedMonth);
  if (selectedYear !== "all") params.set("year", selectedYear);

  const { data, isLoading } = useQuery({
    queryKey: ["public-jadwal", selectedMonth, selectedYear],
    queryFn: () =>
      apiFetch<{ data: Departure[] }>(`/api/packages/jadwal?${params}`),
    select: (r) => r.data,
    staleTime: 5 * 60 * 1000,
  });

  const departures = data ?? [];

  const filtered = departures.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.package.title.toLowerCase().includes(q) ||
      (d.departureDate &&
        format(new Date(d.departureDate), "MMMM yyyy", { locale: localeId })
          .toLowerCase()
          .includes(q))
    );
  });

  // Group by "MMMM yyyy"
  const grouped = filtered.reduce<Record<string, Departure[]>>((acc, dep) => {
    const key = dep.departureDate
      ? format(new Date(dep.departureDate), "MMMM yyyy", { locale: localeId })
      : "Tanpa Tanggal";
    if (!acc[key]) acc[key] = [];
    acc[key].push(dep);
    return acc;
  }, {});

  const groupKeys = Object.keys(grouped);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 py-14 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Jadwal Keberangkatan Umroh
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Temukan jadwal yang sesuai dengan rencana perjalanan ibadah Anda
          </p>
        </div>
      </div>

      {/* Sticky filter bar */}
      <div className="border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari paket..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Bulan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bulan</SelectItem>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Tahun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : groupKeys.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Calendar className="h-14 w-14 mx-auto mb-4 opacity-30" />
            <p className="font-medium text-lg">Tidak ada jadwal ditemukan</p>
            <p className="text-sm mt-1">Coba ubah filter atau kata kunci pencarian</p>
          </div>
        ) : (
          <div className="space-y-12">
            {groupKeys.map((month) => (
              <div key={month}>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 pb-2 border-b">
                  <Calendar className="w-5 h-5 text-primary" />
                  {month}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({grouped[month].length} jadwal)
                  </span>
                </h2>
                <div className="space-y-3">
                  {grouped[month].map((dep) => {
                    const statusInfo = getStatusInfo(dep);
                    const isFull =
                      dep.remainingQuota === 0 || dep.status === "penuh" || dep.status === "closed";
                    return (
                      <div
                        key={dep.id}
                        className="bg-card border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex-1">
                          <div className="flex flex-wrap items-start gap-3">
                            <div>
                              <p className="font-semibold text-base">{dep.package.title}</p>
                              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {dep.departureDate
                                    ? format(new Date(dep.departureDate), "d MMMM yyyy", {
                                        locale: localeId,
                                      })
                                    : "-"}
                                  {dep.returnDate && (
                                    <>
                                      {" — "}
                                      {format(new Date(dep.returnDate), "d MMMM yyyy", {
                                        locale: localeId,
                                      })}
                                    </>
                                  )}
                                </span>
                                {dep.package.durationDays && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {dep.package.durationDays} hari
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5" />
                                  Sisa {dep.remainingQuota} kursi
                                </span>
                              </div>
                              {dep.lowestPrice !== null && (
                                <p className="mt-2 text-primary font-semibold text-sm">
                                  Mulai {formatPrice(dep.lowestPrice)}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs shrink-0 ${statusInfo.className}`}
                            >
                              {statusInfo.label}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/paket/${dep.package.slug}`}>Detail Paket</Link>
                          </Button>
                          {!isFull && (
                            <Button size="sm" asChild className="gap-1">
                              <Link to={`/booking/${dep.package.slug}/${dep.id}`}>
                                Daftar <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="mt-14 text-center border-t pt-10">
            <p className="text-muted-foreground mb-4">Tidak menemukan jadwal yang cocok?</p>
            <Button variant="outline" asChild>
              <Link to="/paket">Lihat Semua Paket Umroh</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
