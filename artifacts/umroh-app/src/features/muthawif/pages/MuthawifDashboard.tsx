import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/shared/lib/apiClient";
import { useAuth } from "@/shared/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Users, CalendarDays, FileText, MapPin, Loader2, ShieldAlert, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import SEO from "@/shared/components/seo/SEO";

type MuthawifProfile = {
  id: string;
  name: string;
  phone: string | null;
  photoUrl: string | null;
  assignedDepartures: {
    id: string;
    departureDate: string;
    returnDate: string | null;
    status: string | null;
    quota: number;
    remainingQuota: number;
    packageId: string | null;
    packageTitle: string | null;
    packageSlug: string | null;
  }[];
  stats: {
    totalDepartures: number;
    jamaahCount: number;
  };
};

type DailyReport = {
  id: string;
  departureId: string;
  reportDate: string;
  location: string | null;
  groupCondition: string | null;
  content: string | null;
  status: string;
  createdAt: string | null;
};

const GROUP_CONDITION_LABELS: Record<string, { label: string; color: string }> = {
  baik: { label: "Baik", color: "text-green-600" },
  sedang: { label: "Sedang", color: "text-yellow-600" },
  butuh_perhatian: { label: "Butuh Perhatian", color: "text-red-600" },
};

const DEPARTURE_STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Aktif", variant: "default" },
  completed: { label: "Selesai", variant: "secondary" },
  cancelled: { label: "Batal", variant: "destructive" },
  upcoming: { label: "Akan Datang", variant: "outline" },
};

const MuthawifDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MuthawifProfile | null>(null);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileData, reportsData] = await Promise.all([
        apiFetch<MuthawifProfile>("/api/muthawif/profile"),
        apiFetch<DailyReport[]>("/api/muthawif/laporan-harian").catch(() => []),
      ]);
      setProfile(profileData);
      setReports(reportsData || []);
    } catch (err: any) {
      if (err?.status === 404) {
        // Not registered as muthawif — show not-found state
        setProfile(null);
      } else {
        toast.error("Gagal memuat data portal muthawif");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 lg:p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-muted/30 p-6">
        <div className="max-w-2xl mx-auto pt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-primary" />
                Portal Muthawif
              </CardTitle>
              <CardDescription>Akun Anda belum terdaftar sebagai muthawif.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Hubungi admin untuk pendaftaran muthawif, atau kembali ke dashboard.
              </p>
              <Button onClick={() => navigate("/dashboard")}>Kembali ke Dashboard</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const recentReports = reports.slice(0, 3);
  const activeDepar = profile.assignedDepartures.filter(
    (d) => d.status === "active" || d.status === "upcoming",
  );
  const attentionReports = reports.filter((report) => report.groupCondition === "butuh_perhatian");

  return (
    <>
      <SEO title="Portal Muthawif" description="Dashboard muthawif — jamaah binaan dan laporan harian" />
      <div className="min-h-screen bg-muted/30 p-4 lg:p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="w-7 h-7 text-primary" />
                Portal Muthawif
              </h1>
              <p className="text-muted-foreground">
                Selamat datang, <span className="font-medium text-foreground">{profile.name}</span>
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => navigate("/muthawif/jamaah")}>
                <Users className="w-4 h-4 mr-2" /> Data Jamaah
              </Button>
              <Button onClick={() => navigate("/muthawif/laporan-harian")}>
                <FileText className="w-4 h-4 mr-2" /> Laporan Harian
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard icon={CalendarDays} label="Keberangkatan" value={profile.stats.totalDepartures} />
            <StatCard icon={Users} label="Jamaah Binaan" value={profile.stats.jamaahCount} color="text-primary" />
            <StatCard icon={FileText} label="Laporan Dibuat" value={reports.length} color="text-success" />
          </div>

          {attentionReports.length > 0 && <Card className="border-red-200 bg-red-50/60"><CardContent className="flex items-center justify-between gap-3 py-4"><div><p className="font-semibold text-red-700">Perhatian diperlukan</p><p className="text-sm text-red-700/80">{attentionReports.length} laporan menyatakan kondisi rombongan perlu ditindaklanjuti.</p></div><Button variant="outline" size="sm" onClick={() => navigate("/muthawif/laporan-harian")} className="border-red-200 text-red-700">Lihat laporan</Button></CardContent></Card>}

          {/* Assigned Departures */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                Keberangkatan Saya
              </CardTitle>
              <CardDescription>{profile.assignedDepartures.length} keberangkatan ditugaskan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.assignedDepartures.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Belum ada keberangkatan yang ditugaskan.
                </p>
              ) : (
                profile.assignedDepartures.map((dep) => {
                  const statusCfg = DEPARTURE_STATUS_MAP[dep.status ?? ""] ?? { label: dep.status ?? "-", variant: "outline" as const };
                  return (
                    <div
                      key={dep.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card gap-3 flex-wrap"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{dep.packageTitle ?? "Paket Tidak Diketahui"}</p>
                        <p className="text-xs text-muted-foreground">
                          {dep.departureDate
                            ? format(new Date(dep.departureDate), "dd MMM yyyy", { locale: localeId })
                            : "-"}
                          {dep.returnDate
                            ? ` — ${format(new Date(dep.returnDate), "dd MMM yyyy", { locale: localeId })}`
                            : ""}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Kuota: {dep.quota - dep.remainingQuota}/{dep.quota} jamaah
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={statusCfg.variant} className="text-xs">{statusCfg.label}</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/muthawif/jamaah?departureId=${dep.id}`)}
                        >
                          <Users className="w-3.5 h-3.5 mr-1" /> Jamaah
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Recent Reports */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Laporan Terbaru
                </CardTitle>
                <CardDescription>{reports.length} laporan</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/muthawif/laporan-harian")}>
                Lihat Semua
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentReports.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">Belum ada laporan harian.</p>
                  <Button size="sm" onClick={() => navigate("/muthawif/laporan-harian")}>
                    Buat Laporan Pertama
                  </Button>
                </div>
              ) : (
                recentReports.map((report) => {
                  const cond = GROUP_CONDITION_LABELS[report.groupCondition ?? ""] ?? null;
                  return (
                    <div key={report.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">
                              {report.reportDate
                                ? format(new Date(report.reportDate), "EEEE, dd MMM yyyy", { locale: localeId })
                                : report.reportDate}
                            </span>
                            {cond && (
                              <span className={`text-xs font-medium ${cond.color}`}>● {cond.label}</span>
                            )}
                          </div>
                          {report.location && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="w-3 h-3" />
                              <span>{report.location}</span>
                            </div>
                          )}
                          {report.content && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{report.content}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  color?: string;
}) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-muted">
        <Icon className={`w-5 h-5 ${color || "text-foreground"}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={`text-base font-bold truncate ${color || ""}`}>{value}</p>
      </div>
    </CardContent>
  </Card>
);

export default MuthawifDashboard;
