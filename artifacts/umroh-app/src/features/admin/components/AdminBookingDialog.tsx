/**
 * AdminBookingDialog — form booking terpadu (individu & rombongan, 1–N jamaah).
 * Menggantikan AdminCreateBookingDialog + AdminGroupBookingDialog.
 * Selalu menggunakan POST /api/admin/bookings/group (mendukung 1 jamaah).
 * Nama Pemesan WAJIB diisi.
 */
import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { useToast } from "@/shared/hooks/use-toast";
import {
  Loader2, Plus, Trash2, ChevronRight, Calendar, Package,
  UserRound, Users, CreditCard, Search,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useFormDraft } from "../hooks/useFormDraft";
import { FormDraftBanner } from "./FormDraftBanner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Pkg { id: string; title: string }

interface Departure {
  id: string;
  departure_date: string;
  return_date: string | null;
  remaining_quota: number;
  quota: number;
  prices: { room_type: string; price: number }[];
}

interface Branch { id: string; name: string }
interface Agent  { id: string; name: string; referral_code: string }
interface Profile { id: string; name: string; email: string; phone: string | null }

interface JamaahRow {
  name: string;
  phone: string;
  gender: "male" | "female" | "";
  roomType: string;
}

type Step = 1 | 2 | 3 | 4;

const ROOM_LABELS: Record<string, string> = {
  quad: "Quad", triple: "Triple", double: "Double", single: "Single",
};

const PAYMENT_SCHEMES = [
  { value: "full", label: "Lunas" },
  { value: "dp",   label: "DP / Cicilan" },
];

const emptyJamaah = (): JamaahRow => ({ name: "", phone: "", gender: "", roomType: "" });

// ── Draft shape ───────────────────────────────────────────────────────────────
// Must extend Record<string, unknown> to satisfy useFormDraft constraint.

interface DraftData extends Record<string, unknown> {
  packageId: string;
  departureId: string;
  paymentScheme: string;
  branchId: string;
  agentId: string;
  notes: string;
  pemesanName: string;
  pemesanPhone: string;
  pemesanEmail: string;
  groupName: string;
  jamaah: JamaahRow[];
  __step: Step;
}

const EMPTY_DRAFT: DraftData = {
  packageId: "", departureId: "", paymentScheme: "full",
  branchId: "", agentId: "", notes: "",
  pemesanName: "", pemesanPhone: "", pemesanEmail: "", groupName: "",
  jamaah: [emptyJamaah()],
  __step: 1,
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const AdminBookingDialog = ({ open, onOpenChange, onSuccess }: Props) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);

  // Reference data
  const [packages,   setPackages]   = useState<Pkg[]>([]);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [branches,   setBranches]   = useState<Branch[]>([]);
  const [agents,     setAgents]     = useState<Agent[]>([]);

  // Customer search
  const [profileSearch,  setProfileSearch]  = useState("");
  const [profileResults, setProfileResults] = useState<Profile[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);

  // Form state — lifted from draft
  const [packageId,     setPackageId]     = useState("");
  const [departureId,   setDepartureId]   = useState("");
  const [paymentScheme, setPaymentScheme] = useState("full");
  const [branchId,      setBranchId]      = useState("");
  const [agentId,       setAgentId]       = useState("");
  const [notes,         setNotes]         = useState("");
  const [pemesanName,   setPemesanName]   = useState("");
  const [pemesanPhone,  setPemesanPhone]  = useState("");
  const [pemesanEmail,  setPemesanEmail]  = useState("");
  const [groupName,     setGroupName]     = useState("");
  const [jamaah,        setJamaah]        = useState<JamaahRow[]>([emptyJamaah()]);

  const selectedDeparture = departures.find((d) => d.id === departureId);

  // ── Draft ─────────────────────────────────────────────────────────────────

  const draftValue: DraftData = {
    packageId, departureId, paymentScheme, branchId, agentId, notes,
    pemesanName, pemesanPhone, pemesanEmail, groupName, jamaah,
    __step: step,
  };

  const isDirty = packageId !== "" || pemesanName !== "";

  const handleRestore = useCallback((saved: DraftData) => {
    setPackageId(saved.packageId); setDepartureId(saved.departureId);
    setPaymentScheme(saved.paymentScheme); setBranchId(saved.branchId);
    setAgentId(saved.agentId); setNotes(saved.notes);
    setPemesanName(saved.pemesanName); setPemesanPhone(saved.pemesanPhone);
    setPemesanEmail(saved.pemesanEmail); setGroupName(saved.groupName);
    setJamaah(saved.jamaah?.length ? saved.jamaah : [emptyJamaah()]);
    setStep(saved.__step);
  }, []);

  const { hasDraft, restoreDraft, clearDraft } = useFormDraft<DraftData>({
    key: "admin-booking-unified",
    value: draftValue,
    onRestore: handleRestore,
    isEmpty: (v) => !v.packageId && !v.pemesanName,
  });

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    Promise.all([
      apiFetch<{ data: Pkg[] }>("/api/admin/packages"),
      apiFetch<any[]>("/api/admin/branches"),
      apiFetch<any[]>("/api/admin/agents"),
    ]).then(([pkgs, brs, ags]) => {
      setPackages(pkgs.data || []);
      setBranches((brs || []).map((b: any) => ({ id: b.id, name: b.name })));
      setAgents((ags || []).map((a: any) => ({
        id: a.id, name: a.name,
        referral_code: a.referralCode || a.referral_code || "",
      })));
    }).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!packageId) { setDepartures([]); setDepartureId(""); return; }
    apiFetch<{ data: any[] }>(`/api/admin/packages/${packageId}/departures?status=active&minQuota=1`)
      .then(({ data }) => setDepartures(data || []))
      .catch(() => setDepartures([]));
  }, [packageId]);

  useEffect(() => {
    if (profileSearch.length < 2) { setProfileResults([]); return; }
    const t = setTimeout(() => {
      setProfileLoading(true);
      apiFetch<{ data: Profile[] }>(`/api/admin/users?search=${encodeURIComponent(profileSearch)}`)
        .then(({ data }) => setProfileResults(data || []))
        .catch(() => setProfileResults([]))
        .finally(() => setProfileLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [profileSearch]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setStep(1);
    setPackageId(""); setDepartureId(""); setPaymentScheme("full");
    setBranchId(""); setAgentId(""); setNotes("");
    setPemesanName(""); setPemesanPhone(""); setPemesanEmail(""); setGroupName("");
    setJamaah([emptyJamaah()]);
    setProfileSearch(""); setProfileResults([]);
    clearDraft();
  }, [clearDraft]);

  const handleClose = (o: boolean) => { if (!o) reset(); onOpenChange(o); };

  const handleSelectProfile = (p: Profile) => {
    setPemesanName(p.name);
    setPemesanPhone(p.phone || "");
    setPemesanEmail(p.email || "");
    setProfileSearch(p.name);
    setProfileResults([]);
  };

  const updateJamaah = (idx: number, field: keyof JamaahRow, value: string) => {
    setJamaah((prev) => prev.map((j, i) => i === idx ? { ...j, [field]: value } : j));
  };
  const addJamaah    = () => setJamaah((prev) => [...prev, emptyJamaah()]);
  const removeJamaah = (idx: number) => {
    if (jamaah.length <= 1) return;
    setJamaah((prev) => prev.filter((_, i) => i !== idx));
  };

  const getPriceForJamaah = (j: JamaahRow) => {
    if (!j.roomType || !selectedDeparture) return 0;
    return selectedDeparture.prices.find((p) => p.room_type === j.roomType)?.price || 0;
  };
  const totalPrice = jamaah.reduce((s, j) => s + getPriceForJamaah(j), 0);

  // ── Validation ────────────────────────────────────────────────────────────

  const canStep2  = !!packageId && !!departureId;
  const canStep3  = pemesanName.trim().length > 0;
  const canStep4  = jamaah.every((j) => j.name.trim() && j.roomType);
  const quotaOk   = selectedDeparture
    ? selectedDeparture.remaining_quota >= jamaah.length
    : true;
  const canSubmit = canStep2 && canStep3 && canStep4 && quotaOk;

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const result = await apiFetch<any>("/api/admin/bookings/group", {
        method: "POST",
        body: JSON.stringify({
          packageId,
          departureId,
          paymentScheme,
          notes: notes.trim() || null,
          branchId: branchId || null,
          agentId: agentId || null,
          pemesanName: pemesanName.trim(),
          pemesanPhone: pemesanPhone.trim() || null,
          pemesanEmail: pemesanEmail.trim() || null,
          groupName: groupName.trim() || null,
          totalPrice,
          currency: "IDR",
          jamaah: jamaah.map((j) => ({
            name: j.name.trim(),
            phone: j.phone.trim() || null,
            gender: j.gender || null,
            roomType: j.roomType,
            roomPrice: getPriceForJamaah(j),
          })),
        }),
      });
      clearDraft();
      toast({
        title: `Booking ${result.bookingCode} berhasil!`,
        description: `${jamaah.length} jamaah · Total Rp ${totalPrice.toLocaleString("id-ID")}`,
      });
      onSuccess();
      handleClose(false);
    } catch (e: any) {
      toast({ title: "Gagal membuat booking", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Step definitions ──────────────────────────────────────────────────────

  const stepDefs: { n: Step; label: string; icon: React.ComponentType<any> }[] = [
    { n: 1, label: "Paket & Jadwal",  icon: Package   },
    { n: 2, label: "Data Pemesan",    icon: UserRound  },
    { n: 3, label: "Daftar Jamaah",   icon: Users      },
    { n: 4, label: "Konfirmasi",      icon: CreditCard },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Buat Booking Baru
            {isDirty && (
              <span className="flex items-center gap-1.5 text-xs font-normal text-amber-600 dark:text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Belum disimpan
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {hasDraft && <FormDraftBanner onRestore={restoreDraft} onDiscard={clearDraft} />}

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-4">
          {stepDefs.map((s, i) => (
            <div key={s.n} className="flex items-center gap-1 flex-1">
              <button
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors flex-1 ${
                  step === s.n
                    ? "bg-primary text-primary-foreground"
                    : step > s.n
                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-muted text-muted-foreground"
                }`}
                onClick={() => step > s.n && setStep(s.n)}
                disabled={step <= s.n}
              >
                <s.icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline truncate">{s.label}</span>
                <span className="sm:hidden">{s.n}</span>
              </button>
              {i < stepDefs.length - 1 && (
                <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1: Paket & Jadwal ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Paket Umroh *</Label>
              <Select value={packageId} onValueChange={setPackageId}>
                <SelectTrigger><SelectValue placeholder="Pilih paket..." /></SelectTrigger>
                <SelectContent>
                  {packages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {packageId && (
              <div className="space-y-1.5">
                <Label>Jadwal Keberangkatan *</Label>
                {departures.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic p-3 bg-muted rounded-md">
                    Tidak ada keberangkatan aktif untuk paket ini.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {departures.map((dep) => (
                      <button
                        key={dep.id}
                        type="button"
                        onClick={() => setDepartureId(dep.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          departureId === dep.id
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-sm">
                              {format(new Date(dep.departure_date), "d MMMM yyyy", { locale: localeId })}
                              {dep.return_date && ` — ${format(new Date(dep.return_date), "d MMMM yyyy", { locale: localeId })}`}
                            </span>
                          </div>
                          <Badge
                            variant={dep.remaining_quota <= 5 ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            Sisa {dep.remaining_quota}/{dep.quota} kursi
                          </Badge>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-2 pl-6">
                          {dep.prices.map((p) => (
                            <span key={p.room_type} className="text-xs text-muted-foreground">
                              {ROOM_LABELS[p.room_type] ?? p.room_type}: Rp {p.price.toLocaleString("id-ID")}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Skema Pembayaran</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_SCHEMES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setPaymentScheme(s.value)}
                      className={`p-2.5 rounded-lg border text-sm font-medium transition-all ${
                        paymentScheme === s.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Cabang</Label>
                <Select value={branchId || "__none__"} onValueChange={(v) => setBranchId(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih cabang..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Tanpa cabang —</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Agen Referral</Label>
                <Select value={agentId || "__none__"} onValueChange={(v) => setAgentId(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih agen..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Tanpa agen —</SelectItem>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({a.referral_code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Catatan Internal</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan opsional..."
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                disabled={!canStep2}
                onClick={() => setStep(2)}
                className="gradient-gold text-primary"
              >
                Lanjut <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Data Pemesan ───────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
              <strong>Pemesan</strong> adalah orang yang memesan (bisa agen, kepala rombongan, atau calon jamaah itu sendiri).
            </div>

            {/* Customer search to pre-fill */}
            <div className="space-y-1.5">
              <Label>Cari Pelanggan Terdaftar (opsional)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={profileSearch}
                  onChange={(e) => setProfileSearch(e.target.value)}
                  placeholder="Ketik nama atau email untuk mengisi otomatis..."
                  className="pl-9"
                />
                {profileLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {profileResults.length > 0 && (
                <div className="border rounded-lg overflow-hidden divide-y shadow-sm">
                  {profileResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProfile(p)}
                      className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                    >
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.email}{p.phone && ` · ${p.phone}`}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs text-muted-foreground">
                <span className="bg-background px-2">atau isi manual</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>
                  Nama Pemesan <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={pemesanName}
                  onChange={(e) => setPemesanName(e.target.value)}
                  placeholder="Nama lengkap pemesan"
                  className={!pemesanName.trim() && step === 2 ? "border-destructive/50 focus-visible:ring-destructive/30" : ""}
                />
                {!pemesanName.trim() && (
                  <p className="text-xs text-destructive">Nama pemesan wajib diisi</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>No. HP / WhatsApp</Label>
                <Input
                  value={pemesanPhone}
                  onChange={(e) => setPemesanPhone(e.target.value)}
                  placeholder="08xx..."
                  type="tel"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  value={pemesanEmail}
                  onChange={(e) => setPemesanEmail(e.target.value)}
                  placeholder="email@..."
                  type="email"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Nama Rombongan <span className="text-muted-foreground text-xs">(opsional)</span></Label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="cth: Rombongan Masjid Al-Ikhlas"
                />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>← Kembali</Button>
              <Button
                disabled={!canStep3}
                onClick={() => setStep(3)}
                className="gradient-gold text-primary"
              >
                Lanjut <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Daftar Jamaah ──────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            {!quotaOk && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                ⚠️ Sisa kuota {selectedDeparture?.remaining_quota} kursi, sudah ada {jamaah.length} jamaah.
                Kurangi jumlah jamaah atau pilih jadwal lain.
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {jamaah.length} jamaah · Pemesan: <span className="font-semibold text-foreground">{pemesanName}</span>
              </p>
              <p className="text-sm font-semibold">
                Total: <span className="text-primary">Rp {totalPrice.toLocaleString("id-ID")}</span>
              </p>
            </div>

            <div className="space-y-3 max-h-[38vh] overflow-y-auto pr-1">
              {jamaah.map((j, idx) => (
                <div key={idx} className="border border-border rounded-lg p-3 space-y-3 bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Jamaah {idx + 1}
                    </span>
                    {jamaah.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeJamaah(idx)}
                        className="text-destructive hover:text-destructive/80 transition-colors p-1 rounded hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">
                        Nama Lengkap <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={j.name}
                        onChange={(e) => updateJamaah(idx, "name", e.target.value)}
                        placeholder="Nama sesuai paspor"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">No. HP</Label>
                      <Input
                        value={j.phone}
                        onChange={(e) => updateJamaah(idx, "phone", e.target.value)}
                        placeholder="08xx..."
                        className="h-8 text-sm"
                        type="tel"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Jenis Kelamin</Label>
                      <Select
                        value={j.gender}
                        onValueChange={(v) => updateJamaah(idx, "gender", v)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Pilih..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Laki-laki</SelectItem>
                          <SelectItem value="female">Perempuan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">
                        Tipe Kamar <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex gap-2 flex-wrap">
                        {(selectedDeparture?.prices || []).map((p) => (
                          <button
                            key={p.room_type}
                            type="button"
                            onClick={() => updateJamaah(idx, "roomType", p.room_type)}
                            className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-all ${
                              j.roomType === p.room_type
                                ? "border-primary bg-primary/5 ring-1 ring-primary text-primary"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            {ROOM_LABELS[p.room_type] ?? p.room_type}
                            <span className="ml-1.5 text-muted-foreground">
                              Rp {p.price.toLocaleString("id-ID")}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={addJamaah}
              disabled={!!(selectedDeparture && jamaah.length >= selectedDeparture.remaining_quota)}
            >
              <Plus className="w-4 h-4" /> Tambah Jamaah
            </Button>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>← Kembali</Button>
              <Button
                disabled={!canStep4 || !quotaOk}
                onClick={() => setStep(4)}
                className="gradient-gold text-primary"
              >
                Lanjut <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Konfirmasi ─────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <p className="font-semibold text-sm">Ringkasan Booking</p>
              <div className="space-y-1.5 text-sm divide-y divide-border/60">
                {/* Paket & Jadwal */}
                <div className="pb-2 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paket</span>
                    <span className="font-medium">{packages.find((p) => p.id === packageId)?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Keberangkatan</span>
                    <span className="font-medium">
                      {selectedDeparture && format(new Date(selectedDeparture.departure_date), "d MMM yyyy", { locale: localeId })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Skema Bayar</span>
                    <span className="font-medium">{paymentScheme === "full" ? "Lunas" : "DP / Cicilan"}</span>
                  </div>
                </div>

                {/* Pemesan */}
                <div className="py-2 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pemesan</span>
                    <span className="font-medium">{pemesanName}</span>
                  </div>
                  {pemesanPhone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">HP Pemesan</span>
                      <span>{pemesanPhone}</span>
                    </div>
                  )}
                  {groupName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nama Rombongan</span>
                      <span className="font-medium">{groupName}</span>
                    </div>
                  )}
                </div>

                {/* Jamaah */}
                <div className="pt-2 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium mb-1.5">
                    Jamaah ({jamaah.length} orang):
                  </p>
                  {jamaah.map((j, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span>{i + 1}. {j.name}</span>
                      <span className="text-muted-foreground capitalize">
                        {ROOM_LABELS[j.roomType] ?? j.roomType} · Rp {getPriceForJamaah(j).toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="pt-2 flex justify-between">
                  <span className="font-semibold">Total Harga</span>
                  <span className="font-bold text-lg">Rp {totalPrice.toLocaleString("id-ID")}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(3)}>← Kembali</Button>
              <Button
                disabled={!canSubmit || saving}
                onClick={handleSubmit}
                className="gradient-gold text-primary min-w-[200px]"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {saving ? "Memproses..." : `Buat Booking (${jamaah.length} Jamaah)`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdminBookingDialog;
