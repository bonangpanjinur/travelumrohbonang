import { useEffect, useState } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import { useAuth } from "@/shared/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/shared/components/SEO";

interface LoginSettingsValue {
  enable_2fa: boolean;
  require_2fa: boolean;
}

const DEFAULTS: LoginSettingsValue = { enable_2fa: false, require_2fa: false };

const LoginSettings = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState<LoginSettingsValue>(DEFAULTS);

  const load = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("category", "auth")
      .eq("key", "settings")
      .maybeSingle();
    setValue({ ...DEFAULTS, ...((data?.value as any) || {}) });
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ category: "auth", key: "settings", value: value as any }, { onConflict: "category,key" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pengaturan login disimpan");
  };

  if (!isAdmin) return null;
  if (loading) return <Loader2 className="w-6 h-6 animate-spin" />;

  return (
    <>
      <SEO title="Pengaturan Login • Admin" description="Pengaturan keamanan login termasuk 2FA" noIndex />
      <div className="space-y-4 max-w-2xl">
        <div className="flex items-center gap-2">
          <Lock className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Pengaturan Login</h1>
            <p className="text-sm text-muted-foreground">Kontrol fitur keamanan akun pengguna.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Two-Factor Authentication (TOTP)</CardTitle>
            <CardDescription>Pengguna dapat menambahkan kode verifikasi 6-digit saat login.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm">Aktifkan 2FA</Label>
                <p className="text-xs text-muted-foreground">Bila nonaktif, halaman enrollment 2FA disembunyikan dari pengguna.</p>
              </div>
              <Switch
                checked={value.enable_2fa}
                onCheckedChange={(v) => setValue((s) => ({ ...s, enable_2fa: v, require_2fa: v ? s.require_2fa : false }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3 opacity-100">
              <div>
                <Label className="text-sm">Wajibkan 2FA untuk admin</Label>
                <p className="text-xs text-muted-foreground">Admin yang belum enroll akan diminta mengaktifkan 2FA setelah login.</p>
              </div>
              <Switch
                disabled={!value.enable_2fa}
                checked={value.require_2fa}
                onCheckedChange={(v) => setValue((s) => ({ ...s, require_2fa: v }))}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default LoginSettings;
