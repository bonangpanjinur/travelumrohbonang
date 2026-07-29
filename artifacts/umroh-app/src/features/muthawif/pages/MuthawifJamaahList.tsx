import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/shared/lib/apiClient";
import { useAuth } from "@/shared/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Users, Search, ArrowLeft, Loader2, UserCircle, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import SEO from "@/shared/components/seo/SEO";

type JamaahRow = {
  bookingId: string;
  bookingCode: string;
  bookingStatus: string;
  departureId: string;
  createdAt: string | null;
  profileId: string | null;
  profileName: string | null;
  profilePhone: string | null;
  profileEmail: string | null;
};

type DepartureOption = {
  id: string;
  departureDate: string;
  packageTitle: string | null;
};

const MuthawifJamaahList = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialDepartureId = searchParams.get("departureId") ?? "__all__";

  const [jamaah, setJamaah] = useState<JamaahRow[]>([]);
  const [departures, setDepartures] = useState<DepartureOption[]>([]);
  const [selectedDeparture, setSelectedDeparture] = useState<string>(initialDepartureId);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    loadDepartures();
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading && user) {
      loadJamaah();
    }
  }, [selectedDeparture, user, authLoading]);

  const loadDepartures = async () => {
    try {
      const profile = await apiFetch<{ assignedDepartures: DepartureOption[] }>("/api/muthawif/profile");
      setDepartures(profile.assignedDepartures ?? []);
    } catch {
      // ignore
    }
  };

  const loadJamaah = async () => {
    setLoading(true);
    try {
      const qs = selectedDeparture !== "__all__" ? `?departureId=${selectedDeparture}` : "";
      const data = await apiFetch<JamaahRow[]>(`/api/muthawif/jamaah${qs}`);
      setJamaah(data || []);
    } catch (err: any) {
      if (err?.status !== 404) toast.error("Gagal memuat data jamaah");
      setJamaah([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = jamaah.filter((j) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (j.profileName ?? "").toLowerCase().includes(q) ||
      (j.profileEmail ?? "").toLowerCase().includes(q) ||
      (j.profilePhone ?? "").toLowerCase().includes(q) ||
      (j.bookingCode ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <SEO title="Data Jamaah Binaan" description="Daftar jamaah yang menjadi tanggung jawab muthawif" />
      <div className="min-h-screen bg-muted/30 p-4 lg:p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => navigate("/muthawif")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                Data Jamaah Binaan
              </h1>
              <p className="text-sm text-muted-foreground">
                {filtered.length} jamaah{search ? " (terfilter)" : ""}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Cari nama, email, telepon, kode booking…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={selectedDeparture} onValueChange={setSelectedDeparture}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Semua keberangkatan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Semua keberangkatan</SelectItem>
                {departures.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.packageTitle ?? "Paket"}{" "}
                    {d.departureDate
                      ? `(${format(new Date(d.departureDate), "dd MMM yyyy", { locale: localeId })})`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <UserCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {search ? "Tidak ada jamaah yang sesuai pencarian." : "Belum ada jamaah binaan."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Kontak</TableHead>
                        <TableHead>Kode Booking</TableHead>
                        <TableHead>Tanggal Booking</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((j) => (
                        <TableRow key={j.bookingId}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium text-sm">{j.profileName || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5 text-xs text-muted-foreground">
                              {j.profilePhone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {j.profilePhone}
                                </div>
                              )}
                              {j.profileEmail && (
                                <div className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" /> {j.profileEmail}
                                </div>
                              )}
                              {!j.profilePhone && !j.profileEmail && "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs">{j.bookingCode}</span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {j.createdAt
                              ? format(new Date(j.createdAt), "dd MMM yyyy", { locale: localeId })
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={j.bookingStatus === "paid" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {j.bookingStatus === "paid" ? "Lunas" : j.bookingStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default MuthawifJamaahList;
