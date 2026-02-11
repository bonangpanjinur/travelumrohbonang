import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  CreditCard, 
  FileText, 
  Plane, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  LogOut
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Mock data untuk simulasi timeline (nanti bisa diganti real data dari booking)
const steps = [
  { id: 1, title: "Pendaftaran", status: "completed", icon: User },
  { id: 2, title: "Pembayaran DP", status: "completed", icon: CreditCard },
  { id: 3, title: "Upload Dokumen", status: "current", icon: FileText },
  { id: 4, title: "Proses Visa", status: "upcoming", icon: CheckCircle2 },
  { id: 5, title: "Pelunasan", status: "upcoming", icon: CreditCard },
  { id: 6, title: "Keberangkatan", status: "upcoming", icon: Plane },
];

const Dashboard = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [loadingBooking, setLoadingBooking] = useState(true);

  // Simulasi fetch booking terakhir user
  useEffect(() => {
    const fetchLastBooking = async () => {
      if (!profile?.id) return;
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`*, packages(name, departure_date)`)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setActiveBooking(data);
      }
      setLoadingBooking(false);
    };

    fetchLastBooking();
  }, [profile]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header Area */}
      <div className="bg-primary text-primary-foreground pt-12 pb-24 px-6 rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-10 -mb-10 blur-2xl"></div>
        
        <div className="container mx-auto max-w-5xl relative z-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Assalamu'alaikum, {profile?.full_name?.split(' ')[0] || 'Jamaah'}!
            </h1>
            <p className="text-primary-foreground/80 text-lg">
              Semoga persiapan ibadah Anda dilancarkan.
            </p>
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleSignOut}
            className="hidden md:flex items-center gap-2 hover:bg-white/90"
          >
            <LogOut className="h-4 w-4" /> Keluar
          </Button>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 -mt-16 relative z-20 space-y-8">
        
        {/* Status Card Utama */}
        <Card className="shadow-xl border-none">
          <CardHeader className="border-b bg-white rounded-t-xl pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl text-primary">Status Perjalanan Anda</CardTitle>
                <CardDescription>
                  {activeBooking 
                    ? `Paket: ${activeBooking.packages?.name}` 
                    : "Anda belum memilih paket perjalanan."}
                </CardDescription>
              </div>
              {activeBooking && (
                <div className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 border border-blue-100">
                  <Clock className="h-4 w-4" />
                  {new Date(activeBooking.packages?.departure_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-8 pb-8">
            {!activeBooking && !loadingBooking ? (
               <div className="text-center py-8">
                 <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Plane className="h-8 w-8 text-gray-400" />
                 </div>
                 <h3 className="text-lg font-medium text-gray-900">Belum ada booking aktif</h3>
                 <p className="text-gray-500 mb-6 max-w-md mx-auto">
                   Pilih paket Umrah terbaik kami untuk memulai perjalanan spiritual Anda.
                 </p>
                 <Button onClick={() => navigate('/paket')} className="bg-primary hover:bg-primary/90">
                   Lihat Paket Umrah
                 </Button>
               </div>
            ) : (
              <div className="relative">
                {/* Mobile Stepper (Vertical) */}
                <div className="md:hidden space-y-6 pl-4 border-l-2 border-gray-100 ml-3">
                  {steps.map((step) => (
                    <div key={step.id} className="relative pl-6">
                      <div className={`absolute -left-[21px] top-0 w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white
                        ${step.status === 'completed' ? 'border-green-500 text-green-600' : 
                          step.status === 'current' ? 'border-primary text-primary animate-pulse' : 'border-gray-200 text-gray-300'}`}>
                        <step.icon className="h-4 w-4" />
                      </div>
                      <h4 className={`font-semibold ${step.status === 'current' ? 'text-primary' : 'text-gray-700'}`}>
                        {step.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {step.status === 'completed' ? 'Selesai' : step.status === 'current' ? 'Sedang Diproses' : 'Menunggu'}
                      </p>
                      {step.status === 'current' && (
                        <Button size="sm" className="mt-3 w-full" variant="outline">
                          Lengkapi Sekarang
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop Stepper (Horizontal) */}
                <div className="hidden md:flex justify-between relative">
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -z-10 -mt-8 rounded-full"></div>
                  {steps.map((step, index) => (
                    <div key={step.id} className="flex flex-col items-center relative z-10 w-1/6">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 bg-white transition-all duration-300
                        ${step.status === 'completed' ? 'border-green-500 text-green-600 shadow-green-100' : 
                          step.status === 'current' ? 'border-primary text-primary shadow-lg scale-110' : 'border-gray-100 text-gray-300'}`}>
                        <step.icon className="h-6 w-6" />
                      </div>
                      <div className="text-center mt-4">
                        <h4 className={`font-bold text-sm ${step.status === 'current' ? 'text-primary' : 'text-gray-600'}`}>
                          {step.title}
                        </h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block
                          ${step.status === 'completed' ? 'bg-green-100 text-green-700' : 
                            step.status === 'current' ? 'bg-blue-100 text-blue-700' : 'text-gray-400'}`}>
                          {step.status === 'completed' ? 'Selesai' : step.status === 'current' ? 'Proses' : 'Menunggu'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate('/my-bookings')}>
            <CardContent className="p-6 flex items-center space-x-4">
              <div className="bg-orange-100 p-3 rounded-xl group-hover:bg-orange-200 transition-colors">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Riwayat Booking</h3>
                <p className="text-sm text-gray-500">Lihat semua transaksi</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate('/profile')}>
            <CardContent className="p-6 flex items-center space-x-4">
              <div className="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-200 transition-colors">
                <User className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Edit Profil</h3>
                <p className="text-sm text-gray-500">Update data jamaah</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer group border-red-100 bg-red-50/50">
            <CardContent className="p-6 flex items-center space-x-4">
              <div className="bg-red-100 p-3 rounded-xl group-hover:bg-red-200 transition-colors">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-900">Bantuan</h3>
                <p className="text-sm text-red-500">Hubungi Admin</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
