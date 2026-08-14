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
  layout: "elegant" | "classic" | "modern" | "premium";
  accent: string;
  title: string;
  subtitle: string;
  body: string;
  recipientSize: number;
  recipientColor: string;
  footer: string;
  showLogo: boolean;
  showAddress: boolean;
  additionalLogoUrl: string;
  showAdditionalLogo: boolean;
};

type PackageOption = { id: string; title: string };
type DepartureOption = { id: string; departureDate: string; packageTitle: string | null };
type BookingOption = { id: string; bookingCode: string; status: string | null; packageTitle: string | null; departureDate: string | null };
type PilgrimOption = { id: string; name: string; gender: string | null; passportNumber: string | null };

const TEMPLATES: Record<string, Design> = {
  elegant: { layout: "elegant", accent: "#123f35", title: "SERTIFIKAT {TYPE}", subtitle: "Diberikan kepada", body: "Dengan ini menerangkan bahwa", recipientSize: 42, recipientColor: "#123f35", footer: "Semoga menjadi amal ibadah yang diterima Allah SWT.", showLogo: true, showAddress: true, additionalLogoUrl: "", showAdditionalLogo: false },
  classic: { layout: "classic", accent: "#b88a2a", title: "PIAGAM PENGHARGAAN {TYPE}", subtitle: "Diberikan sebagai apresiasi kepada", body: "Telah menyelesaikan ibadah dengan khidmat", recipientSize: 38, recipientColor: "#1e293b", footer: "Barakallahu fiikum.", showLogo: true, showAddress: true, additionalLogoUrl: "", showAdditionalLogo: false },
  modern: { layout: "modern", accent: "#0ea5e9", title: "CERTIFICATE OF {TYPE}", subtitle: "This is to certify that", body: "Has successfully completed the journey", recipientSize: 48, recipientColor: "#0f172a", footer: "May your journey be blessed.", showLogo: true, showAddress: false, additionalLogoUrl: "", showAdditionalLogo: false },
  premium: { layout: "premium", accent: "#7c2d12", title: "SERTIFIKAT EKSKLUSIF {TYPE}", subtitle: "Penghargaan tertinggi untuk", body: "Atas dedikasi dan kesungguhan dalam beribadah", recipientSize: 40, recipientColor: "#431407", footer: "Vins Tour Travel - Melayani dengan Sepenuh Hati", showLogo: true, showAddress: true, additionalLogoUrl: "", showAdditionalLogo: false },
};

const initialDesign: Design = TEMPLATES.elegant;

export default function CertificateGenerator() {
  const [certificateType, setCertificateType] = useState<CertificateType>("umroh");
  const [design, setDesign] = useState<Design>(initialDesign);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("elegant");
  const [templateName, setTemplateName] = useState("Sertifikat Elegan Hijau");
  const [recipientName, setRecipientName] = useState("Nama Jemaah");
  const [performerName, setPerformerName] = useState("");
  const [packageId, setPackageId] = useState("");
  const [month, setMonth] = useState("");
  const [departureId, setDepartureId] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [pilgrimId, setPilgrimId] = useState("");
  const [packageOptions, setPackageOptions] = useState<PackageOption[]>([]);
  const [departureOptions, setDepartureOptions] = useState<DepartureOption[]>([]);
  const [bookingOptions, setBookingOptions] = useState<BookingOption[]>([]);
  const [pilgrimOptions, setPilgrimOptions] = useState<PilgrimOption[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [loadingDepartures, setLoadingDepartures] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingPilgrims, setLoadingPilgrims] = useState(false);
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

  useEffect(() => {
    let active = true;
    setLoadingPackages(true);
    apiFetch<{ data: PackageOption[] }>("/api/admin/certificates/selector/packages")
      .then((response) => { if (active) setPackageOptions(response?.data || []); })
      .catch(() => { if (active) toast.error("Daftar paket tidak dapat dimuat"); })
      .finally(() => { if (active) setLoadingPackages(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setDepartureId(""); setBookingId(""); setPilgrimId(""); setBookingOptions([]); setPilgrimOptions([]);
    if (!packageId && !month) { setDepartureOptions([]); return; }
    let active = true;
    setLoadingDepartures(true);
    const params = new URLSearchParams();
    if (packageId) params.set("packageId", packageId);
    if (month) params.set("month", month);
    apiFetch<{ data: DepartureOption[] }>(`/api/admin/certificates/selector/departures?${params.toString()}`)
      .then((response) => { if (active) setDepartureOptions(response?.data || []); })
      .catch(() => { if (active) toast.error("Tanggal keberangkatan tidak dapat dimuat"); })
      .finally(() => { if (active) setLoadingDepartures(false); });
    return () => { active = false; };
  }, [packageId, month]);

  useEffect(() => {
    setBookingId(""); setPilgrimId(""); setPilgrimOptions([]);
    if (!departureId) { setBookingOptions([]); return; }
    let active = true;
    setLoadingBookings(true);
    const params = new URLSearchParams({ departureId });
    if (packageId) params.set("packageId", packageId);
    apiFetch<{ data: BookingOption[] }>(`/api/admin/certificates/selector/bookings?${params.toString()}`)
      .then((response) => { if (active) setBookingOptions(response?.data || []); })
      .catch(() => { if (active) toast.error("Daftar booking tidak dapat dimuat"); })
      .finally(() => { if (active) setLoadingBookings(false); });
    return () => { active = false; };
  }, [departureId, packageId]);

  useEffect(() => {
    if (!bookingId) { setPilgrimOptions([]); setPilgrimId(""); return; }
    let active = true;
    setLoadingPilgrims(true);
    apiFetch<{ data: PilgrimOption[] }>(`/api/admin/certificates/selector/bookings/${bookingId}/pilgrims`)
      .then((response) => { if (active) setPilgrimOptions(response?.data || []); })
      .catch(() => { if (active) toast.error("Daftar jemaah tidak dapat dimuat"); })
      .finally(() => { if (active) setLoadingPilgrims(false); });
    return () => { active = false; };
  }, [bookingId]);

  useEffect(() => {
    const selected = pilgrimOptions.find((pilgrim) => pilgrim.id === pilgrimId);
    if (selected) setRecipientName(selected.name);
  }, [pilgrimId, pilgrimOptions]);

  const updateDesign = <K extends keyof Design>(key: K, value: Design[K]) => setDesign((current) => ({ ...current, [key]: value }));

  const handleAdditionalLogoUpload = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Logo tambahan harus berupa file gambar"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Ukuran logo maksimal 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => updateDesign("additionalLogoUrl", String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const applyTemplate = (key: string) => {
    const template = TEMPLATES[key];
    if (!template) return;
    setDesign({ ...template });
    setSelectedTemplateKey(key);
    const names: Record<string, string> = { elegant: "Elegan Hijau", classic: "Klasik Islami", modern: "Minimalis Modern", premium: "Premium Gold" };
    setTemplateName(`Sertifikat ${names[key] || key}`);
  };

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

  const printCertificate = () => {
    document.body.classList.add("certificate-printing");
    window.print();
    window.setTimeout(() => document.body.classList.remove("certificate-printing"), 1200);
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
            <div><Label>Gaya Template</Label><div className="mt-2 grid grid-cols-2 gap-2">{Object.entries(TEMPLATES).map(([key, template]) => <button key={key} type="button" onClick={() => applyTemplate(key)} className={`rounded-xl border p-3 text-left transition ${selectedTemplateKey === key ? "border-[#b88a2a] bg-amber-50 ring-2 ring-amber-200" : "border-slate-200 hover:border-slate-300"}`}><div className="mb-2 h-6 rounded-md" style={{ background: `linear-gradient(135deg, ${template.accent}, ${template.layout === "modern" ? "#e0f2fe" : "#fff7ed"})` }} /><p className="text-xs font-semibold">{key === "elegant" ? "Elegan Hijau" : key === "classic" ? "Klasik Islami" : key === "modern" ? "Minimalis Modern" : "Premium Gold"}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{template.layout === "modern" ? "Clean & minimal" : template.layout === "classic" ? "Ornamen klasik" : template.layout === "premium" ? "Bingkai premium" : "Formal natural"}</p></button>)}</div></div>
            <div className="space-y-4">
              <div><Label>Nama Template</Label><Input className="mt-1" value={templateName} onChange={(e) => setTemplateName(e.target.value)} /></div>
              <div><Label>Judul Sertifikat</Label><Input className="mt-1" value={design.title} onChange={(e) => updateDesign("title", e.target.value)} /><p className="mt-1 text-[11px] text-muted-foreground">Gunakan {"{TYPE}"} agar otomatis berubah sesuai jenis sertifikat.</p></div>
              <div><Label>Subjudul</Label><Input className="mt-1" value={design.subtitle} onChange={(e) => updateDesign("subtitle", e.target.value)} /></div>
              <div><Label>Kalimat Pembuka</Label><Input className="mt-1" value={design.body} onChange={(e) => updateDesign("body", e.target.value)} /></div>
              {certificateType === "badal_umroh" && <div><Label>Nama Pelaksana Badal</Label><Input className="mt-1" placeholder="Contoh: Ahmad Fauzan" value={performerName} onChange={(e) => setPerformerName(e.target.value)} /></div>}
              <div className="grid grid-cols-2 gap-3"><div><Label>Warna Aksen</Label><Input className="mt-1 h-10 p-1" type="color" value={design.accent} onChange={(e) => updateDesign("accent", e.target.value)} /></div><div><Label>Warna Nama</Label><Input className="mt-1 h-10 p-1" type="color" value={design.recipientColor} onChange={(e) => updateDesign("recipientColor", e.target.value)} /></div></div>
              <div><Label>Ukuran Nama: {design.recipientSize}px</Label><input className="mt-3 w-full accent-[#b88a2a]" type="range" min="24" max="58" value={design.recipientSize} onChange={(e) => updateDesign("recipientSize", Number(e.target.value))} /></div>
              <div><Label>Kalimat Penutup</Label><Textarea className="mt-1" rows={3} value={design.footer} onChange={(e) => updateDesign("footer", e.target.value)} /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={design.showLogo} onChange={(e) => updateDesign("showLogo", e.target.checked)} /> Tampilkan logo utama travel</label>
              <div className="rounded-xl border border-dashed border-slate-300 p-3"><Label>Logo Tambahan</Label><p className="mt-1 text-[11px] text-muted-foreground">Upload logo partner, sponsor, atau masukkan URL logo.</p><Input className="mt-2" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => handleAdditionalLogoUpload(e.target.files?.[0])} /><Input className="mt-2" placeholder="https://contoh.com/logo.png" value={design.additionalLogoUrl.startsWith("data:") ? "" : design.additionalLogoUrl} onChange={(e) => updateDesign("additionalLogoUrl", e.target.value)} /><label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={design.showAdditionalLogo} disabled={!design.additionalLogoUrl} onChange={(e) => updateDesign("showAdditionalLogo", e.target.checked)} /> Tampilkan logo tambahan</label>{design.additionalLogoUrl && <button type="button" className="mt-2 text-xs font-medium text-red-600" onClick={() => { updateDesign("additionalLogoUrl", ""); updateDesign("showAdditionalLogo", false); }}>Hapus logo tambahan</button>}</div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={design.showAddress} onChange={(e) => updateDesign("showAddress", e.target.checked)} /> Tampilkan alamat perusahaan</label>
            </div>
            <Button className="w-full gap-2 bg-[#123f35] hover:bg-[#0d2f28]" onClick={saveTemplate} disabled={saving}><Save className="h-4 w-4" /> {saving ? "Menyimpan…" : "Simpan Template"}</Button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between"><div><p className="text-sm font-semibold">Preview Sertifikat</p><p className="text-xs text-muted-foreground">Perubahan desain terlihat secara langsung.</p></div><Button variant="outline" className="gap-2" onClick={printCertificate}><Download className="h-4 w-4" /> Cetak / PDF</Button></div>
            <div className="overflow-auto rounded-3xl border bg-slate-200/70 p-4 shadow-inner md:p-8">
              <div className={`certificate-print-root relative mx-auto aspect-[1.414/1] max-w-[1000px] overflow-hidden rounded-xl border-[12px] p-8 text-center shadow-2xl md:p-14 ${design.layout === "modern" ? "bg-white" : design.layout === "classic" ? "bg-[#fffaf0]" : design.layout === "premium" ? "bg-[#fff7ed]" : "bg-[#fffdf7]"}`} style={{ borderColor: design.accent }}>
                <div className="pointer-events-none absolute inset-4 rounded-lg border" style={{ borderColor: `${design.accent}66` }} />
                {design.layout === "classic" && <div className="pointer-events-none absolute left-7 top-7 h-16 w-16 rounded-full border-2 opacity-40" style={{ borderColor: design.accent }} />}
                {design.layout === "premium" && <div className="pointer-events-none absolute bottom-7 right-7 h-20 w-20 rotate-45 border-2 opacity-40" style={{ borderColor: design.accent }} />}
                {design.layout === "modern" && <div className="pointer-events-none absolute left-0 top-0 h-2 w-1/3" style={{ backgroundColor: design.accent }} />}
                {design.showAdditionalLogo && design.additionalLogoUrl && <img src={design.additionalLogoUrl} alt="Logo tambahan" className="absolute right-8 top-8 h-16 w-16 object-contain md:right-14 md:top-14" />}
                {design.showLogo && logoUrl ? <img src={logoUrl} alt="Logo travel" className="relative mx-auto mb-3 h-14 w-14 object-contain" /> : <div className="relative mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: `${design.accent}22`, color: design.accent }}><Award className="h-7 w-7" /></div>}
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
            <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="mb-3 flex items-center gap-2"><Eye className="h-4 w-4 text-[#b88a2a]" /><div><p className="text-sm font-semibold">Pilih Jemaah untuk Sertifikat</p><p className="text-xs text-muted-foreground">Saring data secara bertahap agar tidak perlu mencari dari ribuan booking.</p></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><div><Label>Paket</Label><select className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={packageId} disabled={loadingPackages} onChange={(e) => setPackageId(e.target.value)}><option value="">{loadingPackages ? "Memuat paket…" : "Semua paket"}</option>{packageOptions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div><div><Label>Bulan Keberangkatan</Label><Input className="mt-1" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div><div><Label>Tanggal Keberangkatan</Label><select className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={departureId} disabled={loadingDepartures || (!packageId && !month)} onChange={(e) => setDepartureId(e.target.value)}><option value="">{loadingDepartures ? "Memuat tanggal…" : packageId || month ? "Pilih tanggal" : "Pilih paket/bulan dahulu"}</option>{departureOptions.map((item) => <option key={item.id} value={item.id}>{new Date(item.departureDate).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</option>)}</select></div><div><Label>Booking</Label><select className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={bookingId} disabled={loadingBookings || !departureId} onChange={(e) => { setBookingId(e.target.value); setPilgrimId(""); setRecipientName("Nama Jemaah"); }}><option value="">{loadingBookings ? "Memuat booking…" : departureId ? "Pilih booking" : "Pilih tanggal dahulu"}</option>{bookingOptions.map((booking) => <option key={booking.id} value={booking.id}>{booking.bookingCode}</option>)}</select></div><div><Label>Jemaah</Label><select className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={pilgrimId} disabled={!bookingId || loadingPilgrims} onChange={(e) => setPilgrimId(e.target.value)}><option value="">{loadingPilgrims ? "Memuat jemaah…" : bookingId ? "Pilih jemaah" : "Pilih booking dahulu"}</option>{pilgrimOptions.map((pilgrim) => <option key={pilgrim.id} value={pilgrim.id}>{pilgrim.name}{pilgrim.gender ? ` • ${pilgrim.gender}` : ""}</option>)}</select></div></div><div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">{pilgrimId ? `Sertifikat akan diterbitkan untuk ${recipientName}.` : "Belum ada jemaah yang dipilih."}</div><Button className="mt-4 gap-2" onClick={issueCertificate} disabled={!bookingId || !pilgrimId}><Award className="h-4 w-4" /> Terbitkan Sertifikat</Button></div>
          </div>
        </div>
      </div>
    </div>
  );
}
