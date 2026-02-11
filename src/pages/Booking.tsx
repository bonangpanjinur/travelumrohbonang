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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Users, Minus, Plus, Building2, UserCheck, Loader2 } from "lucide-react";
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
  
  // PIC State
  const [branches, setBranches] = useState<Branch[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [picType, setPicType] = useState<string>("pusat");
  const [picBranchId, setPicBranchId] = useState<string>("");
  const [selectedAgentType, setSelectedAgentType] = useState<string>("pusat"); // "pusat" or branch_id
  const [picAgentId, setPicAgentId] = useState<string>("");

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      toast({
        title: "Login Diperlukan",
        description: "Silakan login atau register terlebih dahulu untuk melakukan booking.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    const fetchData = async () => {
      // Fetch package, departure, branches, and agents in parallel
      const [pkgRes, branchRes, agentRes] = await Promise.all([
        supabase.from("packages").select("id, title, slug").eq("slug", slug).single(),
        supabase.from("branches").select("id, name").eq("is_active", true).order("name"),
        supabase.from("agents").select("id, name, branch_id, branch:branches(name)").eq("is_active", true).order("name")
      ]);

      setBranches(branchRes.data || []);
      setAgents(agentRes.data || []);

      if (pkgRes.data) {
        setPkg(pkgRes.data);

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
  }, [slug, departureId, user, authLoading, navigate, toast]);

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

  // Jumlah jemaah = total quantity kamar yang dipilih (bukan kapasitas kamar)
  const getTotalPeople = () => {
    return rooms.reduce((sum, r) => sum + r.quantity, 0);
  };

  // Harga total = quantity × harga per orang (1 kamar = 1 jemaah)
  const getTotalPrice = () => {
    return rooms.reduce((sum, r) => sum + r.quantity * r.price, 0);
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

      // Determine PIC
      let finalPicId: string | null = null;
      let finalPicType = picType;
      
      if (picType === "branch" && picBranchId) {
        finalPicId = picBranchId;
      } else if (picType === "agent" && picAgentId) {
        finalPicId = picAgentId;
      }

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          booking_code: bookingCode,
          user_id: user.id, // CRITICAL FIX: Menautkan booking ke user
          package_id: pkg.id,
          departure_id: departure.id,
          total_price: getTotalPrice(),
          status: "draft",
          pic_type: finalPicType,
          pic_id: finalPicId,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create booking rooms (1 quantity = 1 jemaah)
      const roomsToInsert = rooms
        .filter((r) => r.quantity > 0)
        .map((r) => ({
          booking_id: booking.id,
          room_type: r.room_type,
          price: r.price,
          quantity: r.quantity,
          subtotal: r.quantity * r.price,
        }));

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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-gold" />
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
                      <p className="font-bold">{getRoomLabel(room.room_type)}</p>
                      <p className="text-gold font-semibold">Rp {room.price.toLocaleString("id-ID")}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => updateRoomQuantity(room.room_type, -1)}
                        className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-bold w-4 text-center">{room.quantity}</span>
                      <button
                        onClick={() => updateRoomQuantity(room.room_type, 1)}
                        className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted"
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
                <h2 className="text-xl font-display font-bold">Data Jemaah</h2>
                {pilgrims.map((p, i) => (
                  <div key={i} className="space-y-4 p-4 border border-border rounded-xl">
                    <p className="font-bold text-gold">Jemaah #{i + 1}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nama Lengkap (Sesuai Paspor)</Label>
                        <Input
                          value={p.name}
                          onChange={(e) => {
                            const newPilgrims = [...pilgrims];
                            newPilgrims[i].name = e.target.value;
                            setPilgrims(newPilgrims);
                          }}
                          placeholder="Contoh: Ahmad Abdullah"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Jenis Kelamin</Label>
                        <Select
                          value={p.gender}
                          onValueChange={(val) => {
                            const newPilgrims = [...pilgrims];
                            newPilgrims[i].gender = val;
                            setPilgrims(newPilgrims);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Laki-laki</SelectItem>
                            <SelectItem value="female">Perempuan</SelectItem>
                          </SelectContent>
                        </Select>
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
                        />
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
                          placeholder="0812..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-display font-bold">PIC & Konfirmasi</h2>
                
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

                <div className="p-4 bg-muted rounded-xl space-y-2">
                  <div className="flex justify-between">
                    <span>Total Jemaah</span>
                    <span className="font-bold">{getTotalPeople()} Orang</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="font-bold">Total Harga</span>
                    <span className="font-bold text-gold">Rp {getTotalPrice().toLocaleString("id-ID")}</span>
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
                <Button onClick={handleSubmit} disabled={submitting} className="gradient-gold text-primary">
                  {submitting ? "Memproses..." : "Konfirmasi Booking"}
                </Button>
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
