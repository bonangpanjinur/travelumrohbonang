import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";
import Navbar from "@/shared/components/layout/Navbar";
import Footer from "@/shared/components/layout/Footer";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/badge";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Users, Minus, Plus, Building2, UserCheck, Loader2, UsersRound, PhoneCall } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useToast } from "@/shared/hooks/use-toast";
import { validatePilgrim } from "@/shared/lib/validations";
import TurnstileCaptcha from "@/shared/components/common/TurnstileCaptcha";
import { rateLimit } from "@/shared/lib/rateLimit";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { getStoredReferral, clearStoredReferral } from "@/shared/lib/audit";
import { resolveAffiliateAgentId } from "@/features/agent/lib/affiliate";
import { apiFetch } from "@/shared/lib/apiClient";

interface Package {
  id: string;
  title: string;
  slug: string;
}

interface Departure {
  id: string;
  departure_date: string;
  return_date: string;
  remaining_quota: number;
  prices: { room_type: string; price: number }[];
}

interface RoomSelection {
  room_type: string;
  quantity: number;
  price: number;
}

interface Pilgrim {
  name: string;
  phone: string;
  email: string;
  gender: string;
  nik: string;
}

interface Branch {
  id: string;
  name: string;
}

interface Agent {
  id: string;
  name: string;
  branch_id: string | null;
  branch?: { name: string } | null;
}

const STEPS = ["Pilih Kamar", "Data Jemaah", "PIC & Konfirmasi"];

const Booking = () => {
  const { format: formatPrice } = useCurrency();
  const { slug, departureId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [pkg, setPkg] = useState<Package | null>(null);
  const [departure, setDeparture] = useState<Departure | null>(null);
  const [rooms, setRooms] = useState<RoomSelection[]>([]);
  const [pilgrims, setPilgrims] = useState<Pilgrim[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [pilgrimErrors, setPilgrimErrors] = useState<Record<number, Record<string, string>>>({});

  // Group booking
  const [isGroupBooking, setIsGroupBooking] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [coordName, setCoordName] = useState("");
  const [coordPhone, setCoordPhone] = useState("");
  const [coordEmail, setCoordEmail] = useState("");

  // PIC State
  const [branches, setBranches] = useState<Branch[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [picType, setPicType] = useState<string>("pusat");
  const [picBranchId, setPicBranchId] = useState<string>("");
  const [selectedAgentType, setSelectedAgentType] = useState<string>("pusat");
  const [picAgentId, setPicAgentId] = useState<string>("");
  const [myPoints, setMyPoints] = useState<number>(0);
  const [redeemPointsInput, setRedeemPointsInput] = useState<string>("");
  // Guard: prevent re-fetching (and rooms reset) if auth object reference changes mid-session
  const dataFetchedRef = useRef(false);

  // Redirect unauthenticated users whenever auth state resolves
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast({
        title: "Login Diperlukan",
        description: "Silakan login atau register terlebih dahulu untuk melakukan booking.",
        variant: "destructive",
      });
      navigate("/auth");
    }
  }, [authLoading, user, navigate, toast]);

  // Fetch package/departure data exactly once after auth resolves
  useEffect(() => {
    if (authLoading || !user || dataFetchedRef.current) return;
    dataFetchedRef.current = true;

    const fetchData = async () => {
      if (!slug || !departureId) {
        toast({ title: "Paket tidak valid", description: "Silakan pilih paket dan keberangkatan terlebih dahulu.", variant: "destructive" });
        setLoading(false);
        navigate("/paket");
        return;
      }

      // Fetch package (includes all departures inline), branches, and agents in parallel
      const [pkgData, branchData, agentData] = await Promise.all([
        apiFetch<any>(`/api/packages/${encodeURIComponent(slug)}`).catch(() => null),
        apiFetch<Branch[]>(`/rest/v1/branches?is_active=eq.true&select=id,name&order=name`).catch(() => []),
        apiFetch<Agent[]>(`/rest/v1/agents?select=id,name,branch_id&order=name`).catch(() => []),
      ]);

      setBranches(Array.isArray(branchData) ? branchData : []);
      setAgents(Array.isArray(agentData) ? agentData : []);

      if (pkgData && pkgData.id) {
        setPkg({ id: pkgData.id, title: pkgData.title, slug: pkgData.slug });

        // Find the specific departure from the package's inline departures list
        const dep = (pkgData.departures ?? []).find((d: any) => d.id === departureId) ?? null;
        if (dep) {
          setDeparture(dep as Departure);
          const initialRooms = (dep as Departure).prices.map((p) => ({
            room_type: p.room_type,
            quantity: 0,
            price: p.price,
          }));
          setRooms(initialRooms);
        }
      }
      setLoading(false);
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  const updateRoomQuantity = (roomType: string, delta: number) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.room_type === roomType) {
          const newQty = Math.max(0, r.quantity + delta);
          return { ...r, quantity: newQty };
        }
        return r;
      })
    );
  };

  const getTotalPeople = () => rooms.reduce((sum, r) => sum + r.quantity, 0);
  const getTotalPrice = () => rooms.reduce((sum, r) => sum + r.quantity * r.price, 0);

  const LOYALTY_MIN_REDEEM = 100;
  const LOYALTY_IDR_PER_POINT = 100;

  const getRedeemPoints = () => {
    const n = parseInt(redeemPointsInput, 10);
    if (!Number.isFinite(n) || n < LOYALTY_MIN_REDEEM) return 0;
    return Math.min(n, myPoints);
  };

  const getLoyaltyDiscount = () => getRedeemPoints() * LOYALTY_IDR_PER_POINT;
  const getFinalPrice = () => Math.max(0, getTotalPrice() - getLoyaltyDiscount());

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await apiFetch<{ totalPoints: number }>("/api/loyalty/my");
        setMyPoints(res.totalPoints);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [user]);

  const handleNextStep = () => {
    if (step === 0) {
      const total = getTotalPeople();
      if (total === 0) {
        toast({ title: "Pilih minimal 1 kamar", variant: "destructive" });
        return;
      }
      if (isGroupBooking && !groupName.trim()) {
        toast({ title: "Nama rombongan wajib diisi", variant: "destructive" });
        return;
      }
      // Initialize pilgrims; pre-fill first pilgrim with coordinator info for group bookings
      setPilgrims(Array(total).fill(null).map((_, i) => ({
        name: isGroupBooking && i === 0 && coordName ? coordName : "",
        phone: isGroupBooking && i === 0 && coordPhone ? coordPhone : "",
        email: isGroupBooking && i === 0 && coordEmail ? coordEmail : "",
        gender: "",
        nik: "",
      })));
    }

    if (step === 1) {
      const errors: Record<number, Record<string, string>> = {};
      let hasErrors = false;
      pilgrims.forEach((p, i) => {
        const result = validatePilgrim(p);
        if (!result.valid) {
          errors[i] = result.errors;
          hasErrors = true;
        }
      });
      setPilgrimErrors(errors);
      if (hasErrors) {
        toast({ title: "Periksa kembali data jemaah", description: "Terdapat kesalahan pada form", variant: "destructive" });
        return;
      }
    }

    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleSubmit = async () => {
    if (!user || !pkg || !departure) return;
    if (submitting) return;

    if (!captchaToken) {
      toast({ title: "Verifikasi captcha", description: "Selesaikan captcha sebelum konfirmasi booking.", variant: "destructive" });
      return;
    }

    const limit = await rateLimit("booking:create", { max: 5, windowSec: 60 });
    if (!limit.allowed) {
      toast({ title: "Terlalu banyak percobaan", description: "Tunggu 1 menit sebelum mencoba lagi.", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      let finalPicId: string | null = null;
      const finalPicType = picType;

      if (picType === "branch" && picBranchId) {
        finalPicId = picBranchId;
      } else if (picType === "agent" && picAgentId) {
        finalPicId = picAgentId;
      }

      let agentIdFromRef: string | null = null;
      try {
        const ref = getStoredReferral();
        if (ref) {
          const rows = await apiFetch<{ id: string }[]>(
            `/rest/v1/agents?referral_code=eq.${encodeURIComponent(ref)}&select=id&limit=1`
          ).catch(() => []);
          const agRow = Array.isArray(rows) ? rows[0] : null;
          if (agRow?.id) {
            agentIdFromRef = agRow.id;
            clearStoredReferral();
          }
        }
        if (!agentIdFromRef) {
          agentIdFromRef = await resolveAffiliateAgentId();
        }
      } catch (e) { console.warn("referral attach failed", e); }

      const redeemPoints = getRedeemPoints();
      const booking = await apiFetch<{ id: string; bookingCode: string }>("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          packageId: pkg.id,
          departureId: departure.id,
          totalPrice: getTotalPrice(),
          currency: "IDR",
          picType: finalPicType,
          picId: finalPicId ?? undefined,
          agentId: agentIdFromRef ?? undefined,
          redeemPoints: redeemPoints >= LOYALTY_MIN_REDEEM ? redeemPoints : undefined,
          // Group booking fields
          isGroupBooking: isGroupBooking || undefined,
          groupName: isGroupBooking && groupName ? groupName : undefined,
          picName: isGroupBooking && coordName ? coordName : undefined,
          picPhone: isGroupBooking && coordPhone ? coordPhone : undefined,
          picEmail: isGroupBooking && coordEmail ? coordEmail : undefined,
        }),
      });

      await apiFetch(`/api/bookings/${booking.id}/rooms`, {
        method: "POST",
        body: JSON.stringify({
          rooms: rooms
            .filter((r) => r.quantity > 0)
            .map((r) => ({
              roomType: r.room_type,
              price: r.price,
              quantity: r.quantity,
              subtotal: r.quantity * r.price,
            })),
        }),
      });

      await apiFetch(`/api/bookings/${booking.id}/pilgrims`, {
        method: "POST",
        body: JSON.stringify({
          pilgrims: pilgrims.map((p) => ({
            name: p.name,
            phone: p.phone || undefined,
            email: p.email || undefined,
            gender: p.gender as "male" | "female",
            nik: p.nik || undefined,
          })),
        }),
      });

      toast({ title: "Booking berhasil!", description: `Kode: ${booking.bookingCode}` });
      navigate(`/booking/payment/${booking.id}`);
    } catch (error: any) {
      console.error("Booking error:", error);
      toast({
        title: "Gagal membuat booking",
        description: error?.message || "Terjadi kesalahan saat membuat booking",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container-custom max-w-3xl space-y-6">
            <div className="h-8 bg-muted animate-pulse rounded w-56" />
            <div className="h-5 bg-muted animate-pulse rounded w-40" />
            <div className="flex items-center gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center flex-1">
                  <div className="w-11 h-11 rounded-full bg-muted animate-pulse shrink-0" />
                  {i < 2 && <div className="flex-1 h-0.5 bg-muted animate-pulse mx-2" />}
                </div>
              ))}
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-border rounded-xl">
                  <div className="space-y-2">
                    <div className="h-5 bg-muted animate-pulse rounded w-32" />
                    <div className="h-4 bg-muted animate-pulse rounded w-24" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-muted animate-pulse" />
                    <div className="w-6 h-6 bg-muted animate-pulse rounded" />
                    <div className="w-11 h-11 rounded-full bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!pkg || !departure) {
    return <div className="min-h-screen flex items-center justify-center">Data tidak ditemukan</div>;
  }

  const getRoomLabel = (type: string) => {
    return type === "quad" ? "Quad (4 orang)" : type === "triple" ? "Triple (3 orang)" : "Double (2 orang)";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container-custom max-w-3xl">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate(-1)}
              aria-label="Kembali ke halaman sebelumnya"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 min-h-[44px] px-1"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-display font-bold">Booking {pkg.title}</h1>
              {isGroupBooking && (
                <Badge className="bg-gold/10 text-gold border-gold/30 gap-1.5">
                  <UsersRound className="w-3 h-3" /> Booking Grup
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              Keberangkatan: {format(new Date(departure.departure_date), "d MMMM yyyy", { locale: localeId })}
            </p>
          </div>

          {/* Steps */}
          <div className="mb-8">
            <div className="sm:hidden mb-3 px-4 py-2 bg-muted rounded-xl flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Langkah <span className="font-bold text-foreground">{step + 1}</span> dari {STEPS.length}
              </span>
              <span className="text-sm font-semibold text-gold">{STEPS[step]}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center flex-1 sm:flex-initial">
                  <div
                    aria-current={i === step ? "step" : undefined}
                    className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      i < step
                        ? "gradient-gold text-primary"
                        : i === step
                        ? "gradient-gold text-primary ring-4 ring-gold/30"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i < step ? (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className={`ml-2 text-sm hidden sm:block ${i <= step ? "font-semibold" : "text-muted-foreground"}`}>
                    {s}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 sm:w-8 sm:flex-initial h-0.5 mx-2 transition-colors ${i < step ? "bg-gold" : "bg-border"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-border rounded-2xl p-6 md:p-8"
          >
            {step === 0 && (
              <div className="space-y-6">
                {/* Group Booking Toggle */}
                <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-muted/30">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <UsersRound className="w-4 h-4 text-gold" />
                      <span className="font-semibold text-sm">Booking Grup / Rombongan</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Aktifkan untuk booking keluarga besar, rombongan masjid, atau grup dengan satu koordinator (PIC).
                    </p>
                  </div>
                  <Switch
                    checked={isGroupBooking}
                    onCheckedChange={setIsGroupBooking}
                    aria-label="Aktifkan booking grup"
                  />
                </div>

                {/* Group info fields */}
                {isGroupBooking && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-4 p-4 border border-gold/30 bg-gold/5 rounded-xl"
                  >
                    <p className="text-sm font-semibold text-gold flex items-center gap-2">
                      <UsersRound className="w-4 h-4" /> Detail Rombongan
                    </p>
                    <div className="space-y-2">
                      <Label>Nama Rombongan *</Label>
                      <Input
                        placeholder="cth: Rombongan Masjid Al-Ikhlas Jakarta"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-3">
                      <PhoneCall className="w-3 h-3" /> Data Koordinator / PIC Rombongan
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Nama Koordinator</Label>
                        <Input
                          placeholder="Nama lengkap PIC"
                          value={coordName}
                          onChange={(e) => setCoordName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>No. HP Koordinator</Label>
                        <Input
                          placeholder="08xxxxxxxxxx"
                          value={coordPhone}
                          onChange={(e) => setCoordPhone(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Email Koordinator (Opsional)</Label>
                        <Input
                          type="email"
                          placeholder="koordinator@email.com"
                          value={coordEmail}
                          onChange={(e) => setCoordEmail(e.target.value)}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                <h2 className="text-xl font-display font-bold">Pilih Tipe Kamar</h2>
                {rooms.map((room) => (
                  <div key={room.room_type} className="flex items-center justify-between p-4 border border-border rounded-xl">
                    <div>
                      <p className="font-bold">{getRoomLabel(room.room_type)}</p>
                      <p className="text-gold font-semibold">{formatPrice(room.price)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateRoomQuantity(room.room_type, -1)}
                        aria-label={`Kurangi jumlah ${getRoomLabel(room.room_type)}`}
                        className="w-11 h-11 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-bold w-4 text-center">{room.quantity}</span>
                      <button
                        onClick={() => updateRoomQuantity(room.room_type, 1)}
                        aria-label={`Tambah jumlah ${getRoomLabel(room.room_type)}`}
                        className="w-11 h-11 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-display font-bold">Data Jemaah</h2>
                  {isGroupBooking && groupName && (
                    <Badge variant="outline" className="text-xs border-gold/40 text-gold gap-1">
                      <UsersRound className="w-3 h-3" /> {groupName}
                    </Badge>
                  )}
                </div>
                {isGroupBooking && (
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                    Isi data seluruh jemaah rombongan. Data Jemaah #1 sudah diisi dari koordinator, silakan sesuaikan jika perlu.
                  </p>
                )}
                {pilgrims.map((p, i) => (
                  <div key={i} className={`space-y-4 p-4 border rounded-xl ${pilgrimErrors[i] ? 'border-destructive/50' : 'border-border'}`}>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gold">Jemaah #{i + 1}</p>
                      {isGroupBooking && i === 0 && (
                        <Badge variant="outline" className="text-xs border-gold/40 text-gold">Koordinator</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nama Lengkap (Sesuai Paspor) *</Label>
                        <Input
                          value={p.name}
                          onChange={(e) => {
                            const newPilgrims = [...pilgrims];
                            newPilgrims[i].name = e.target.value;
                            setPilgrims(newPilgrims);
                            if (pilgrimErrors[i]?.name) {
                              const newErrors = { ...pilgrimErrors };
                              delete newErrors[i]?.name;
                              setPilgrimErrors(newErrors);
                            }
                          }}
                          placeholder="Contoh: Ahmad Abdullah"
                          className={pilgrimErrors[i]?.name ? 'border-destructive' : ''}
                        />
                        {pilgrimErrors[i]?.name && <p className="text-xs text-destructive">{pilgrimErrors[i].name}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Jenis Kelamin *</Label>
                        <Select
                          value={p.gender}
                          onValueChange={(val) => {
                            const newPilgrims = [...pilgrims];
                            newPilgrims[i].gender = val;
                            setPilgrims(newPilgrims);
                            if (pilgrimErrors[i]?.gender) {
                              const newErrors = { ...pilgrimErrors };
                              delete newErrors[i]?.gender;
                              setPilgrimErrors(newErrors);
                            }
                          }}
                        >
                          <SelectTrigger className={pilgrimErrors[i]?.gender ? 'border-destructive' : ''}>
                            <SelectValue placeholder="Pilih" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Laki-laki</SelectItem>
                            <SelectItem value="female">Perempuan</SelectItem>
                          </SelectContent>
                        </Select>
                        {pilgrimErrors[i]?.gender && <p className="text-xs text-destructive">{pilgrimErrors[i].gender}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Nomor NIK (Opsional)</Label>
                        <Input
                          value={p.nik}
                          onChange={(e) => {
                            const newPilgrims = [...pilgrims];
                            newPilgrims[i].nik = e.target.value;
                            setPilgrims(newPilgrims);
                          }}
                          placeholder="16 digit NIK"
                          className={pilgrimErrors[i]?.nik ? 'border-destructive' : ''}
                        />
                        {pilgrimErrors[i]?.nik && <p className="text-xs text-destructive">{pilgrimErrors[i].nik}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Nomor HP (Opsional)</Label>
                        <Input
                          value={p.phone}
                          onChange={(e) => {
                            const newPilgrims = [...pilgrims];
                            newPilgrims[i].phone = e.target.value;
                            setPilgrims(newPilgrims);
                          }}
                          placeholder="08123456789"
                          className={pilgrimErrors[i]?.phone ? 'border-destructive' : ''}
                        />
                        {pilgrimErrors[i]?.phone && <p className="text-xs text-destructive">{pilgrimErrors[i].phone}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-display font-bold">PIC & Konfirmasi</h2>

                {/* Group booking summary */}
                {isGroupBooking && (
                  <div className="p-4 border border-gold/30 bg-gold/5 rounded-xl space-y-2">
                    <p className="text-sm font-semibold text-gold flex items-center gap-2">
                      <UsersRound className="w-4 h-4" /> Booking Grup
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <span className="text-muted-foreground">Nama Rombongan</span>
                      <span className="font-medium">{groupName || "-"}</span>
                      {coordName && (
                        <>
                          <span className="text-muted-foreground">Koordinator</span>
                          <span className="font-medium">{coordName}</span>
                        </>
                      )}
                      {coordPhone && (
                        <>
                          <span className="text-muted-foreground">HP Koordinator</span>
                          <span className="font-medium">{coordPhone}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <Label>Siapa yang membantu pendaftaran Anda?</Label>
                  <RadioGroup value={picType} onValueChange={setPicType} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2 border border-border p-4 rounded-xl cursor-pointer hover:border-gold/50">
                      <RadioGroupItem value="pusat" id="pusat" />
                      <Label htmlFor="pusat" className="cursor-pointer">Kantor Pusat</Label>
                    </div>
                    <div className="flex items-center space-x-2 border border-border p-4 rounded-xl cursor-pointer hover:border-gold/50">
                      <RadioGroupItem value="branch" id="branch" />
                      <Label htmlFor="branch" className="cursor-pointer">Cabang</Label>
                    </div>
                    <div className="flex items-center space-x-2 border border-border p-4 rounded-xl cursor-pointer hover:border-gold/50">
                      <RadioGroupItem value="agent" id="agent" />
                      <Label htmlFor="agent" className="cursor-pointer">Agen</Label>
                    </div>
                  </RadioGroup>

                  {picType === "branch" && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <Label>Pilih Cabang</Label>
                      <Select value={picBranchId} onValueChange={setPicBranchId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Cabang" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {picType === "agent" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-2">
                        <Label>Filter Agen Berdasarkan</Label>
                        <Select value={selectedAgentType} onValueChange={setSelectedAgentType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Semua Agen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pusat">Agen Pusat</SelectItem>
                            {branches.map((b) => (
                              <SelectItem key={b.id} value={b.id}>Agen Cabang {b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Pilih Nama Agen</Label>
                        <Select value={picAgentId} onValueChange={setPicAgentId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Agen" />
                          </SelectTrigger>
                          <SelectContent>
                            {agents
                              .filter(a => selectedAgentType === "pusat" ? !a.branch_id : a.branch_id === selectedAgentType)
                              .map((a) => (
                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {myPoints >= LOYALTY_MIN_REDEEM && (
                  <div className="p-4 border border-gold/30 bg-gold/5 rounded-xl space-y-2">
                    <Label htmlFor="redeem-points">
                      Gunakan Poin Loyalitas (saldo: {myPoints.toLocaleString("id-ID")} poin)
                    </Label>
                    <Input
                      id="redeem-points"
                      type="number"
                      min={LOYALTY_MIN_REDEEM}
                      max={myPoints}
                      step={1}
                      placeholder={`Minimal ${LOYALTY_MIN_REDEEM} poin`}
                      value={redeemPointsInput}
                      onChange={(e) => setRedeemPointsInput(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Setiap 100 poin = Rp 10.000 diskon. Kosongkan jika tidak ingin menukar poin.
                    </p>
                  </div>
                )}

                <div className="p-4 bg-muted rounded-xl space-y-2">
                  <div className="flex justify-between">
                    <span>Total Jemaah</span>
                    <span className="font-bold">{getTotalPeople()} Orang</span>
                  </div>
                  {isGroupBooking && groupName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Rombongan</span>
                      <span className="font-medium text-gold">{groupName}</span>
                    </div>
                  )}
                  {getLoyaltyDiscount() > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Subtotal</span>
                        <span>{formatPrice(getTotalPrice())}</span>
                      </div>
                      <div className="flex justify-between text-sm text-success">
                        <span>Diskon Poin ({getRedeemPoints()} poin)</span>
                        <span>-{formatPrice(getLoyaltyDiscount())}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-lg">
                    <span className="font-bold">Total Harga</span>
                    <span className="font-bold text-gold">{formatPrice(getFinalPrice())}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0 || submitting}
              >
                Sebelumnya
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={handleNextStep} className="gradient-gold text-primary">
                  Lanjut <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <div className="flex flex-col items-end gap-3">
                  <TurnstileCaptcha onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />
                  <Button onClick={handleSubmit} disabled={submitting || !captchaToken} className="gradient-gold text-primary">
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</>
                    ) : "Konfirmasi Booking"}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Booking;
