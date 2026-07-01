import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { useToast } from "@/shared/hooks/use-toast";
import { Search, Loader2, UserRound, Package, Calendar, CreditCard, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useFormDraft } from "../hooks/useFormDraft";
import { FormDraftBanner } from "./FormDraftBanner";

interface Package {
  id: string;
  title: string;
}

interface Departure {
  id: string;
  departure_date: string;
  return_date: string | null;
  remaining_quota: number;
  quota: number;
  prices: { room_type: string; price: number }[];
}

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface Branch {
  id: string;
  name: string;
}

interface Agent {
  id: string;
  name: string;
  referral_code: string;
}

type Step = 1 | 2 | 3;

const ROOM_LABELS: Record<string, string> = { quad: "Quad (4 orang)", triple: "Triple (3 orang)", double: "Double (2 orang)" };
const PAYMENT_SCHEMES = [
  { value: "full", label: "Lunas" },
  { value: "dp", label: "DP / Cicilan" },
];

const EMPTY_FORM = {
  package_id: "",
  departure_id: "",
  room_type: "",
  payment_scheme: "full",
  user_id: "",
  customer_name: "",
  customer_email: "",
  notes: "",
  branch_id: "",
  agent_id: "",
};

type FormData = typeof EMPTY_FORM;

// We persist form + step together so restore returns to the right step
type DraftData = FormData & { __step: Step };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AdminCreateBookingDialog = ({ open, onOpenChange, onSuccess }: Props) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);

  const [packages, setPackages] = useState<Package[]>([]);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [profileSearch, setProfileSearch] = useState("");
  const [profileResults, setProfileResults] = useState<Profile[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);

  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  // ── Draft auto-save / restore ───────────────────────────────────────────────
  // Combine form + step into a single draft value so step is also restored
  const draftValue: DraftData = { ...form, __step: step };

  const handleRestore = useCallback((saved: DraftData) => {
    const { __step, ...savedForm } = saved;
    setForm(savedForm as FormData);
    setStep(__step);
  }, []);

  const { hasDraft, restoreDraft, clearDraft } = useFormDraft<DraftData>({
    key: "admin-create-booking",
    value: draftValue,
    onRestore: handleRestore,
    isEmpty: (v) => !v.package_id && !v.customer_name,
  });

  // ── Data loading ────────────────────────────────────────────────────────────
  const selectedDeparture = departures.find((d) => d.id === form.departure_id);
  const selectedPrice = selectedDeparture?.prices.find((p) => p.room_type === form.room_type);
  const totalPrice = selectedPrice?.price || 0;

  useEffect(() => {
    if (!open) return;
    Promise.all([
      supabase.from("packages").select("id, title").eq("is_active", true).order("title"),
      supabase.from("branches").select("id, name").eq("is_active", true).order("name"),
      supabase.from("agents").select("id, name, referral_code").order("name"),
    ]).then(([pkgs, brs, ags]) => {
      setPackages(pkgs.data || []);
      setBranches(brs.data || []);
      setAgents((ags.data as any) || []);
    });
  }, [open]);

  useEffect(() => {
    if (!form.package_id) { setDepartures([]); return; }
    supabase
      .from("package_departures")
      .select("id, departure_date, return_date, remaining_quota, quota, prices:departure_prices(room_type, price)")
      .eq("package_id", form.package_id)
      .eq("status", "active")
      .gte("remaining_quota", 1)
      .order("departure_date")
      .then(({ data }) => {
        setDepartures((data as any) || []);
      });
  }, [form.package_id]);

  useEffect(() => {
    if (profileSearch.length < 2) { setProfileResults([]); return; }
    const t = setTimeout(async () => {
      setProfileLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, name, email, phone")
        .or(`name.ilike.%${profileSearch}%,email.ilike.%${profileSearch}%`)
        .limit(8);
      setProfileResults((data as any) || []);
      setProfileLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [profileSearch]);

  const handleSelectProfile = (p: Profile) => {
    setForm((f) => ({ ...f, user_id: p.id, customer_name: p.name, customer_email: p.email }));
    setProfileSearch(p.name);
    setProfileResults([]);
  };

  const reset = () => {
    setStep(1);
    setForm(EMPTY_FORM);
    setProfileSearch("");
    setProfileResults([]);
    clearDraft();
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const canGoStep2 = form.package_id && form.departure_id && form.room_type;
  const canGoStep3 = form.customer_name.trim();
  const canSubmit = canGoStep2 && canGoStep3 && form.payment_scheme;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const { data: codeData, error: codeErr } = await supabase.rpc("generate_booking_code");
      if (codeErr) throw codeErr;

      const bookingPayload: any = {
        booking_code: codeData,
        package_id: form.package_id,
        departure_id: form.departure_id,
        total_price: totalPrice,
        currency: "IDR",
        status: "confirmed",
        payment_scheme: form.payment_scheme,
        notes: form.notes.trim() || null,
        branch_id: form.branch_id || null,
        agent_id: form.agent_id || null,
        pic_type: "admin",
      };

      if (form.user_id) bookingPayload.user_id = form.user_id;

      const { data: booking, error: bErr } = await supabase
        .from("bookings")
        .insert(bookingPayload)
        .select()
        .single();

      if (bErr) throw bErr;

      await supabase.from("booking_rooms").insert({
        booking_id: booking.id,
        room_type: form.room_type,
        price: totalPrice,
        quantity: 1,
        subtotal: totalPrice,
      });

      if (form.customer_name && !form.user_id) {
        await supabase.from("booking_pilgrims").insert({
          booking_id: booking.id,
          name: form.customer_name,
          gender: "male",
          email: form.customer_email || null,
        });
      }

      clearDraft();
      toast({ title: `Booking ${codeData} berhasil dibuat!`, description: `Total: Rp ${totalPrice.toLocaleString("id-ID")}` });
      onSuccess();
      handleClose(false);
    } catch (e: any) {
      toast({ title: "Gagal membuat booking", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const stepLabels = [
    { n: 1, label: "Paket & Keberangkatan", icon: Package },
    { n: 2, label: "Data Pelanggan", icon: UserRound },
    { n: 3, label: "Pembayaran & Ringkasan", icon: CreditCard },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat Booking dari Admin</DialogTitle>
        </DialogHeader>

        {/* Draft recovery banner — only shown when a saved draft is available */}
        {hasDraft && (
          <FormDraftBanner onRestore={restoreDraft} onDiscard={clearDraft} />
        )}

        <div className="flex items-center gap-1 mb-6 mt-2">
          {stepLabels.map((s, i) => (
            <div key={s.n} className="flex items-center gap-1 flex-1">
              <button
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex-1 ${
                  step === s.n
                    ? "bg-primary text-primary-foreground"
                    : step > s.n
                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-muted text-muted-foreground"
                }`}
                onClick={() => step > s.n && setStep(s.n as Step)}
                disabled={step <= s.n}
              >
                <s.icon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline truncate">{s.label}</span>
                <span className="sm:hidden">{s.n}</span>
              </button>
              {i < stepLabels.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Paket Umroh *</Label>
              <Select value={form.package_id} onValueChange={(v) => setForm((f) => ({ ...f, package_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih paket..." />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.package_id && (
              <div className="space-y-1.5">
                <Label>Keberangkatan *</Label>
                {departures.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic p-3 bg-muted rounded-md">
                    Tidak ada keberangkatan aktif tersedia untuk paket ini.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {departures.map((dep) => (
                      <button
                        key={dep.id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, departure_id: dep.id, room_type: "" }))}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          form.departure_id === dep.id
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-sm">
                              {format(new Date(dep.departure_date), "d MMMM yyyy", { locale: localeId })}
                              {dep.return_date && ` — ${format(new Date(dep.return_date), "d MMMM yyyy", { locale: localeId })}`}
                            </span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            Sisa {dep.remaining_quota}/{dep.quota} kursi
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 pl-6">
                          {dep.prices.map((p) => (
                            <span key={p.room_type} className="text-xs text-muted-foreground">
                              {p.room_type}: Rp {p.price.toLocaleString("id-ID")}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {form.departure_id && (
              <div className="space-y-1.5">
                <Label>Tipe Kamar *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {selectedDeparture?.prices.map((p) => (
                    <button
                      key={p.room_type}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, room_type: p.room_type }))}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        form.room_type === p.room_type
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <p className="font-semibold capitalize text-sm">{p.room_type}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Rp {p.price.toLocaleString("id-ID")}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                disabled={!canGoStep2}
                onClick={() => setStep(2)}
                className="gradient-gold text-primary"
              >
                Lanjut <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cari Pelanggan Terdaftar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={profileSearch}
                  onChange={(e) => setProfileSearch(e.target.value)}
                  placeholder="Ketik nama atau email..."
                  className="pl-9"
                />
                {profileLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {profileResults.length > 0 && (
                <div className="border rounded-lg overflow-hidden divide-y">
                  {profileResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProfile(p)}
                      className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                    >
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.email} {p.phone && `· ${p.phone}`}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs text-muted-foreground"><span className="bg-background px-2">atau isi manual (walk-in)</span></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label>Nama Pelanggan *</Label>
                <Input
                  value={form.customer_name}
                  onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                  placeholder="Nama lengkap"
                />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label>Email</Label>
                <Input
                  value={form.customer_email}
                  onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))}
                  placeholder="email@example.com"
                  type="email"
                />
              </div>
            </div>

            {form.user_id && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-300">
                ✓ Terhubung ke akun pelanggan terdaftar
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>← Kembali</Button>
              <Button disabled={!canGoStep3} onClick={() => setStep(3)} className="gradient-gold text-primary">
                Lanjut <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <p className="font-semibold text-sm">Ringkasan Booking</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paket</span>
                  <span className="font-medium">{packages.find((p) => p.id === form.package_id)?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Keberangkatan</span>
                  <span className="font-medium">
                    {selectedDeparture && format(new Date(selectedDeparture.departure_date), "d MMM yyyy", { locale: localeId })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipe Kamar</span>
                  <span className="font-medium capitalize">{form.room_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pelanggan</span>
                  <span className="font-medium">{form.customer_name}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Total Harga</span>
                  <span className="font-bold text-lg">Rp {totalPrice.toLocaleString("id-ID")}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Skema Pembayaran *</Label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_SCHEMES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, payment_scheme: s.value }))}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                      form.payment_scheme === s.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Cabang</Label>
                <Select value={form.branch_id || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, branch_id: v === "__none__" ? "" : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih cabang..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Tanpa cabang —</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Agen Referral</Label>
                <Select value={form.agent_id || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, agent_id: v === "__none__" ? "" : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih agen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Tanpa agen —</SelectItem>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({a.referral_code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Catatan Internal</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Catatan untuk internal admin..."
                rows={3}
              />
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>← Kembali</Button>
              <Button
                disabled={!canSubmit || saving}
                onClick={handleSubmit}
                className="gradient-gold text-primary min-w-[160px]"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {saving ? "Memproses..." : "Buat Booking"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdminCreateBookingDialog;
