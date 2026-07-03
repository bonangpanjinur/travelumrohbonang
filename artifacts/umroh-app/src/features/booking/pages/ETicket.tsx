import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";
import Navbar from "@/shared/components/layout/Navbar";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Loader2, ArrowLeft, Plane, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import SEO from "@/shared/components/seo/SEO";
import { apiFetch } from "@/shared/lib/apiClient";

const ETicket = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !bookingId) return;
    (async () => {
      try {
        const b = await apiFetch<any>(`/api/bookings/${bookingId}`);
        setData(b);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId, user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">E-Ticket tidak ditemukan</div>;
  if (data.status !== "paid") return <div className="min-h-screen flex items-center justify-center text-muted-foreground">E-Ticket hanya tersedia untuk booking lunas.</div>;

  return (
    <div className="min-h-screen bg-muted/30">
      <SEO title={`E-Ticket ${data.bookingCode}`} />
      <Navbar />
      <main className="pt-24 pb-16 print:pt-0">
        <div className="container-custom max-w-2xl space-y-4">
          <div className="flex items-center justify-between print:hidden">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-1" />Kembali</Button>
            <Button size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" />Cetak</Button>
          </div>
          <Card className="overflow-hidden">
            <div className="bg-primary text-primary-foreground p-6 flex items-center justify-between">
              <div>
                <div className="text-xs opacity-90">E-TICKET UMROH</div>
                <div className="font-mono text-lg font-bold">{data.bookingCode}</div>
              </div>
              <Plane className="w-10 h-10 opacity-80" />
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-center md:items-start">
                <div className="bg-white p-3 rounded-lg border border-border">
                  <QRCodeSVG value={data.bookingCode} size={140} />
                </div>
                <div className="flex-1 space-y-2 text-sm">
                  <Row label="Paket" value={data.packageTitle || "-"} />
                  <Row label="Berangkat" value={data.departureDate ? format(new Date(data.departureDate), "EEEE, d MMM yyyy", { locale: localeId }) : "-"} />
                  <Row label="Kembali" value={data.returnDate ? format(new Date(data.returnDate), "EEEE, d MMM yyyy", { locale: localeId }) : "-"} />
                  <Row label="Total" value={`Rp ${Number(data.totalPrice).toLocaleString("id-ID")}`} />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="text-xs uppercase text-muted-foreground mb-2">Daftar Jemaah</div>
                <div className="space-y-1.5">
                  {(data.pilgrims || []).map((p: any, i: number) => (
                    <div key={i} className="text-sm flex justify-between border-b border-border/50 pb-1.5">
                      <span className="font-medium">{i + 1}. {p.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{p.passport_number || p.nik || "-"}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground border-t border-border pt-3">
                Tunjukkan QR ini saat keberangkatan untuk verifikasi manifest.
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right">{value}</span>
  </div>
);

export default ETicket;
