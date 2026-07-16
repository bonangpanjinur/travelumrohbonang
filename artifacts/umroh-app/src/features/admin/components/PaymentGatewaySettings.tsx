import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import { useAuth } from "@/shared/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Loader2, KeyRound, CreditCard, Wallet, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

type Provider = "midtrans" | "xendit";

interface SecretRow {
  id?: string;
  provider: Provider;
  config: Record<string, string>;
  isActive: boolean;
}

const SCHEMA: Record<
  Provider,
  {
    label: string;
    icon: any;
    help: string;
    fields: { key: string; label: string; type?: "password" | "text" | "select"; placeholder?: string; options?: { value: string; label: string }[] }[];
  }
> = {
  midtrans: {
    label: "Midtrans",
    icon: CreditCard,
    help: "Ambil Server Key & Client Key di dashboard.midtrans.com → Settings → Access Keys. Gunakan mode Sandbox untuk uji coba sebelum go-live.",
    fields: [
      {
        key: "mode",
        label: "Mode",
        type: "select",
        options: [
          { value: "sandbox", label: "Sandbox (Uji Coba)" },
          { value: "production", label: "Production (Live)" },
        ],
      },
      { key: "merchant_id", label: "Merchant ID", placeholder: "G123456789" },
      { key: "client_key", label: "Client Key", placeholder: "SB-Mid-client-xxx" },
      { key: "server_key", label: "Server Key", type: "password", placeholder: "SB-Mid-server-xxx" },
    ],
  },
  xendit: {
    label: "Xendit",
    icon: Wallet,
    help: "Ambil Secret Key & Callback (Webhook) Token di dashboard.xendit.co → Settings → API Keys / Webhooks. Gunakan mode Test sebelum go-live.",
    fields: [
      {
        key: "mode",
        label: "Mode",
        type: "select",
        options: [
          { value: "test", label: "Test (Uji Coba)" },
          { value: "live", label: "Live" },
        ],
      },
      { key: "secret_key", label: "Secret Key", type: "password", placeholder: "xnd_development_xxx" },
      { key: "callback_token", label: "Callback (Webhook) Token", type: "password", placeholder: "Token verifikasi webhook" },
    ],
  },
};

const emptyRow = (p: Provider): SecretRow => ({ provider: p, config: { mode: p === "midtrans" ? "sandbox" : "test" }, isActive: false });

const PaymentGatewaySettings = () => {
  const { role } = useAuth();
  const isSuper = role === "super_admin";
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Record<Provider, SecretRow>>({} as any);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Provider | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any[]>("/api/admin/integrations");
      const map: any = {};
      (Object.keys(SCHEMA) as Provider[]).forEach((p) => {
        const existing = (data || []).find((d: any) => d.provider === p);
        map[p] = existing
          ? { id: existing.id, provider: p, config: existing.config || {}, isActive: existing.isActive }
          : emptyRow(p);
      });
      setRows(map);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuper) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuper]);

  const save = async (p: Provider) => {
    const row = rows[p];
    setSaving(p);
    const payload = { provider: p, config: row.config, isActive: row.isActive };
    try {
      if (row.id) {
        await apiFetch(`/api/admin/integrations/${row.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/admin/integrations", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      toast.success(`${SCHEMA[p].label} disimpan`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  const updateField = (p: Provider, key: string, value: string) => {
    setRows((r) => ({ ...r, [p]: { ...r[p], config: { ...r[p].config, [key]: value } } }));
  };

  const toggleActive = (p: Provider, value: boolean) => {
    setRows((r) => ({ ...r, [p]: { ...r[p], isActive: value } }));
  };

  if (!isSuper) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Hanya <strong>super admin</strong> yang dapat mengelola API key payment gateway.
        </CardContent>
      </Card>
    );
  }

  if (loading) return <Loader2 className="w-6 h-6 animate-spin" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-primary" />
        <div>
          <p className="text-sm font-medium">API Key Payment Gateway</p>
          <p className="text-xs text-muted-foreground">
            Kredensial disimpan di backend (tabel <code>integration_secrets</code>) dan tidak pernah dikirim utuh ke browser — nilai yang sudah tersimpan akan tampil sebagai titik-titik.
          </p>
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
                  <Switch id={`active-${p}`} checked={row.isActive} onCheckedChange={(v) => toggleActive(p, v)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {cfg.fields.map((f) => {
                const isSecret = f.type === "password";
                const fieldKey = `${p}-${f.key}`;

                if (f.type === "select") {
                  return (
                    <div key={f.key} className="space-y-1">
                      <Label htmlFor={fieldKey} className="text-xs">{f.label}</Label>
                      <Select value={row.config?.[f.key] ?? f.options?.[0]?.value ?? ""} onValueChange={(v) => updateField(p, f.key, v)}>
                        <SelectTrigger id={fieldKey}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {f.options?.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }

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
  );
};

export default PaymentGatewaySettings;
