import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/hooks/use-toast";
import SEO from "@/shared/components/seo/SEO";
import SignaturePad from "@/features/jamaah/components/SignaturePad";
import { CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/shared/lib/apiClient";
import { supabase } from "@/shared/integrations/supabase/client";

const defaultContractTemplate = (data: { name: string; bookingCode: string; packageName: string; total: number }) => `
  <h2>Kontrak Layanan Umroh</h2>
  <p>Saya yang bertanda tangan di bawah ini, <strong>${data.name}</strong>, telah membaca dan menyetujui ketentuan layanan umroh untuk booking <strong>${data.bookingCode}</strong> paket <strong>${data.packageName}</strong> dengan total biaya <strong>Rp ${data.total.toLocaleString("id-ID")}</strong>.</p>
  <p>Saya memahami kebijakan refund, pembatalan, dan jadwal pembayaran yang berlaku.</p>
`;

const ContractSign = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);

  useEffect(() => {
    if (!bookingId || !user) return;
    (async () => {
      try {
        const b = await apiFetch<any>(`/api/bookings/${bookingId}`);
        setBooking(b);

        const existing = await apiFetch<any>(`/api/contracts/${bookingId}`);
        setContract(existing);
      } catch (err: any) {
        toast({ title: "Gagal memuat data", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId, user]);

  const handleSign = async (dataUrl: string) => {
    if (!user || !booking) return;
    const html = defaultContractTemplate({
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Jamaah",
      bookingCode: booking.bookingCode,
      packageName: booking.packageTitle ?? "-",
      total: booking.totalPrice ?? 0,
    });

    try {
      const payload = {
        bookingId: booking.id,
        htmlContent: html,
        signatureDataUrl: dataUrl,
        signerName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || null,
      };

      await apiFetch("/api/contracts", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast({ title: "Kontrak ditandatangani" });
      navigate(`/my-bookings`);
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="py-16 text-center">Memuat…</div>;
  if (!booking) return <div className="py-16 text-center">Booking tidak ditemukan.</div>;

  const html = defaultContractTemplate({
    name: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Jamaah",
    bookingCode: booking.bookingCode,
    packageName: booking.packageTitle ?? "-",
    total: booking.totalPrice ?? 0,
  });

  return (
    <>
      <SEO title="Tanda Tangan Kontrak" noIndex />
      <div className="container max-w-3xl mx-auto py-10 px-4">
        <h1 className="text-2xl font-display font-bold mb-6">E-Signature Kontrak</h1>

        <Card className="mb-6">
          <CardHeader><CardTitle>Isi Kontrak</CardTitle></CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
          </CardContent>
        </Card>

        {contract?.signedAt ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-success">
                <CheckCircle2 /> Sudah Ditandatangani
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ditandatangani pada {new Date(contract.signedAt).toLocaleString("id-ID")}
              </p>
              {contract.signatureDataUrl && (
                <img src={contract.signatureDataUrl} alt="Tanda tangan" className="border rounded-md max-w-xs bg-white" />
              )}
              <Button variant="outline" onClick={() => setContract(null)}>Tanda Tangan Ulang</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle>Tanda Tangan Anda</CardTitle></CardHeader>
            <CardContent>
              <SignaturePad onSign={handleSign} />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default ContractSign;
