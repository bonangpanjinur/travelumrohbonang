import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Users, Minus, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

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

const STEPS = ["Pilih Kamar", "Data Jemaah", "Konfirmasi"];

const Booking = () => {
  const { slug, departureId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [pkg, setPkg] = useState<Package | null>(null);
  const [departure, setDeparture] = useState<Departure | null>(null);
  const [rooms, setRooms] = useState<RoomSelection[]>([]);
  const [pilgrims, setPilgrims] = useState<Pilgrim[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchData = async () => {
      const { data: pkgData } = await supabase
        .from("packages")
        .select("id, title, slug")
        .eq("slug", slug)
        .single();

      if (pkgData) {
        setPkg(pkgData);

        const { data: depData } = await supabase
          .from("package_departures")
          .select(`*, prices:departure_prices(room_type, price)`)
          .eq("id", departureId)
          .single();

        if (depData) {
          setDeparture(depData as unknown as Departure);
          // Initialize rooms
          const initialRooms = (depData as unknown as Departure).prices.map((p) => ({
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
  }, [slug, departureId, user, navigate]);

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

  const getTotalPeople = () => {
    return rooms.reduce((sum, r) => {
      const multiplier = r.room_type === "quad" ? 4 : r.room_type === "triple" ? 3 : 2;
      return sum + r.quantity * multiplier;
    }, 0);
  };

  const getTotalPrice = () => {
    return rooms.reduce((sum, r) => {
      const multiplier = r.room_type === "quad" ? 4 : r.room_type === "triple" ? 3 : 2;
      return sum + r.quantity * r.price * multiplier;
    }, 0);
  };

  const handleNextStep = () => {
    if (step === 0) {
      const total = getTotalPeople();
      if (total === 0) {
        toast({ title: "Pilih minimal 1 kamar", variant: "destructive" });
        return;
      }
      // Initialize pilgrims
      setPilgrims(Array(total).fill(null).map(() => ({
        name: "",
        phone: "",
        email: "",
        gender: "",
        nik: "",
      })));
    }

    if (step === 1) {
      // Validate pilgrims
      const incomplete = pilgrims.some((p) => !p.name || !p.gender);
      if (incomplete) {
        toast({ title: "Lengkapi data jemaah (minimal nama dan jenis kelamin)", variant: "destructive" });
        return;
      }
    }

    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleSubmit = async () => {
    if (!user || !pkg || !departure) return;
    setSubmitting(true);

    try {
      // Generate booking code
      const { data: codeData } = await supabase.rpc("generate_booking_code");
      const bookingCode = codeData || `UMR-${Date.now()}`;

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          booking_code: bookingCode,
          user_id: user.id,
          package_id: pkg.id,
          departure_id: departure.id,
          total_price: getTotalPrice(),
          status: "draft",
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create booking rooms
      const roomsToInsert = rooms
        .filter((r) => r.quantity > 0)
        .map((r) => {
          const multiplier = r.room_type === "quad" ? 4 : r.room_type === "triple" ? 3 : 2;
          return {
            booking_id: booking.id,
            room_type: r.room_type,
            price: r.price,
            quantity: r.quantity,
            subtotal: r.quantity * r.price * multiplier,
          };
        });

      await supabase.from("booking_rooms").insert(roomsToInsert);

      // Create pilgrims
      const pilgrimsToInsert = pilgrims.map((p) => ({
        booking_id: booking.id,
        name: p.name,
        phone: p.phone || null,
        email: p.email || null,
        gender: p.gender as "male" | "female",
        nik: p.nik || null,
      }));

      await supabase.from("booking_pilgrims").insert(pilgrimsToInsert);

      toast({ title: "Booking berhasil!", description: `Kode: ${bookingCode}` });
      navigate(`/booking/payment/${booking.id}`);
    } catch (error) {
      console.error(error);
      toast({ title: "Gagal membuat booking", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
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
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Booking {pkg.title}</h1>
            <p className="text-muted-foreground mt-1">
              Keberangkatan: {format(new Date(departure.departure_date), "d MMMM yyyy", { locale: localeId })}
            </p>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i <= step ? "gradient-gold text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                <span className={`ml-2 text-sm hidden sm:block ${i <= step ? "font-semibold" : "text-muted-foreground"}`}>
                  {s}
                </span>
                {i < STEPS.length - 1 && <div className="w-8 h-0.5 bg-border mx-2" />}
              </div>
            ))}
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
                <h2 className="text-xl font-display font-bold">Pilih Tipe Kamar</h2>
                {rooms.map((room) => (
                  <div key={room.room_type} className="flex items-center justify-between p-4 border border-border rounded-xl">
                    <div>
                      <div className="font-semibold">{getRoomLabel(room.room_type)}</div>
                      <div className="text-sm text-gold font-bold">Rp {room.price.toLocaleString("id-ID")}/orang</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="icon" onClick={() => updateRoomQuantity(room.room_type, -1)}>
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center font-bold">{room.quantity}</span>
                      <Button variant="outline" size="icon" onClick={() => updateRoomQuantity(room.room_type, 1)}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-5 h-5" />
                  <span>Total: {getTotalPeople()} orang</span>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-display font-bold">Data Jemaah ({pilgrims.length} orang)</h2>
                {pilgrims.map((pilgrim, idx) => (
                  <div key={idx} className="p-4 border border-border rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Jemaah {idx + 1}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Nama Lengkap *</Label>
                        <Input
                          value={pilgrim.name}
                          onChange={(e) => {
                            const updated = [...pilgrims];
                            updated[idx].name = e.target.value;
                            setPilgrims(updated);
                          }}
                          placeholder="Sesuai KTP/Paspor"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Jenis Kelamin *</Label>
                        <Select
                          value={pilgrim.gender}
                          onValueChange={(v) => {
                            const updated = [...pilgrims];
                            updated[idx].gender = v;
                            setPilgrims(updated);
                          }}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Pilih" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Laki-laki</SelectItem>
                            <SelectItem value="female">Perempuan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>No. HP</Label>
                        <Input
                          value={pilgrim.phone}
                          onChange={(e) => {
                            const updated = [...pilgrims];
                            updated[idx].phone = e.target.value;
                            setPilgrims(updated);
                          }}
                          placeholder="08xxxxxxxxxx"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>NIK</Label>
                        <Input
                          value={pilgrim.nik}
                          onChange={(e) => {
                            const updated = [...pilgrims];
                            updated[idx].nik = e.target.value;
                            setPilgrims(updated);
                          }}
                          placeholder="16 digit"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-display font-bold">Konfirmasi Booking</h2>
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Paket</span>
                    <span className="font-semibold">{pkg.title}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Keberangkatan</span>
                    <span className="font-semibold">{format(new Date(departure.departure_date), "d MMMM yyyy", { locale: localeId })}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Jumlah Jemaah</span>
                    <span className="font-semibold">{pilgrims.length} orang</span>
                  </div>
                  {rooms.filter((r) => r.quantity > 0).map((r) => (
                    <div key={r.room_type} className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">{getRoomLabel(r.room_type)} x{r.quantity}</span>
                      <span className="font-semibold">
                        Rp {(r.quantity * r.price * (r.room_type === "quad" ? 4 : r.room_type === "triple" ? 3 : 2)).toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between py-4 bg-primary/5 rounded-xl px-4 mt-4">
                    <span className="font-bold text-lg">Total Pembayaran</span>
                    <span className="font-display font-bold text-2xl text-gold">
                      Rp {getTotalPrice().toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Sebelumnya
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={handleNextStep} className="gradient-gold text-primary">
                Selanjutnya <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting} className="gradient-gold text-primary">
                {submitting ? "Memproses..." : "Konfirmasi Booking"}
              </Button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Booking;
