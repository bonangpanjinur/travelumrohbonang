import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/shared/lib/apiClient";
import { useAuth } from "@/shared/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/shared/components/ui/dialog";
import { FileText, Plus, ArrowLeft, Loader2, MapPin, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import SEO from "@/shared/components/seo/SEO";

type DailyReport = {
  id: string;
  departureId: string;
  reportDate: string;
  location: string | null;
  groupCondition: string | null;
  content: string | null;
  notes: string | null;
  status: string;
  createdAt: string | null;
};

type DepartureOption = {
  id: string;
  departureDate: string;
  returnDate: string | null;
  packageTitle: string | null;
};

const GROUP_CONDITIONS = [
  { value: "baik", label: "Baik — semua jamaah dalam kondisi prima" },
  { value: "sedang", label: "Sedang — ada beberapa catatan kecil" },
  { value: "butuh_perhatian", label: "Butuh Perhatian — ada jamaah yang perlu penanganan" },
];

const CONDITION_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  baik: { label: "Baik", variant: "default" },
  sedang: { label: "Sedang", variant: "secondary" },
  butuh_perhatian: { label: "Butuh Perhatian", variant: "destructive" },
};

const MuthawifLaporanHarian = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [reports, setReports] = useState<DailyReport[]>([]);
  const [departures, setDepartures] = useState<DepartureOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");
  const [form, setForm] = useState({
    departureId: "",
    reportDate: today,
    location: "",
    groupCondition: "",
    content: "",
    notes: "",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportsData, profileData] = await Promise.all([
        apiFetch<DailyReport[]>("/api/muthawif/laporan-harian"),
        apiFetch<{ assignedDepartures: DepartureOption[] }>("/api/muthawif/profile"),
      ]);
      setReports(reportsData || []);
      const deps = profileData.assignedDepartures ?? [];
      setDepartures(deps);
      // Pre-select first departure if only one
      if (deps.length === 1) {
        setForm((f) => ({ ...f, departureId: deps[0].id }));
      }
    } catch (err: any) {
      if (err?.status !== 404) toast.error("Gagal memuat laporan");
    } finally {
      setLoading(false);
    }
  };

  const openDialog = () => {
    setForm({
      departureId: departures.length === 1 ? departures[0].id : "",
      reportDate: today,
      location: "",
      groupCondition: "",
      content: "",
      notes: "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.departureId) {
      toast.error("Pilih keberangkatan terlebih dahulu");
      return;
    }
    if (!form.reportDate) {
      toast.error("Tanggal laporan harus diisi");
      return;
    }
    if (!form.content?.trim()) {
      toast.error("Isi laporan harus diisi");
      return;
    }

    setSaving(true);
    try {
      const created = await apiFetch<DailyReport>("/api/muthawif/laporan-harian", {
        method: "POST",
        body: JSON.stringify({
          departureId: form.departureId,
          reportDate: form.reportDate,
          location: form.location || null,
          groupCondition: form.groupCondition || null,
          content: form.content,
          notes: form.notes || null,
        }),
      });
      setReports((prev) => [created, ...prev]);
      toast.success("Laporan harian berhasil disimpan");
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan laporan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SEO title="Laporan Harian" description="Laporan harian muthawif selama di lapangan" />
      <div className="min-h-screen bg-muted/30 p-4 lg:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => navigate("/muthawif")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                Laporan Harian
              </h1>
              <p className="text-sm text-muted-foreground">{reports.length} laporan</p>
            </div>
            <Button onClick={openDialog} disabled={departures.length === 0}>
              <Plus className="w-4 h-4 mr-2" /> Buat Laporan
            </Button>
          </div>

          {/* Reports list */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  {departures.length === 0
                    ? "Belum ada keberangkatan yang ditugaskan."
                    : "Belum ada laporan harian. Buat laporan pertama Anda."}
                </p>
                {departures.length > 0 && (
                  <Button onClick={openDialog}>
                    <Plus className="w-4 h-4 mr-2" /> Buat Laporan
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => {
                const badge = CONDITION_BADGE[report.groupCondition ?? ""];
                const dep = departures.find((d) => d.id === report.departureId);
                return (
                  <Card key={report.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <CardTitle className="text-sm font-semibold">
                            {report.reportDate
                              ? format(new Date(report.reportDate), "EEEE, dd MMMM yyyy", { locale: localeId })
                              : report.reportDate}
                          </CardTitle>
                          {dep && (
                            <CardDescription className="text-xs mt-0.5">
                              {dep.packageTitle ?? "Paket"}{" "}
                              {dep.departureDate
                                ? `· ${format(new Date(dep.departureDate), "dd MMM yyyy", { locale: localeId })}`
                                : ""}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {badge && (
                            <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
                          )}
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Terkirim
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {report.location && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{report.location}</span>
                        </div>
                      )}
                      {report.content && (
                        <p className="text-sm text-foreground leading-relaxed">{report.content}</p>
                      )}
                      {report.notes && (
                        <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
                          <span className="font-medium">Catatan: </span>{report.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Report Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Laporan Harian</DialogTitle>
            <DialogDescription>Catat kondisi jamaah dan situasi di lapangan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {departures.length > 1 && (
              <div className="space-y-1.5">
                <Label>Keberangkatan *</Label>
                <Select value={form.departureId} onValueChange={(v) => setForm({ ...form, departureId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih keberangkatan…" />
                  </SelectTrigger>
                  <SelectContent>
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
            )}

            <div className="space-y-1.5">
              <Label htmlFor="report-date">Tanggal Laporan *</Label>
              <Input
                id="report-date"
                type="date"
                value={form.reportDate}
                onChange={(e) => setForm({ ...form, reportDate: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Lokasi</Label>
              <Input
                id="location"
                placeholder="Makkah, Madinah, Transit…"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Kondisi Jamaah</Label>
              <Select value={form.groupCondition} onValueChange={(v) => setForm({ ...form, groupCondition: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kondisi…" />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_CONDITIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="content">Isi Laporan *</Label>
              <Textarea
                id="content"
                placeholder="Ceritakan aktivitas hari ini, kondisi jamaah, kendala yang dihadapi…"
                rows={4}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Catatan Internal</Label>
              <Textarea
                id="notes"
                placeholder="Catatan tambahan untuk admin (opsional)…"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Kirim Laporan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MuthawifLaporanHarian;
