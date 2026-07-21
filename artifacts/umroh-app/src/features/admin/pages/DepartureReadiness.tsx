/**
 * Dashboard Kesiapan Keberangkatan
 * Ringkasan per-departure: pembayaran, dokumen, kursi, check-in + blast notifikasi.
 */

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/shared/components/ui/dialog";
import { toast } from "sonner";
import {
  Users, CreditCard, FileCheck, PlaneTakeoff, ShieldCheck,
  Megaphone, Calendar, Clock, CheckCircle2, AlertCircle, Send,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Departure {
  id: string;
  departureDate: string;
  returnDate?: string | null;
  quota: number;
  packageTitle?: string;
}

interface ReadinessData {
  departure: {
    id: string;
    departureDate: string;
    returnDate?: string | null;
    quota: number;
    packageTitle?: string | null;
    daysUntil: number | null;
  };
  jemaah:   { total: number; bookings: number };
  payment:  { total: number; paid: number; unpaid: number };
  documents:{ total: number; complete: number; incomplete: number };
  seats:    { total: number; assigned: number; unassigned: number };
  checkIn:  { total: number; done: number; pending: number };
}

// ─── Progress ring ────────────────────────────────────────────────────────────

function ProgressRing({
  value, max, color, size = 80,
}: { value: number; max: number; color: string; size?: number }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={8} className="text-muted/30" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="currentColor" strokeWidth={8} className={color}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
    </svg>
  );
}

// ─── Readiness card ───────────────────────────────────────────────────────────

function ReadinessCard({
  title, icon: Icon, done, total, color, ringColor, suffix = "",
}: {
  title: string;
  icon: React.ElementType;
  done: number;
  total: number;
  color: string;
  ringColor: string;
  suffix?: string;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const isComplete = total > 0 && done >= total;

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className={`flex items-center gap-2 text-sm font-medium ${color}`}>
              <Icon className="h-4 w-4" />
              {title}
            </div>
            <div className="text-3xl font-bold tabular-nums">
              {done}
              <span className="text-base font-normal text-muted-foreground">
                {" "}/{" "}{total}{suffix}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isComplete ? "bg-emerald-500" : ringColor.replace("text-", "bg-")}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`text-xs font-semibold tabular-nums ${isComplete ? "text-emerald-600" : "text-muted-foreground"}`}>
                {pct}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {total - done} belum selesai
            </p>
          </div>
          <div className="relative flex items-center justify-center">
            <ProgressRing value={done} max={total} color={isComplete ? "text-emerald-500" : ringColor} size={76} />
            <span className="absolute text-sm font-bold tabular-nums">
              {pct}%
            </span>
          </div>
        </div>
        {isComplete && (
          <div className="absolute top-2 right-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Blast dialog ─────────────────────────────────────────────────────────────

function BlastDialog({ departureId, packageTitle }: { departureId: string; packageTitle?: string | null }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState<"both" | "wa" | "email">("both");

  const blast = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean; total: number; sentWa: number; sentEmail: number }>(
        `/api/admin/departures/${departureId}/blast`,
        { method: "POST", body: JSON.stringify({ message, channel }) }
      ),
    onSuccess: (r) => {
      toast.success(
        `Notifikasi terkirim ke ${r.total} penerima — WA: ${r.sentWa}, Email: ${r.sentEmail}`
      );
      setOpen(false);
      setMessage("");
    },
    onError: (e: any) => toast.error(e.message || "Gagal mengirim notifikasi"),
  });

  const TEMPLATES = [
    { label: "Pengingat dokumen", text: "Mohon segera melengkapi dokumen perjalanan (paspor, visa, vaksin) sebelum tanggal keberangkatan." },
    { label: "Pengingat pelunasan", text: "Harap segera menyelesaikan pembayaran sebelum batas waktu yang telah ditentukan agar keberangkatan Anda tidak terganggu." },
    { label: "Info manasik", text: "Kami mengundang Bapak/Ibu untuk menghadiri kegiatan manasik umroh yang akan segera dijadwalkan. Detail akan disampaikan lebih lanjut." },
    { label: "Pengingat H-7", text: "Keberangkatan Anda tinggal 7 hari lagi! Pastikan semua perlengkapan dan dokumen sudah siap. Hubungi kami jika ada pertanyaan." },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-gold text-primary gap-2">
          <Megaphone className="h-4 w-4" />
          Blast Notifikasi
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Kirim Notifikasi Massal
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="text-sm text-muted-foreground">
            Pesan akan dikirim ke semua jemaah keberangkatan{" "}
            <strong>{packageTitle ?? "ini"}</strong>.
          </div>

          {/* Template quick picks */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Template cepat</Label>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => setMessage(t.text)}
                  className="text-xs border rounded-full px-2.5 py-1 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Pesan *</Label>
            <Textarea
              placeholder="Tulis pesan untuk dikirim ke semua jemaah..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Nama jemaah, nama paket, dan kode booking akan ditambahkan otomatis.
            </p>
          </div>

          <div>
            <Label className="mb-1.5 block">Kirim via</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">WhatsApp + Email</SelectItem>
                <SelectItem value="wa">WhatsApp saja</SelectItem>
                <SelectItem value="email">Email saja</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button
              onClick={() => blast.mutate()}
              disabled={!message.trim() || blast.isPending}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {blast.isPending ? "Mengirim..." : "Kirim Sekarang"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DepartureReadiness() {
  const [searchParams] = useSearchParams();
  const [departureId, setDepartureId] = useState(searchParams.get("departureId") ?? "");

  const { data: departures = [] } = useQuery<Departure[]>({
    queryKey: ["readiness-dep-list"],
    queryFn: () => apiFetch<any>("/api/admin/departures").then((r) => r.data ?? r),
  });

  const { data, isLoading } = useQuery<ReadinessData>({
    queryKey: ["departure-readiness", departureId],
    queryFn: () => apiFetch(`/api/admin/departures/${departureId}/readiness`),
    enabled: !!departureId,
  });

  const dep = data?.departure;

  const daysLabel = (d: number | null | undefined) => {
    if (d === null || d === undefined) return null;
    if (d < 0) return { text: `${Math.abs(d)} hari lalu`, color: "text-muted-foreground" };
    if (d === 0) return { text: "Hari ini!", color: "text-red-600 font-bold" };
    if (d <= 7) return { text: `H-${d}`, color: "text-red-500 font-semibold" };
    if (d <= 30) return { text: `H-${d}`, color: "text-amber-600 font-semibold" };
    return { text: `H-${d}`, color: "text-emerald-600 font-semibold" };
  };

  const dLabel = daysLabel(dep?.daysUntil);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Kesiapan Keberangkatan</h1>
          <p className="text-sm text-muted-foreground">
            Pantau progress pembayaran, dokumen, kursi, dan check-in per keberangkatan
          </p>
        </div>
        {departureId && data && (
          <BlastDialog departureId={departureId} packageTitle={dep?.packageTitle} />
        )}
      </div>

      {/* Departure selector */}
      <div className="max-w-sm">
        <Select value={departureId} onValueChange={setDepartureId}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih keberangkatan..." />
          </SelectTrigger>
          <SelectContent>
            {departures.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.packageTitle ?? "Paket"} —{" "}
                {d.departureDate
                  ? format(new Date(d.departureDate), "dd MMM yyyy", { locale: localeId })
                  : "-"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!departureId ? (
        <Card>
          <CardContent className="py-20 text-center text-muted-foreground">
            <PlaneTakeoff className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Pilih keberangkatan untuk melihat dashboard kesiapan</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-36 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : data && dep ? (
        <>
          {/* Departure summary banner */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-4 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">{dep.packageTitle ?? "Paket Umroh"}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {dep.departureDate
                        ? format(new Date(dep.departureDate), "d MMMM yyyy", { locale: localeId })
                        : "-"}
                    </span>
                    {dep.returnDate && (
                      <span className="flex items-center gap-1">
                        → {format(new Date(dep.returnDate), "d MMMM yyyy", { locale: localeId })}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {data.jemaah.bookings} booking / {dep.quota} kuota
                    </span>
                  </div>
                </div>
                {dLabel && (
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      Countdown
                    </div>
                    <p className={`text-2xl font-bold ${dLabel.color}`}>{dLabel.text}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Readiness cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <ReadinessCard
              title="Pembayaran Lunas"
              icon={CreditCard}
              done={data.payment.paid}
              total={data.payment.total}
              color="text-blue-600"
              ringColor="text-blue-500"
              suffix=" booking"
            />
            <ReadinessCard
              title="Dokumen Lengkap"
              icon={FileCheck}
              done={data.documents.complete}
              total={data.documents.total}
              color="text-violet-600"
              ringColor="text-violet-500"
              suffix=" jemaah"
            />
            <ReadinessCard
              title="Kursi Terassign"
              icon={PlaneTakeoff}
              done={data.seats.assigned}
              total={data.seats.total}
              color="text-amber-600"
              ringColor="text-amber-500"
              suffix=" jemaah"
            />
            <ReadinessCard
              title="Check-In Selesai"
              icon={ShieldCheck}
              done={data.checkIn.done}
              total={data.checkIn.total}
              color="text-emerald-600"
              ringColor="text-emerald-500"
              suffix=" jemaah"
            />

            {/* Alert card — items that need attention */}
            <Card className="sm:col-span-2 xl:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Yang Perlu Perhatian
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.payment.unpaid > 0 && (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-red-50 border border-red-100">
                    <span className="text-sm text-red-700 flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5" />
                      {data.payment.unpaid} booking belum lunas
                    </span>
                    <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                      Pembayaran
                    </Badge>
                  </div>
                )}
                {data.documents.incomplete > 0 && (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-violet-50 border border-violet-100">
                    <span className="text-sm text-violet-700 flex items-center gap-2">
                      <FileCheck className="h-3.5 w-3.5" />
                      {data.documents.incomplete} jemaah dokumen belum lengkap
                    </span>
                    <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-xs">
                      Dokumen
                    </Badge>
                  </div>
                )}
                {data.seats.unassigned > 0 && (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-amber-50 border border-amber-100">
                    <span className="text-sm text-amber-700 flex items-center gap-2">
                      <PlaneTakeoff className="h-3.5 w-3.5" />
                      {data.seats.unassigned} kursi belum diassign
                    </span>
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                      Kursi
                    </Badge>
                  </div>
                )}
                {data.payment.unpaid === 0 && data.documents.incomplete === 0 && data.seats.unassigned === 0 && (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                    Semua item siap! Keberangkatan ini sudah fully prepared.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
