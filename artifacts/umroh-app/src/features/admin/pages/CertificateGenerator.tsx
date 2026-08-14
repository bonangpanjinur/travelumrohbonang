import { useEffect, useMemo, useState } from "react";
import { Award, Download, Eye, Palette, Save, Sparkles } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { apiFetch } from "@/shared/lib/apiClient";
import { toast } from "sonner";

type CertificateType = "umroh" | "badal_umroh";

type Design = {
  accent: string;
  title: string;
  subtitle: string;
  body: string;
  recipientSize: number;
  recipientColor: string;
  footer: string;
  showLogo: boolean;
  showAddress: boolean;
};

const initialDesign: Design = {
  accent: "#b88a2a",
  title: "SERTIFIKAT {TYPE}",
  subtitle: "Diberikan kepada",
  body: "Dengan ini menerangkan bahwa",
  recipientSize: 38,
  recipientColor: "#123f35",
  footer: "Semoga menjadi amal ibadah yang diterima Allah SWT.",
  showLogo: true,
  showAddress: true,
};

export default function CertificateGenerator() {
  const [certificateType, setCertificateType] = useState<CertificateType>("umroh");
  const [design, setDesign] = useState<Design>(initialDesign);
  const [templateName, setTemplateName] = useState("Sertifikat Elegan Hijau");
  const [recipientName, setRecipientName] = useState("Nama Jemaah");
  const [performerName, setPerformerName] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [pilgrimId, setPilgrimId] = useState("");
  const [companyName, setCompanyName] = useState("Vins Tour Travel");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const resolvedTitle = useMemo(
    () => design.title.replace("{TYPE}", certificateType === "badal_umroh" ? "BADAL UMROH" : "UMROH"),
    [design.title, certificateType],
  );

  useEffect(() => {
    apiFetch("/api/admin/settings/key/branding").then((response: any) => {
      const value = response?.data?.value ?? response?.value ?? {};
      if (value.company_name) setCompanyName(value.company_name);
      if (value.logo_url) setLogoUrl(value.logo_url);
    }).catch(() => undefined);
    apiFetch("/api/admin/settings/key/contact").then((response: any) => {
      const value = response?.data?.value ?? response?.value ?? {};
      if (value.address) setAddress(value.address);
    }).catch(() => undefined);
  }, []);

  const updateDesign = <K extends keyof Design>(key: K, value: Design[K]) => setDesign((current) => ({ ...current, [key]: value }));

  const saveTemplate = async () => {
    if (!templateName.trim()) { toast.error("Nama template wajib diisi"); return; }
    setSaving(true);
    try {
      await apiFetch("/api/admin/certificates/templates", {
        method: "POST",
        body: JSON.stringify({ name: templateName.trim(), certificateType, design: { ...design, logoUrl, companyName, address } }),
      });
      toast.success("Template sertifikat berhasil disimpan");
    } catch (error: any) {
      toast.error(error?.message || "Gagal menyimpan template");
    } finally { setSaving(false); }
  };

  const issueCertificate = async () => {
    if (!bookingId.trim() || !pilgrimId.trim()) { toast.error("Booking ID dan Jemaah ID wajib diisi"); return; }
    try {
      const response: any = await apiFetch(`/api/admin/certificates/booking/${bookingId}/pilgrim/${pilgrimId}/issue`, {
        method: "POST",
        body: JSON.stringify({ certificateType, performerName: certificateType === "badal_umroh" ? performerName : null }),
      });
      toast.success(`Sertifikat ${response?.data?.certificateNumber || "berhasil diterbitkan"}`);
    } catch (error: any) { toast.error(error?.message || "Gagal menerbitkan sertifikat"); }
  };

  return (
    <div className="min-h-full bg-slate-50/70 p-4 md:p-6">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <div className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-r from-[#123f35] to-[#1b6654] p-6 text-white shadow-xl md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100"><Sparkles className="h-4 w-4" /> Dokumen Premium</div>
            <h1 className="text-2xl font-bold md:text-3xl">Generator Sertifikat</h1>
            <p className="mt-1 max-w-2xl text-sm text-emerald-50/80">Desain, simpan, dan terbitkan sertifikat Umroh atau Badal Umroh langsung dari panel admin.</p>
          </div>
          <div className="flex rounded-2xl bg-white/10 p-1">
            <button onClick={() => setCertificateType("umroh")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${certificateType === "umroh" ? "bg-white text-[#123f35]" : "text-white"}`}>Umroh</button>
            <button onClick={() => setCertificateType("badal_umroh")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${certificateType === "badal_umroh" ? "bg-white text-[#123f35]" : "text-white"}`}>Badal Umroh</button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="space-y-4 rounded-3xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><Palette className="h-5 w-5 text-[#b88a2a]" /><h2 className="font-semibold">Pengaturan Desain</h2></div>
            <div className="space-y-4">
              <div><Label>Nama Template</Label><Input className="mt-1" value={templateName} onChange={(e) => setTemplateName(e.target.value)} /></div>
              <div><Label>Judul Sertifikat</Label><Input className="mt-1" value={design.title} onChange={(e) => updateDesign("title", e.target.value)} /><p className="mt-1 text-[11px] text-muted-foreground">Gunakan {"{TYPE}"} agar otomatis berubah sesuai jenis sertifikat.</p></div>
              <div><Label>Subjudul</Label><Input className="mt-1" value={design.subtitle} onChange={(e) => updateDesign("subtitle", e.target.value)} /></div>
              <div><Label>Kalimat Pembuka</Label><Input className="mt-1" value={design.body} onChange={(e) => updateDesign("body", e.target.value)} /></div>
              {certificateType === "badal_umroh" && <div><Label>Nama Pelaksana Badal</Label><Input className="mt-1" placeholder="Contoh: Ahmad Fauzan" value={performerName} onChange={(e) => setPerformerName(e.target.value)} /></div>}
              <div className="grid grid-cols-2 gap-3"><div><Label>Warna Aksen</Label><Input className="mt-1 h-10 p-1" type="color" value={design.accent} onChange={(e) => updateDesign("accent", e.target.value)} /></div><div><Label>Warna Nama</Label><Input className="mt-1 h-10 p-1" type="color" value={design.recipientColor} onChange={(e) => updateDesign("recipientColor", e.target.value)} /></div></div>
              <div><Label>Ukuran Nama: {design.recipientSize}px</Label><input className="mt-3 w-full accent-[#b88a2a]" type="range" min="24" max="58" value={design.recipientSize} onChange={(e) => updateDesign("recipientSize", Number(e.target.value))} /></div>
              <div><Label>Kalimat Penutup</Label><Textarea className="mt-1" rows={3} value={design.footer} onChange={(e) => updateDesign("footer", e.target.value)} /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={design.showLogo} onChange={(e) => updateDesign("showLogo", e.target.checked)} /> Tampilkan logo perusahaan</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={design.showAddress} onChange={(e) => updateDesign("showAddress", e.target.checked)} /> Tampilkan alamat perusahaan</label>
            </div>
            <Button className="w-full gap-2 bg-[#123f35] hover:bg-[#0d2f28]" onClick={saveTemplate} disabled={saving}><Save className="h-4 w-4" /> {saving ? "Menyimpan…" : "Simpan Template"}</Button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between"><div><p className="text-sm font-semibold">Preview Sertifikat</p><p className="text-xs text-muted-foreground">Perubahan desain terlihat secara langsung.</p></div><Button variant="outline" className="gap-2" onClick={() => window.print()}><Download className="h-4 w-4" /> Cetak / PDF</Button></div>
            <div className="overflow-auto rounded-3xl border bg-slate-200/70 p-4 shadow-inner md:p-8">
              <div className="relative mx-auto aspect-[1.414/1] max-w-[1000px] overflow-hidden rounded-xl border-[12px] bg-[#fffdf7] p-8 text-center shadow-2xl md:p-14" style={{ borderColor: design.accent }}>
                <div className="pointer-events-none absolute inset-4 rounded-lg border" style={{ borderColor: `${design.accent}66` }} />
                {design.showLogo && logoUrl ? <img src={logoUrl} alt="Logo" className="relative mx-auto mb-3 h-14 w-14 object-contain" /> : <div className="relative mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: `${design.accent}22`, color: design.accent }}><Award className="h-7 w-7" /></div>}
                <p className="relative text-xs font-bold uppercase tracking-[0.3em]" style={{ color: design.accent }}>{companyName}</p>
                <div className="relative mx-auto my-6 h-px w-2/3" style={{ backgroundColor: design.accent }} />
                <h2 className="relative text-xl font-bold tracking-[0.14em] md:text-3xl" style={{ color: design.accent }}>{resolvedTitle}</h2>
                <p className="relative mt-5 text-sm text-slate-500">{design.subtitle}</p>
                <p className="relative mt-4 text-sm text-slate-600">{design.body}</p>
                <p className="relative mt-4 font-serif font-bold" style={{ color: design.recipientColor, fontSize: `${design.recipientSize}px` }}>{recipientName || "Nama Jemaah"}</p>
                {certificateType === "badal_umroh" && <p className="relative mt-2 text-sm text-slate-600">Dilaksanakan oleh <strong>{performerName || "Nama Pelaksana Badal"}</strong></p>}
                <p className="relative mx-auto mt-8 max-w-xl text-xs italic text-slate-500">{design.footer}</p>
                {design.showAddress && address && <p className="absolute bottom-5 left-0 right-0 text-[10px] text-slate-400">{address}</p>}
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="mb-3 flex items-center gap-2"><Eye className="h-4 w-4 text-[#b88a2a]" /><p className="text-sm font-semibold">Terbitkan ke Jemaah</p></div><div className="grid gap-3 md:grid-cols-3"><div><Label>Booking ID</Label><Input className="mt-1" placeholder="UUID booking" value={bookingId} onChange={(e) => setBookingId(e.target.value)} /></div><div><Label>Jemaah ID</Label><Input className="mt-1" placeholder="UUID jemaah" value={pilgrimId} onChange={(e) => setPilgrimId(e.target.value)} /></div><div><Label>Nama Jemaah Preview</Label><Input className="mt-1" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} /></div></div><Button className="mt-4 gap-2" onClick={issueCertificate}><Award className="h-4 w-4" /> Terbitkan Sertifikat</Button></div>
          </div>
        </div>
      </div>
    </div>
  );
}
