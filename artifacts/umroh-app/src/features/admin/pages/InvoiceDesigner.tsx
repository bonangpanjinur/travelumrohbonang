import { useEffect, useMemo, useState } from "react";
import { Check, FileText, LayoutTemplate, Save } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { apiFetch } from "@/shared/lib/apiClient";
import { toast } from "sonner";

export type InvoiceTemplateSettings = {
  templateKey: "emerald-classic" | "gold-premium" | "minimal-slate" | "ramadan-night";
  paper: "A4" | "Letter";
  orientation: "portrait" | "landscape";
  primaryColor: string;
  accentColor: string;
  fontFamily: "Inter" | "Arial" | "Georgia" | "Noto Sans";
  borderStyle: "none" | "solid" | "double";
  showLogo: boolean;
  showQr: boolean;
  showCompanyAddress: boolean;
  showCustomerPhone: boolean;
  showRoomBreakdown: boolean;
  showPilgrims: boolean;
  showPaymentHistory: boolean;
  showPaymentPolicy: boolean;
  showPaymentSchedule: boolean;
  footerText: string;
};

const DEFAULTS: InvoiceTemplateSettings = {
  templateKey: "emerald-classic", paper: "A4", orientation: "portrait", primaryColor: "#0d6b4e", accentColor: "#b88a2a", fontFamily: "Inter", borderStyle: "solid", showLogo: true, showQr: true, showCompanyAddress: true, showCustomerPhone: true, showRoomBreakdown: true, showPilgrims: true, showPaymentHistory: true, showPaymentPolicy: true, showPaymentSchedule: true, footerText: "Invoice ini dihasilkan secara otomatis oleh sistem.",
};

const PRESETS = [
  { key: "emerald-classic", name: "Emerald Classic", primary: "#0d6b4e", accent: "#b88a2a", description: "Formal, hangat, dan sesuai identitas travel umroh." },
  { key: "gold-premium", name: "Gold Premium", primary: "#33251b", accent: "#d4af37", description: "Nuansa premium untuk paket VIP." },
  { key: "minimal-slate", name: "Minimal Slate", primary: "#334155", accent: "#64748b", description: "Bersih dan efisien untuk operasional harian." },
  { key: "ramadan-night", name: "Ramadan Night", primary: "#172554", accent: "#fbbf24", description: "Kontras malam dengan aksen emas." },
] as const;

const SECTION_FIELDS: Array<[keyof InvoiceTemplateSettings, string]> = [
  ["showLogo", "Logo perusahaan"], ["showQr", "QR tracking"], ["showCompanyAddress", "Alamat perusahaan"], ["showCustomerPhone", "Nomor telepon pelanggan"], ["showRoomBreakdown", "Rincian kamar"], ["showPilgrims", "Daftar jemaah"], ["showPaymentHistory", "Riwayat pembayaran"], ["showPaymentPolicy", "Aturan pembayaran"], ["showPaymentSchedule", "Jadwal cicilan"],
];

export default function InvoiceDesigner() {
  const [settings, setSettings] = useState<InvoiceTemplateSettings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const preset = useMemo(() => PRESETS.find((item) => item.key === settings.templateKey) ?? PRESETS[0], [settings.templateKey]);

  useEffect(() => {
    apiFetch<{ data?: { value?: Partial<InvoiceTemplateSettings> } }>("/api/admin/settings/invoice-template")
      .then((response) => setSettings({ ...DEFAULTS, ...(response?.data?.value || {}) }))
      .catch(() => undefined);
  }, []);

  const update = <K extends keyof InvoiceTemplateSettings>(key: K, value: InvoiceTemplateSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));
  const applyPreset = (item: typeof PRESETS[number]) => setSettings((current) => ({ ...current, templateKey: item.key, primaryColor: item.primary, accentColor: item.accent }));
  const save = async () => {
    setSaving(true);
    try { await apiFetch("/api/admin/settings/invoice-template", { method: "PUT", body: JSON.stringify({ value: settings }) }); toast.success("Pengaturan invoice berhasil disimpan"); }
    catch (error: any) { toast.error(error?.message || "Gagal menyimpan pengaturan invoice"); }
    finally { setSaving(false); }
  };

  return <div className="min-h-full bg-slate-50/70 p-4 md:p-6"><div className="mx-auto max-w-[1500px] space-y-6">
    <div className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-700 p-6 text-white shadow-xl md:flex-row md:items-center"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300"><FileText className="h-4 w-4" /> Dokumen & Branding</div><h1 className="text-2xl font-bold md:text-3xl">Invoice Designer</h1><p className="mt-1 max-w-2xl text-sm text-slate-300">Atur identitas visual, struktur informasi, dan template invoice yang digunakan tim saat mencetak dokumen.</p></div><Button onClick={save} disabled={saving} className="bg-white text-slate-900 hover:bg-slate-100"><Save className="mr-2 h-4 w-4" />{saving ? "Menyimpan…" : "Simpan Pengaturan"}</Button></div>
    <div className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
      <div className="space-y-5 rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2"><LayoutTemplate className="h-5 w-5 text-amber-600" /><h2 className="font-semibold">Template Visual</h2></div>
        <div className="grid grid-cols-2 gap-3">{PRESETS.map((item) => <button key={item.key} type="button" onClick={() => applyPreset(item)} className={`rounded-2xl border p-3 text-left ${settings.templateKey === item.key ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200" : "hover:border-slate-400"}`}><div className="mb-3 h-12 rounded-xl" style={{ background: `linear-gradient(135deg, ${item.primary}, ${item.accent})` }} />{settings.templateKey === item.key && <Check className="float-right h-4 w-4 text-amber-700" />}<p className="text-sm font-semibold">{item.name}</p><p className="mt-1 text-[11px] leading-snug text-muted-foreground">{item.description}</p></button>)}</div>
        <div className="grid grid-cols-2 gap-3"><div><Label>Warna utama</Label><div className="mt-1 flex gap-2"><input type="color" value={settings.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="h-10 w-12 rounded border p-1" /><Input value={settings.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} /></div></div><div><Label>Warna aksen</Label><div className="mt-1 flex gap-2"><input type="color" value={settings.accentColor} onChange={(e) => update("accentColor", e.target.value)} className="h-10 w-12 rounded border p-1" /><Input value={settings.accentColor} onChange={(e) => update("accentColor", e.target.value)} /></div></div></div>
        <div className="grid grid-cols-2 gap-3"><div><Label>Kertas</Label><select className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={settings.paper} onChange={(e) => update("paper", e.target.value as InvoiceTemplateSettings["paper"])}><option>A4</option><option>Letter</option></select></div><div><Label>Orientasi</Label><select className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={settings.orientation} onChange={(e) => update("orientation", e.target.value as InvoiceTemplateSettings["orientation"])}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></div></div>
        <div><Label>Font</Label><select className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={settings.fontFamily} onChange={(e) => update("fontFamily", e.target.value as InvoiceTemplateSettings["fontFamily"])}>{["Inter", "Arial", "Georgia", "Noto Sans"].map((font) => <option key={font}>{font}</option>)}</select></div>
        <div><Label>Gaya garis section</Label><select className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={settings.borderStyle} onChange={(e) => update("borderStyle", e.target.value as InvoiceTemplateSettings["borderStyle"])}><option value="none">Tanpa garis</option><option value="solid">Solid</option><option value="double">Double</option></select></div>
        <div className="space-y-2 border-t pt-4"><p className="text-sm font-semibold">Konten invoice</p>{SECTION_FIELDS.map(([key, label]) => <div key={String(key)} className="flex items-center justify-between gap-4 text-sm"><span>{label}</span><Switch checked={Boolean(settings[key])} onCheckedChange={(value) => update(key, value as never)} /></div>)}</div>
        <div><Label>Footer</Label><textarea className="mt-1 min-h-20 w-full rounded-md border bg-background p-3 text-sm" value={settings.footerText} onChange={(e) => update("footerText", e.target.value)} maxLength={500} /></div>
      </div>
      <div className="rounded-3xl border bg-slate-100 p-5 shadow-inner"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Live Preview</h2><p className="text-xs text-muted-foreground">Preview struktur, warna, dan visibilitas section.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-medium shadow-sm">{settings.paper} · {settings.orientation}</span></div><div className="mx-auto max-w-3xl rounded-lg bg-white p-6 shadow-xl" style={{ fontFamily: settings.fontFamily, borderTop: settings.borderStyle === "double" ? `6px double ${preset.primary}` : settings.borderStyle === "solid" ? `4px solid ${preset.primary}` : undefined }}><div className="flex items-start justify-between border-b pb-5" style={{ borderColor: settings.accentColor }}><div>{settings.showLogo && <div className="mb-2 flex h-9 w-24 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-400">LOGO</div>}<p className="text-xl font-bold" style={{ color: settings.primaryColor }}>Vins Tour Travel</p>{settings.showCompanyAddress && <p className="text-xs text-slate-500">Alamat kantor · Jakarta</p>}</div><div className="text-right"><p className="text-2xl font-bold" style={{ color: settings.primaryColor }}>INVOICE</p><p className="text-xs text-slate-500">INV/2026/0001</p><span className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-[10px] text-amber-800">Menunggu Pembayaran</span></div></div><div className="grid grid-cols-2 gap-5 py-5 text-sm"><div><p className="text-[10px] uppercase text-slate-400">Ditagihkan kepada</p><p className="font-semibold">Nama Jemaah</p>{settings.showCustomerPhone && <p className="text-xs text-slate-500">+62 812 0000 0000</p>}</div><div><p className="text-[10px] uppercase text-slate-400">Detail perjalanan</p><p className="font-semibold">Paket Umroh Reguler</p><p className="text-xs text-slate-500">Keberangkatan · 20 Oktober 2026</p></div></div>{settings.showRoomBreakdown && <PreviewSection title="Rincian Kamar" color={settings.primaryColor} />} {settings.showPilgrims && <PreviewSection title="Daftar Jemaah" color={settings.primaryColor} />} {(settings.showPaymentPolicy || settings.showPaymentSchedule) && <PreviewSection title="Aturan Pembayaran & Jadwal Cicilan" color={settings.primaryColor} />} {settings.showPaymentHistory && <PreviewSection title="Riwayat Pembayaran" color={settings.primaryColor} />}<div className="mt-8 flex items-end justify-between border-t pt-4"><p className="max-w-sm text-xs text-slate-400">{settings.footerText}</p>{settings.showQr && <div className="flex h-16 w-16 items-center justify-center bg-slate-900 text-[9px] text-white">QR</div>}</div></div></div>
    </div>
  </div></div>;
}

function PreviewSection({ title, color }: { title: string; color: string }) { return <div className="my-4 border-t pt-4"><p className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color }}>{title}</p><div className="space-y-2"><div className="h-2 w-full rounded bg-slate-100" /><div className="h-2 w-4/5 rounded bg-slate-100" /></div></div>; }
