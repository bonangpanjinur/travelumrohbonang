import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, CreditCard, FileText, Plane, User, 
  CheckCircle2, Clock, AlertCircle, LogOut
} from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import LoadingSpinner from "@/components/ui/loading-spinner";

interface StepDef {
  id: number;
  title: string;
  icon: React.ElementType;
  status: "completed" | "current" | "upcoming";
}

const getSteps = (booking: any, payments: any[]): StepDef[] => {
  if (!booking) {
    return [
      { id: 1, title: "Pendaftaran", icon: User, status: "upcoming" },
      { id: 2, title: "Pembayaran DP", icon: CreditCard, status: "upcoming" },
      { id: 3, title: "Upload Dokumen", icon: FileText, status: "upcoming" },
      { id: 4, title: "Proses Visa", icon: CheckCircle2, status: "upcoming" },
      { id: 5, title: "Pelunasan", icon: CreditCard, status: "upcoming" },
      { id: 6, title: "Keberangkatan", icon: Plane, status: "upcoming" },
    ];
  }

  const status = booking.status || "draft";
  const hasDpPaid = payments.some(p => p.payment_type === "dp" && p.status === "verified");
  const hasFullPaid = payments.some(p => p.payment_type === "full" && p.status === "verified");
  const totalVerified = payments.filter(p => p.status === "verified").reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const totalPrice = Number(booking.total_price) || 0;
  const isFullyPaid = totalVerified >= totalPrice && totalPrice > 0;

  // Determine each step status
  // Step 1: Pendaftaran - completed if booking exists (not draft)
  const step1: "completed" | "current" | "upcoming" = status !== "draft" ? "completed" : "current";

  // Step 2: Pembayaran DP
  let step2: "completed" | "current" | "upcoming" = "upcoming";
  if (hasDpPaid || isFullyPaid) step2 = "completed";
  else if (step1 === "completed") step2 = "current";

  // Step 3: Upload Dokumen
  let step3: "completed" | "current" | "upcoming" = "upcoming";
  if (status === "processing" || status === "confirmed" || status === "completed" || status === "paid") step3 = "completed";
  else if (step2 === "completed") step3 = "current";

  // Step 4: Proses Visa
  let step4: "completed" | "current" | "upcoming" = "upcoming";
  if (status === "confirmed" || status === "completed") step4 = "completed";
  else if (step3 === "completed") step4 = "current";

  // Step 5: Pelunasan
  let step5: "completed" | "current" | "upcoming" = "upcoming";
  if (isFullyPaid || hasFullPaid) step5 = "completed";
  else if (step4 === "completed") step5 = "current";

  // Step 6: Keberangkatan
  let step6: "completed" | "current" | "upcoming" = "upcoming";
  if (status === "completed") step6 = "completed";
  else if (step5 === "completed") step6 = "current";

  return [
    { id: 1, title: "Pendaftaran", icon: User, status: step1 },
    { id: 2, title: "Pembayaran DP", icon: CreditCard, status: step2 },
    { id: 3, title: "Upload Dokumen", icon: FileText, status: step3 },
    { id: 4, title: "Proses Visa", icon: CheckCircle2, status: step4 },
    { id: 5, title: "Pelunasan", icon: CreditCard, status: step5 },
    { id: 6, title: "Keberangkatan", icon: Plane, status: step6 },
  ];
};

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle();
      
      setUserName(profile?.name || user.user_metadata?.name || user.email || 'Jamaah');

      const { data: bookingData } = await supabase
        .from('bookings')
        .select(`*, package:packages(title), departure:package_departures(departure_date)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (bookingData) {
        setActiveBooking(bookingData);
        // Fetch payments for this booking
        const { data: paymentData } = await supabase
          .from('payments')
          .select('*')
          .eq('booking_id', bookingData.id);
        setPayments(paymentData || []);
      }
      setLoadingBooking(false);
    };

    fetchData();
  }, [user]);

  const steps = useMemo(() => getSteps(activeBooking, payments), [activeBooking, payments]);

  if (loading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/auth" replace />;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <Navbar />
      <div className="bg-primary text-primary-foreground pt-24 pb-24 px-6 rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="container mx-auto max-w-5xl relative z-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Assalamu'alaikum, {userName.split(' ')[0]}!
            </h1>
            <p className="text-primary-foreground/80 text-lg">
              Semoga persiapan ibadah Anda dilancarkan.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleSignOut} className="hidden md:flex items-center gap-2">
            <LogOut className="h-4 w-4" /> Keluar
          </Button>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 -mt-16 relative z-20 space-y-8">
        <Card className="shadow-xl border-none">
          <CardHeader className="border-b bg-card rounded-t-xl pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl text-primary">Status Perjalanan Anda</CardTitle>
                <CardDescription>
                  {activeBooking ? `Paket: ${activeBooking.package?.title}` : "Anda belum memilih paket perjalanan."}
                </CardDescription>
              </div>
              {activeBooking?.departure?.departure_date && (
                <div className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 border border-blue-100">
                  <Clock className="h-4 w-4" />
                  {new Date(activeBooking.departure.departure_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-8 pb-8">
            {!activeBooking && !loadingBooking ? (
              <div className="text-center py-8">
                <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plane className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Belum ada booking aktif</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">Pilih paket Umrah terbaik kami untuk memulai perjalanan spiritual Anda.</p>
                <Button onClick={() => navigate('/paket')}>Lihat Paket Umrah</Button>
              </div>
            ) : (
              <div className="hidden md:flex justify-between relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -z-10 -mt-8 rounded-full"></div>
                {steps.map((step) => (
                  <div key={step.id} className="flex flex-col items-center relative z-10 w-1/6">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 bg-card transition-all duration-300
                      ${step.status === 'completed' ? 'border-green-500 text-green-600' : 
                        step.status === 'current' ? 'border-primary text-primary shadow-lg scale-110' : 'border-muted text-muted-foreground/30'}`}>
                      <step.icon className="h-6 w-6" />
                    </div>
                    <div className="text-center mt-4">
                      <h4 className={`font-bold text-sm ${step.status === 'current' ? 'text-primary' : 'text-muted-foreground'}`}>{step.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block
                        ${step.status === 'completed' ? 'bg-green-100 text-green-700' : 
                          step.status === 'current' ? 'bg-blue-100 text-blue-700' : 'text-muted-foreground/50'}`}>
                        {step.status === 'completed' ? 'Selesai' : step.status === 'current' ? 'Proses' : 'Menunggu'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Mobile steps */}
            {activeBooking && (
              <div className="md:hidden space-y-3">
                {steps.map((step) => (
                  <div key={step.id} className={`flex items-center gap-3 p-3 rounded-lg ${step.status === 'current' ? 'bg-primary/5 border border-primary/20' : ''}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
                      ${step.status === 'completed' ? 'bg-green-100 text-green-600' : 
                        step.status === 'current' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground/30'}`}>
                      <step.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold text-sm ${step.status === 'current' ? 'text-primary' : 'text-muted-foreground'}`}>{step.title}</h4>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full
                      ${step.status === 'completed' ? 'bg-green-100 text-green-700' : 
                        step.status === 'current' ? 'bg-blue-100 text-blue-700' : 'text-muted-foreground/50'}`}>
                      {step.status === 'completed' ? 'Selesai' : step.status === 'current' ? 'Proses' : 'Menunggu'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate('/my-bookings')}>
            <CardContent className="p-6 flex items-center space-x-4">
              <div className="bg-orange-100 p-3 rounded-xl group-hover:bg-orange-200 transition-colors">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold">Riwayat Booking</h3>
                <p className="text-sm text-muted-foreground">Lihat semua transaksi</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate('/profile')}>
            <CardContent className="p-6 flex items-center space-x-4">
              <div className="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-200 transition-colors">
                <User className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Edit Profil</h3>
                <p className="text-sm text-muted-foreground">Update data jamaah</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group border-destructive/20 bg-destructive/5" onClick={handleSignOut}>
            <CardContent className="p-6 flex items-center space-x-4">
              <div className="bg-red-100 p-3 rounded-xl group-hover:bg-red-200 transition-colors">
                <LogOut className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-destructive">Keluar</h3>
                <p className="text-sm text-muted-foreground">Logout dari akun</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
