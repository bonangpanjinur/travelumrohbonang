import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Crown, ArrowRight, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  tenantSiteId?: string;
  currentTemplate?: string;
}

interface PricingInfo {
  template_name: string;
  price: number;
  description: string | null;
}

const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

const templateLabel = (t: string) => {
  if (t === "premium") return "Premium ✨";
  if (t === "modern") return "Modern";
  return "Classic";
};

const UpgradeDialog = ({ open, onOpenChange, featureName, tenantSiteId, currentTemplate }: UpgradeDialogProps) => {
  const { user } = useAuth();
  const [pricing, setPricing] = useState<PricingInfo[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    setSelectedTemplate(null);
    setProofUrl("");
    setNotes("");

    supabase
      .from("template_pricing")
      .select("template_name, price, description")
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) setPricing(data as PricingInfo[]);
      });
  }, [open]);

  const availableTemplates = pricing.filter(p =>
    currentTemplate ? p.template_name !== currentTemplate : true
  );

  const selectedPricing = pricing.find(p => p.template_name === selectedTemplate);

  const handleSubmit = async () => {
    if (!selectedTemplate || !tenantSiteId || !user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("template_upgrade_orders").insert({
        tenant_site_id: tenantSiteId,
        requested_by: user.id,
        current_template: currentTemplate || "classic",
        target_template: selectedTemplate,
        price: selectedPricing?.price || 0,
        status: proofUrl ? "paid" : "pending",
        proof_url: proofUrl || null,
        notes: notes || null,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Pengajuan upgrade berhasil dikirim!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fallback for non-tenant upgrade dialog (premium feature gate)
  if (!tenantSiteId) {
    const waMessage = encodeURIComponent(`Halo, saya tertarik untuk upgrade fitur "${featureName}" pada sistem travel umroh saya.`);
    const waLink = `https://wa.me/6281234567890?text=${waMessage}`;

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Crown className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <DialogTitle className="text-center">Fitur Premium</DialogTitle>
            <DialogDescription className="text-center">
              Fitur <strong>{featureName}</strong> tersedia di paket Premium. Hubungi kami untuk upgrade sistem Anda.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Tutup</Button>
            <Button asChild className="w-full sm:w-auto bg-success hover:bg-success/90">
              <a href={waLink} target="_blank" rel="noopener noreferrer">Hubungi via WhatsApp</a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Crown className="w-6 h-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center">Upgrade Template</DialogTitle>
          <DialogDescription className="text-center">
            Pilih template tujuan dan lakukan pembayaran untuk upgrade
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <Crown className="w-8 h-8 text-success" />
            </div>
            <h3 className="font-semibold text-lg">Pengajuan Terkirim!</h3>
            <p className="text-sm text-muted-foreground">
              Admin akan memproses pengajuan upgrade Anda. Template akan otomatis berubah setelah dikonfirmasi.
            </p>
            <Button onClick={() => onOpenChange(false)} className="mt-2">Tutup</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current template info */}
            <div className="flex items-center justify-center gap-3 py-2">
              <Badge variant="secondary" className="text-sm px-3 py-1">{templateLabel(currentTemplate || "classic")}</Badge>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">?</span>
            </div>

            {/* Template selection */}
            <div className="grid gap-3">
              {availableTemplates.map(tp => (
                <button
                  key={tp.template_name}
                  onClick={() => setSelectedTemplate(tp.template_name)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedTemplate === tp.template_name
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{templateLabel(tp.template_name)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{tp.description}</p>
                    </div>
                    <p className="text-lg font-bold text-primary">{formatRp(tp.price)}</p>
                  </div>
                </button>
              ))}
            </div>

            {selectedTemplate && (
              <>
                {/* Payment proof */}
                <div>
                  <Label>Bukti Transfer (URL gambar)</Label>
                  <Input
                    value={proofUrl}
                    onChange={e => setProofUrl(e.target.value)}
                    placeholder="https://... (opsional, bisa dikirim nanti)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Upload bukti ke hosting gambar lalu paste URL-nya</p>
                </div>

                {/* Notes */}
                <div>
                  <Label>Catatan (opsional)</Label>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Catatan tambahan..."
                    rows={2}
                  />
                </div>

                <Button onClick={handleSubmit} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  {proofUrl ? "Kirim Pengajuan + Bukti" : "Kirim Pengajuan"}
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeDialog;
