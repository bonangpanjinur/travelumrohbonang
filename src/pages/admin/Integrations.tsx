import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, KeyRound, Mail, MessageSquare, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";

type Provider = "resend" | "fonnte" | "wablas";

interface SecretRow {
  id?: string;
  provider: Provider;
  config: Record<string, string>;
  is_active: boolean;
}

const SCHEMA: Record<Provider, { label: string; icon: any; fields: { key: string; label: string; type?: string; placeholder?: string }[]; help: string }> = {
  resend: {
    label: "Resend (Email)",
    icon: Mail,
    fields: [
      { key: "api_key", label: "API Key", placeholder: "re_xxx", type: "password" },
      { key: "from_email", label: "From Email", placeholder: "noreply@domain.com" },
      { key: "from_name", label: "From Name", placeholder: "Umroh Gateway" },
    ],
    help: "Dapatkan API key di resend.com → API Keys. Domain pengirim harus sudah diverifikasi.",
  },
  fonnte: {
    label: "Fonnte (WhatsApp)",
    icon: MessageSquare,
    fields: [
      { key: "api_key", label: "Token Device", type: "password", placeholder: "Token dari Fonnte" },
      { key: "device", label: "Nama Device (opsional)", placeholder: "Default" },
    ],
    help: "Daftar device di fonnte.com, salin token-nya.",
  },
  wablas: {
    label: "Wablas (WhatsApp)",
    icon: MessageSquare,
    fields: [
      { key: "api_key", label: "API Key", type: "password" },
      { key: "endpoint", label: "Endpoint Server", placeholder: "https://solo.wablas.com" },
    ],
    help: "Endpoint tergantung server Anda di Wablas.",
  },
};

const Integrations = () => {
  const { role } = useAuth();
  const isSuper = role === "super_admin";
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Record<Provider, SecretRow>>({} as any);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Provider | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("integration_secrets")
      .select("id, provider, config, is_active");
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const map: any = {};
    (Object.keys(SCHEMA) as Provider[]).forEach((p) => {
      const existing = (data || []).find((d: any) => d.provider === p);
      map[p] = existing
        ? { id: existing.id, provider: p, config: existing.config || {}, is_active: existing.is_active }
        : { provider: p, config: {}, is_active: false };
    });
    setRows(map);
    setLoading(false);
  };

  useEffect(() => {
    if (isSuper) load();
    else setLoading(false);
  }, [isSuper]);

  const save = async (p: Provider) => {
    const row = rows[p];
    setSaving(p);
    const payload = { provider: p, config: row.config, is_active: row.is_active };
    const { error } = row.id
      ? await supabase.from("integration_secrets").update(payload).eq("id", row.id)
      : await supabase.from("integration_secrets").insert(payload);
    setSaving(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${SCHEMA[p].label} disimpan`);
    load();
  };

  const updateField = (p: Provider, key: string, value: string) => {
    setRows((r) => ({ ...r, [p]: { ...r[p], config: { ...r[p].config, [key]: value } } }));
  };

  const toggleActive = (p: Provider, value: boolean) => {
    setRows((r) => ({ ...r, [p]: { ...r[p], is_active: value } }));
  };

  if (!isSuper) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Hanya <strong>super admin</strong> yang dapat mengelola API key integrasi.
        </CardContent>
      </Card>
    );
  }

  if (loading) return <Loader2 className="w-6 h-6 animate-spin" />;

  return (
    <>
      <SEO title="Integrasi API • Admin" description="Kelola API key Resend, Fonnte, Wablas" noIndex />
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Integrasi & API Keys</h1>
            <p className="text-sm text-muted-foreground">Kelola kredensial provider email & WhatsApp. Disimpan terenkripsi di backend.</p>
          </div>
        </div>

        {(Object.keys(SCHEMA) as Provider[]).map((p) => {
          const cfg = SCHEMA[p];
          const Icon = cfg.icon;
          const row = rows[p];
          if (!row) return null;
          return (
            <Card key={p}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">{cfg.label}</CardTitle>
                      <CardDescription className="text-xs">{cfg.help}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${p}`} className="text-xs">Aktif</Label>
                    <Switch id={`active-${p}`} checked={row.is_active} onCheckedChange={(v) => toggleActive(p, v)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {cfg.fields.map((f) => {
                  const isSecret = f.type === "password";
                  const fieldKey = `${p}-${f.key}`;
                  return (
                    <div key={f.key} className="space-y-1">
                      <Label htmlFor={fieldKey} className="text-xs">{f.label}</Label>
                      <div className="flex gap-2">
                        <Input
                          id={fieldKey}
                          type={isSecret && !reveal[fieldKey] ? "password" : "text"}
                          value={row.config?.[f.key] || ""}
                          onChange={(e) => updateField(p, f.key, e.target.value)}
                          placeholder={f.placeholder}
                          autoComplete="off"
                        />
                        {isSecret && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setReveal((r) => ({ ...r, [fieldKey]: !r[fieldKey] }))}
                          >
                            {reveal[fieldKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-end">
                  <Button onClick={() => save(p)} disabled={saving === p}>
                    {saving === p && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Simpan
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
};

export default Integrations;
