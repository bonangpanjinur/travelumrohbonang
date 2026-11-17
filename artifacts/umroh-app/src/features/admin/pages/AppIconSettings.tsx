import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Image as ImageIcon, Loader2, RotateCcw, Save, Smartphone, Upload } from "lucide-react";
import { apiFetch } from "@/shared/lib/apiClient";
import { supabase } from "@/shared/integrations/supabase/client";
import { useToast } from "@/shared/hooks/use-toast";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

type AppIconSettings = { logo_url: string; favicon_url: string };
type SettingsResponse = { data?: Partial<AppIconSettings> };
type IconMode = "logo" | "custom";

const emptySettings: AppIconSettings = { logo_url: "", favicon_url: "" };
const ICON_SIZE = 512;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function makeSquarePng(source: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(source);
    const image = new Image();

    image.onload = () => {
      try {
        if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth > 12000 || image.naturalHeight > 12000) {
          throw new Error("Ukuran gambar tidak valid atau terlalu besar untuk dijadikan ikon.");
        }
        const canvas = document.createElement("canvas");
        canvas.width = ICON_SIZE;
        canvas.height = ICON_SIZE;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Browser tidak dapat memproses gambar ini.");

        // Contain (rather than crop) the source so the logo remains recognizable.
        const scale = Math.min(ICON_SIZE / image.naturalWidth, ICON_SIZE / image.naturalHeight);
        const width = Math.round(image.naturalWidth * scale);
        const height = Math.round(image.naturalHeight * scale);
        const x = Math.round((ICON_SIZE - width) / 2);
        const y = Math.round((ICON_SIZE - height) / 2);
        context.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
        context.drawImage(image, x, y, width, height);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Gambar tidak dapat dikonversi menjadi PNG."));
            return;
          }
          resolve(new File([blob], `app-icon-${Date.now()}.png`, { type: "image/png" }));
        }, "image/png");
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("File tidak dapat dibaca sebagai gambar."));
    };
    image.src = objectUrl;
  });
}

export default function AppIconSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppIconSettings>(emptySettings);
  const [mode, setMode] = useState<IconMode>("logo");
  const [customUrl, setCustomUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch<SettingsResponse>("/api/admin/app-icon")
      .then((response) => {
        if (!active) return;
        const next = { ...emptySettings, ...(response?.data ?? {}) };
        setSettings(next);
        setCustomUrl(next.favicon_url);
        setMode(next.favicon_url.trim() ? "custom" : "logo");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Pengaturan ikon tidak dapat dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const effectiveIconUrl = useMemo(
    () => (mode === "logo" ? settings.logo_url.trim() : customUrl.trim()),
    [mode, settings.logo_url, customUrl],
  );

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const source = event.target.files?.[0];
    event.target.value = "";
    if (!source) return;
    if (!source.type.startsWith("image/")) {
      toast({ title: "Format file tidak didukung", description: "Pilih file gambar seperti PNG, JPG, WEBP, atau SVG.", variant: "destructive" });
      return;
    }
    if (source.size > MAX_UPLOAD_BYTES) {
      toast({ title: "File terlalu besar", description: "Ukuran sumber maksimal 10 MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const png = await makeSquarePng(source);
      const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const objectPath = `settings/app-icon-${suffix}.png`;
      const { error } = await supabase.storage.from("cms-images").upload(objectPath, png, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("cms-images").getPublicUrl(objectPath);
      setCustomUrl(data.publicUrl);
      setMode("custom");
      setPreviewError(false);
      toast({ title: "Ikon siap", description: "PNG persegi 512×512 telah diunggah. Simpan pengaturan untuk menerapkannya." });
    } catch (error) {
      toast({ title: "Gagal mengunggah ikon", description: error instanceof Error ? error.message : "Periksa koneksi dan coba lagi.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const value = mode === "logo" ? "" : customUrl.trim();
    if (mode === "custom" && !value) {
      toast({ title: "Ikon khusus belum dipilih", description: "Unggah ikon atau masukkan URL gambar terlebih dahulu.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const response = await apiFetch<SettingsResponse>("/api/admin/app-icon", {
        method: "PUT",
        body: JSON.stringify({ favicon_url: value }),
      });
      const next = { ...settings, ...(response?.data ?? {}), favicon_url: value };
      setSettings(next);
      setCustomUrl(next.favicon_url);
      setPreviewError(false);
      window.dispatchEvent(new Event("site-branding-updated"));
      toast({ title: "Ikon aplikasi disimpan", description: mode === "logo" ? "Favicon sekarang mengikuti logo utama." : "Favicon khusus telah diterapkan." });
    } catch (error) {
      toast({ title: "Gagal menyimpan ikon", description: error instanceof Error ? error.message : "Periksa koneksi dan coba lagi.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div>
        <p className="text-sm text-muted-foreground">Pengaturan Super Admin</p>
        <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight"><Smartphone className="h-7 w-7" /> Favicon & App Icon</h1>
        <p className="mt-2 text-muted-foreground">Atur ikon tetap yang tampil pada tab browser dan sebagai ikon aplikasi. Ikon dibaca dari pengaturan branding database, bukan dari ikon blog bawaan.</p>
      </div>

      {loadError && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Pengaturan belum dapat dimuat. Pastikan Anda masuk sebagai super admin, lalu muat ulang halaman. {loadError}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Sumber ikon</CardTitle>
          <CardDescription>Pilih logo utama agar favicon otomatis berubah saat logo perusahaan diperbarui, atau tentukan ikon kecil khusus.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${mode === "logo" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
            <input type="radio" name="app-icon-mode" className="mt-1 accent-primary" checked={mode === "logo"} onChange={() => { setMode("logo"); setPreviewError(false); }} />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Ikuti logo utama</span>
              <span className="mt-1 block text-sm text-muted-foreground">Tidak menyimpan file favicon terpisah. Ikon selalu mengambil logo terbaru dari Branding.</span>
              {settings.logo_url ? <img src={settings.logo_url} alt="Logo perusahaan saat ini" className="mt-3 h-14 max-w-48 object-contain" /> : <span className="mt-3 block text-sm text-amber-700">Logo utama belum diatur. Unggah logo melalui Pengaturan Umum → Branding, atau gunakan ikon khusus.</span>}
            </span>
          </label>

          <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${mode === "custom" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
            <input type="radio" name="app-icon-mode" className="mt-1 accent-primary" checked={mode === "custom"} onChange={() => { setMode("custom"); setPreviewError(false); }} />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Gunakan ikon khusus</span>
              <span className="mt-1 block text-sm text-muted-foreground">Unggah ulang logo/ikon atau gunakan URL gambar. Gambar yang diunggah dirapikan menjadi PNG persegi 512×512 tanpa memotong logo.</span>
            </span>
          </label>

          {mode === "custom" && (
            <div className="space-y-3 rounded-xl border p-4">
              <div className="space-y-2">
                <Label htmlFor="app-icon-url">URL ikon</Label>
                <Input id="app-icon-url" type="url" inputMode="url" placeholder="https://.../app-icon.png" value={customUrl} onChange={(event) => { setCustomUrl(event.target.value); setPreviewError(false); }} />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" disabled={uploading} asChild>
                  <label className="cursor-pointer">
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {uploading ? "Memproses gambar…" : "Unggah / sesuaikan logo"}
                    <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={handleUpload} />
                  </label>
                </Button>
                <span className="text-xs text-muted-foreground">PNG, JPG, WEBP, SVG · sumber maksimal 10 MB</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Pratinjau</CardTitle>
          <CardDescription>Pratinjau menggunakan sumber yang akan disimpan. Perubahan pada browser aktif akan diterapkan setelah penyimpanan.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Tab browser</Label>
            <div className="flex min-h-16 max-w-sm items-center gap-2 rounded-t-lg border bg-background px-4 py-3 shadow-sm">
              {effectiveIconUrl && !previewError ? <img src={effectiveIconUrl} alt="Pratinjau favicon tab browser" className="h-5 w-5 shrink-0 object-contain" onError={() => setPreviewError(true)} /> : <span className="h-5 w-5 shrink-0 rounded bg-muted" aria-label="Ikon belum tersedia" />}
              <span className="truncate text-sm">Travel Umroh Bonang</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Ikon aplikasi</Label>
            <div className="flex min-h-28 items-center gap-4 rounded-xl border bg-muted/30 p-4">
              {effectiveIconUrl && !previewError ? <img src={effectiveIconUrl} alt="Pratinjau app icon" className="h-20 w-20 rounded-2xl border bg-background p-2 object-contain shadow-sm" onError={() => setPreviewError(true)} /> : <span className="h-20 w-20 rounded-2xl border bg-background" aria-label="Ikon belum tersedia" />}
              <span className="text-sm text-muted-foreground">Ikon tetap · tanpa drag/move</span>
            </div>
          </div>
          {previewError && <p role="alert" className="text-sm text-destructive sm:col-span-2">Gambar tidak dapat dimuat. Periksa URL atau unggah file ikon yang valid.</p>}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void save()} disabled={saving || uploading || Boolean(loadError) || previewError || (mode === "custom" && !customUrl.trim()) || (mode === "logo" && !settings.logo_url.trim())}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {saving ? "Menyimpan…" : "Simpan ikon"}
        </Button>
        <Button type="button" variant="outline" disabled={saving || uploading} onClick={() => { setCustomUrl(settings.favicon_url); setMode(settings.favicon_url.trim() ? "custom" : "logo"); setPreviewError(false); }}>
          <RotateCcw className="mr-2 h-4 w-4" /> Batalkan perubahan
        </Button>
        <span className="text-xs text-muted-foreground">Tautan ikon publik tetap dinamis; logo sumber tidak akan ditimpa.</span>
      </div>
    </div>
  );
}
