import { useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2, Save } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { useToast } from "@/shared/hooks/use-toast";
import { DEFAULT_HOSTING_NOTICE, useHostingNotice, useSaveHostingNotice, type HostingNotice } from "@/features/admin/hooks/useHostingNotice";

export default function HostingNoticeSettings() {
  const { data, isLoading, isError, error } = useHostingNotice();
  const saveNotice = useSaveHostingNotice();
  const { toast } = useToast();
  const [form, setForm] = useState<HostingNotice>(DEFAULT_HOSTING_NOTICE);

  useEffect(() => {
    if (data) setForm({ ...DEFAULT_HOSTING_NOTICE, ...data });
  }, [data]);

  const setField = <K extends keyof HostingNotice>(key: K, value: HostingNotice[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async (nextForm: HostingNotice = form) => {
    const contactUrl = nextForm.contactUrl.trim();
    if (contactUrl) {
      try {
        const parsed = new URL(contactUrl);
        if (!["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) throw new Error("Unsupported URL protocol");
      } catch {
        toast({ title: "Tautan tidak valid", description: "Gunakan https://, mailto:, atau tel:.", variant: "destructive" });
        return;
      }
    }
    try {
      const normalized = {
        ...nextForm,
        title: nextForm.title.trim() || DEFAULT_HOSTING_NOTICE.title,
        message: nextForm.message.trim() || DEFAULT_HOSTING_NOTICE.message,
        contactLabel: nextForm.contactLabel.trim() || DEFAULT_HOSTING_NOTICE.contactLabel,
        contactUrl,
      };
      const result = await saveNotice.mutateAsync(normalized);
      setForm({ ...DEFAULT_HOSTING_NOTICE, ...result.notice });
      toast({ title: normalized.active ? "Mode pemberitahuan aktif" : "Pengaturan website tersimpan", description: normalized.active ? "Pengunjung akan melihat halaman pemberitahuan." : "Website kembali tampil normal." });
    } catch (saveError) {
      toast({ title: "Gagal menyimpan", description: saveError instanceof Error ? saveError.message : "Periksa koneksi dan coba lagi.", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div>
        <p className="text-sm text-muted-foreground">Pengaturan Super Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Status Website</h1>
        <p className="mt-2 text-muted-foreground">Atur apakah pengunjung melihat website normal atau halaman pemberitahuan perpanjangan hosting.</p>
      </div>

      {isError && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Pengaturan belum dapat dimuat. Coba muat ulang halaman. {error instanceof Error ? error.message : ""}</div>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> Mode pemberitahuan</CardTitle>
          <CardDescription>Jika aktif, halaman publik diganti dengan pemberitahuan. Rute admin dan login tetap dapat diakses.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div>
            <Label htmlFor="hosting-notice-active" className="font-semibold">{form.active ? "Pemberitahuan aktif" : "Website tampil normal"}</Label>
            <p className="mt-1 text-sm text-muted-foreground">Perubahan status disimpan ke server.</p>
          </div>
          <Switch id="hosting-notice-active" checked={form.active} disabled={saveNotice.isPending || isError} onCheckedChange={(checked) => {
            const next = { ...form, active: checked };
            setForm(next);
            void save(next);
          }} aria-label="Aktifkan pemberitahuan website" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Konten pemberitahuan</CardTitle>
          <CardDescription>Pesan ini ditampilkan kepada pengunjung saat mode diaktifkan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2"><Label htmlFor="notice-title">Judul</Label><Input id="notice-title" value={form.title} maxLength={120} onChange={(event) => setField("title", event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="notice-message">Pesan</Label><Textarea id="notice-message" value={form.message} rows={4} maxLength={1000} onChange={(event) => setField("message", event.target.value)} /></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="contact-label">Teks tombol</Label><Input id="contact-label" value={form.contactLabel} maxLength={60} onChange={(event) => setField("contactLabel", event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="contact-url">Tautan developer</Label><Input id="contact-url" type="url" inputMode="url" placeholder="https://wa.me/62..." value={form.contactUrl} onChange={(event) => setField("contactUrl", event.target.value)} /></div>
          </div>
          <p className="text-sm text-muted-foreground">Isi tautan WhatsApp, email (mailto:), atau telepon (tel:) agar tombol kontak dapat digunakan.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void save()} disabled={saveNotice.isPending || isError}>
              {saveNotice.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Simpan pengaturan
            </Button>
            {form.contactUrl.trim() && <Button variant="outline" asChild><a href={form.contactUrl} target="_blank" rel="noopener noreferrer">Tes tautan<ExternalLink className="ml-2 h-4 w-4" /></a></Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
