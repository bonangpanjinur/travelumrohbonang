import { Link } from "react-router-dom";
import { CalendarDays, ChevronRight, FileText, Headphones, MessageCircle, Plane, Receipt, ShieldCheck, Wallet } from "lucide-react";
import { useAuth } from "@/shared/hooks/useAuth";
import { useMyBookings } from "@/features/booking/hooks/useMyBookings";
import { Card, CardContent } from "@/shared/components/ui/card";
import NotificationBell from "@/shared/components/notifications/NotificationBell";
import { Button } from "@/shared/components/ui/button";

const formatRupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value)) : "Jadwal belum tersedia";

const quickActions = [
  { to: "/my-bookings", label: "Pemesanan saya", description: "Lihat status & invoice", icon: Receipt, tone: "bg-emerald-50 text-emerald-700" },
  { to: "/my-documents", label: "Dokumen saya", description: "Paspor & persyaratan", icon: FileText, tone: "bg-blue-50 text-blue-700" },
  { to: "/tabungan", label: "Tabungan umrah", description: "Pantau target perjalanan", icon: Wallet, tone: "bg-amber-50 text-amber-700" },
  { to: "/chat", label: "Bantuan perjalanan", description: "Hubungi tim kami", icon: Headphones, tone: "bg-violet-50 text-violet-700" },
];

export default function PortalJamaah() {
  const { user } = useAuth();
  const { bookings, loading } = useMyBookings(user?.id);
  const activeBooking = bookings.find((booking) => booking.status !== "cancelled") ?? bookings[0];
  const firstName = (user as any)?.firstName || (user as any)?.name?.split(" ")[0] || "Jemaah";

  return (
    <main className="min-h-screen bg-[#f7faf8] pb-[calc(8rem+env(safe-area-inset-bottom))]">
      <section className="bg-primary px-5 pb-7 pt-8 text-primary-foreground rounded-b-[2rem] shadow-lg">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-primary-foreground/70">Portal Jemaah</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Assalamu'alaikum, {firstName}</h1>
              <p className="mt-2 max-w-md text-sm text-primary-foreground/75">Semua persiapan perjalanan umrah Anda dalam satu tempat.</p>
            </div>
            <div className="rounded-full bg-white/10 p-1 text-primary-foreground"><NotificationBell /></div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs text-primary-foreground/70"><ShieldCheck className="h-4 w-4" /> Data perjalanan Anda terlindungi</div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        <Card className="overflow-hidden border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Perjalanan aktif</p><h2 className="mt-1 text-lg font-semibold">{loading ? "Memuat perjalanan…" : activeBooking?.packageTitle || "Belum ada pemesanan"}</h2></div>
              <Plane className="h-6 w-6 text-primary" />
            </div>
            {activeBooking ? <>
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-3 text-sm"><div><p className="text-xs text-muted-foreground">Keberangkatan</p><p className="mt-1 font-medium">{formatDate(activeBooking.departureDate)}</p></div><div><p className="text-xs text-muted-foreground">Kode pemesanan</p><p className="mt-1 font-medium">{activeBooking.bookingCode}</p></div></div>
              <div className="mt-4 flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Total perjalanan</p><p className="font-semibold">{formatRupiah(activeBooking.totalPrice)}</p></div><Link to={`/booking/payment/${activeBooking.id}`}><Button size="sm">Lihat pembayaran</Button></Link></div>
            </> : <p className="mt-3 text-sm text-muted-foreground">Belum ada data pemesanan. Jelajahi paket umrah dan mulai perjalanan Anda.</p>}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map(({ to, label, description, icon: Icon, tone }) => <Link key={to} to={to} className="group"><Card className="h-full border-0 shadow-sm transition-transform group-active:scale-[.98]"><CardContent className="p-4"><div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></div><p className="text-sm font-semibold leading-tight">{label}</p><p className="mt-1 text-[11px] leading-snug text-muted-foreground">{description}</p></CardContent></Card></Link>)}
        </div>

        <Card className="border-0 shadow-sm"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pusat perjalanan</p><h2 className="mt-1 text-lg font-semibold">Persiapkan keberangkatan</h2></div><CalendarDays className="h-6 w-6 text-primary" /></div><div className="mt-4 space-y-2"><Link to="/my-documents" className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3 text-sm hover:bg-muted"><span className="flex items-center gap-3"><FileText className="h-4 w-4 text-primary" />Lengkapi dokumen perjalanan</span><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link><Link to="/chat" className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3 text-sm hover:bg-muted"><span className="flex items-center gap-3"><MessageCircle className="h-4 w-4 text-primary" />Tanyakan persiapan kepada tim</span><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link></div></CardContent></Card>
      </div>
    </main>
  );
}
