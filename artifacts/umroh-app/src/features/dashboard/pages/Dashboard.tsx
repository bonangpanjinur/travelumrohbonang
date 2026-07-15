import { useAuth } from "@/shared/hooks/useAuth";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { 
  CreditCard, FileText, Plane, User, 
  CheckCircle2, Clock, LogOut, Crown, Upload, Briefcase, Building2
} from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom";
import { useEffect, useState, useMemo, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/shared/integrations/supabase/client";
import Navbar from "@/shared/components/layout/Navbar";
import LoadingSpinner from "@/shared/components/ui/loading-spinner";
import AdminBanner from "@/features/dashboard/components/AdminBanner";
import RecentNotifications from "@/features/dashboard/components/RecentNotifications";
import TestimonialForm from "@/features/dashboard/components/TestimonialForm";
import LoyaltyWidget from "@/features/dashboard/components/LoyaltyWidget";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

interface QuickAction {
  key: string;
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  colorClass: string;
  cardClass?: string;
}

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
  const [isAgent, setIsAgent] = useState(false);
  const [hasBranch, setHasBranch] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, branch_id')
        .eq('id', user.id)
        .maybeSingle();
      
      setUserName(profile?.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || 'Jamaah');
      setHasBranch(!!profile?.branch_id);

      const { data: agentRow } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsAgent(!!agentRow);

      // TEMPORARY: production Supabase schema cache has no FK relationship
      // between bookings/packages/package_departures (confirmed via direct
      // PostgREST probing — PGRST200 on every embed variant, including
      // column- and constraint-name hints). Embedding is disabled until the
      // actual FK constraints are confirmed/restored; see chat report.
      const { data: bookingData } = await supabase
        .from('bookings')
        .select('*')
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

    // Realtime subscription for booking & payment updates
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const steps = useMemo(() => getSteps(activeBooking, payments), [activeBooking, payments]);

  const handleSignOut = async () => {
    await signOut();
  };

  const quickActions: QuickAction[] = useMemo(() => {
    const actions: QuickAction[] = [
      {
        key: "bookings",
        title: "Riwayat Booking",
        description: "Lihat semua transaksi",
        icon: FileText,
        onClick: () => navigate('/my-bookings'),
        colorClass: "bg-orange-100 text-orange-600",
      },
      {
        key: "profile",
        title: "Edit Profil",
        description: "Update data jamaah",
        icon: User,
        onClick: () => navigate('/profile'),
        colorClass: "bg-purple-100 text-purple-600",
      },
      {
        key: "upgrades",
        title: "Riwayat Upgrade",
        description: "Status pengajuan template",
        icon: Crown,
        onClick: () => navigate('/my-upgrades'),
        colorClass: "bg-amber-100 text-amber-600",
      },
      {
        key: "documents",
        title: "Dokumen Saya",
        description: "Upload & cek dokumen",
        icon: Upload,
        onClick: () => navigate('/my-documents'),
        colorClass: "bg-teal-100 text-teal-600",
      },
    ];
    if (isAgent) {
      actions.push({
        key: "agent",
        title: "Portal Agen",
        description: "Referral & komisi",
        icon: Briefcase,
        onClick: () => navigate('/agent-portal'),
        colorClass: "bg-primary/10 text-primary",
        cardClass: "border-primary/20 bg-primary/5",
      });
    }
    if (hasBranch) {
      actions.push({
        key: "branch",
        title: "Dashboard Cabang",
        description: "Kelola cabang Anda",
        icon: Building2,
        onClick: () => navigate('/branch-dashboard'),
        colorClass: "bg-info/10 text-info",
        cardClass: "border-info/20 bg-info/5",
      });
    }
    return actions;
  }, [isAgent, hasBranch, navigate]);

  if (loading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <Navbar />
      <div className="bg-primary text-primary-foreground pt-24 pb-24 px-6 rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="absolute -bottom-10 left-1/3 w-48 h-48 bg-gold/10 rounded-full blur-3xl"></div>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.4 }}
          className="container mx-auto max-w-5xl relative z-10 flex justify-between items-start sm:items-center gap-4"
        >
          <div className="min-w-0">
            {loadingBooking && !userName ? (
              <>
                <Skeleton className="h-8 w-56 mb-3 bg-white/15" />
                <Skeleton className="h-5 w-72 bg-white/10" />
              </>
            ) : (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 truncate">
                  Assalamu'alaikum, {userName.split(' ')[0]}!
                </h1>
                <p className="text-primary-foreground/80 text-base sm:text-lg">
                  Semoga persiapan ibadah Anda dilancarkan.
                </p>
              </>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSignOut}
            aria-label="Keluar dari akun"
            className="shrink-0 flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        </motion.div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 -mt-16 relative z-20 space-y-6">
        <AdminBanner />
        {activeBooking?.status === "completed" && (
          <TestimonialForm
            bookingId={activeBooking.id}
            packageTitle={activeBooking.package?.title}
          />
        )}
        <Card className="shadow-xl border-none">
          <CardHeader className="border-b bg-card rounded-t-xl pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl text-primary">Status Perjalanan Anda</CardTitle>
                <CardDescription>
                  {activeBooking ? `Paket: ${activeBooking.package?.title ?? "-"}` : "Anda belum memilih paket perjalanan."}
                </CardDescription>
              </div>
              {activeBooking?.departure?.departure_date && (
                <div className="bg-info/10 text-info px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 border border-info/20">
                  <Clock className="h-4 w-4" />
                  {new Date(activeBooking.departure.departure_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-8 pb-8">
            {loadingBooking ? (
              <div className="hidden md:flex justify-between gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center w-1/6 gap-3">
                    <Skeleton className="w-14 h-14 rounded-full" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                ))}
              </div>
            ) : !activeBooking ? (
              <div className="text-center py-8">
                <div className="bg-primary/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plane className="h-8 w-8 text-primary/60" />
                </div>
                <h3 className="text-lg font-medium">Belum ada booking aktif</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">Pilih paket Umrah terbaik kami untuk memulai perjalanan spiritual Anda.</p>
                <Button onClick={() => navigate('/paket')}>Lihat Paket Umrah</Button>
              </div>
            ) : (
              (() => {
                const currentIndex = steps.findIndex((s) => s.status === "current");
                const completedCount = steps.filter((s) => s.status === "completed").length;
                const progressIndex = currentIndex >= 0 ? currentIndex : completedCount;
                const progressPct = steps.length > 1 ? (progressIndex / (steps.length - 1)) * 100 : 0;
                return (
                  <div className="hidden md:flex justify-between relative">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -z-10 -mt-8 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    {steps.map((step) => (
                      <div key={step.id} className="flex flex-col items-center relative z-10 w-1/6">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 bg-card transition-all duration-300
                          ${step.status === 'completed' ? 'border-success text-success' : 
                            step.status === 'current' ? 'border-primary text-primary shadow-lg scale-110' : 'border-muted text-muted-foreground/30'}`}>
                          <step.icon className="h-6 w-6" />
                        </div>
                        <div className="text-center mt-4">
                          <h4 className={`font-bold text-sm ${step.status === 'current' ? 'text-primary' : 'text-muted-foreground'}`}>{step.title}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block
                            ${step.status === 'completed' ? 'bg-success/10 text-success' : 
                              step.status === 'current' ? 'bg-info/10 text-info' : 'text-muted-foreground/50'}`}>
                            {step.status === 'completed' ? 'Selesai' : step.status === 'current' ? 'Proses' : 'Menunggu'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
            {/* Mobile steps */}
            {loadingBooking ? (
              <div className="md:hidden space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            ) : activeBooking && (
              <div className="md:hidden space-y-3">
                {steps.map((step, i) => (
                  <div key={step.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center
                        ${step.status === 'completed' ? 'bg-success/10 text-success' : 
                          step.status === 'current' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground/30'}`}>
                        <step.icon className="h-5 w-5" />
                      </div>
                      {i < steps.length - 1 && (
                        <div className={`w-0.5 flex-1 min-h-[16px] my-1 rounded-full ${step.status === 'completed' ? 'bg-success/40' : 'bg-muted'}`} />
                      )}
                    </div>
                    <div className={`flex-1 flex items-center justify-between p-3 rounded-lg -mt-1 ${step.status === 'current' ? 'bg-primary/5 border border-primary/20' : ''}`}>
                      <h4 className={`font-semibold text-sm ${step.status === 'current' ? 'text-primary' : 'text-muted-foreground'}`}>{step.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0
                        ${step.status === 'completed' ? 'bg-success/10 text-success' : 
                          step.status === 'current' ? 'bg-info/10 text-info' : 'text-muted-foreground/50'}`}>
                        {step.status === 'completed' ? 'Selesai' : step.status === 'current' ? 'Proses' : 'Menunggu'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <LoyaltyWidget />

        <RecentNotifications />

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 px-1">Menu Cepat</h2>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          >
            {quickActions.map((action) => (
              <motion.div key={action.key} variants={fadeUp} transition={{ duration: 0.35 }}>
                <QuickActionCard action={action} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const QuickActionCard = ({ action }: { action: QuickAction }) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action.onClick();
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`${action.title} — ${action.description}`}
      onClick={action.onClick}
      onKeyDown={handleKeyDown}
      className={`hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 h-full ${action.cardClass ?? ""}`}
    >
      <CardContent className="p-6 flex items-center space-x-4">
        <div className={`p-3 rounded-xl transition-colors group-hover:brightness-95 ${action.colorClass}`}>
          <action.icon className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-semibold">{action.title}</h3>
          <p className="text-sm text-muted-foreground">{action.description}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default Dashboard;
