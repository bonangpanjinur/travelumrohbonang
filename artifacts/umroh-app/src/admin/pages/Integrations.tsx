import { useEffect, useState } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import { useAuth } from "@/shared/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, KeyRound, Mail, MessageSquare, Eye, EyeOff, Send } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/shared/components/SEO";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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

  // Test send state
  const [testOpen, setTestOpen] = useState<Provider | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testMessage, setTestMessage] = useState("Pesan uji dari Admin Integrasi.");
  const [testSubject, setTestSubject] = useState("Tes Email dari Admin Integrasi");
  const [testSending, setTestSending] = useState(false);

  const openTest = (p: Provider) => {
    setTestOpen(p);
    setTestTo("");
  };

  const sendTest = async () => {
    if (!testOpen) return;
    const p = testOpen;
    if (!testTo.trim()) {
      toast.error(p === "resend" ? "Isi alamat email tujuan" : "Isi nomor WhatsApp tujuan");
      return;
    }
    setTestSending(true);
    try {
      if (p === "resend") {
        const { data, error } = await supabase.functions.invoke("send-email", {
          body: {
            to: testTo.trim(),
            subject: testSubject || "Tes Email",
            html: `<p>${testMessage.replace(/</g, "&lt;")}</p>`,
            text: testMessage,
          },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        toast.success("Email uji berhasil dikirim");
      } else {
        const { data, error } = await supabase.functions.invoke("send-whatsapp", {
          body: { to: testTo.trim(), message: testMessage, provider: p },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        toast.success(`WhatsApp uji berhasil dikirim via ${p}`);
      }
      setTestOpen(null);
    } catch (e: any) {
      toast.error(e?.message || "Gagal mengirim pesan uji");
    } finally {
      setTestSending(false);
    }
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
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openTest(p)}
                    disabled={!row.is_active || !row.config?.api_key}
                    title={!row.is_active ? "Aktifkan dulu" : !row.config?.api_key ? "Isi API key dulu" : "Kirim pesan uji"}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Uji Kirim
                  </Button>
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

      <Dialog open={!!testOpen} onOpenChange={(o) => !o && setTestOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Uji Kirim — {testOpen ? SCHEMA[testOpen].label : ""}
            </DialogTitle>
            <DialogDescription>
              {testOpen === "resend"
                ? "Kirim email uji ke alamat berikut menggunakan konfigurasi Resend yang aktif."
                : "Kirim pesan WhatsApp uji ke nomor berikut menggunakan provider yang dipilih."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">
                {testOpen === "resend" ? "Email Tujuan" : "Nomor WhatsApp (mis. 0812xxx)"}
              </Label>
              <Input
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder={testOpen === "resend" ? "you@example.com" : "08123456789"}
                type={testOpen === "resend" ? "email" : "tel"}
              />
            </div>
            {testOpen === "resend" && (
              <div className="space-y-1">
                <Label className="text-xs">Subjek</Label>
                <Input value={testSubject} onChange={(e) => setTestSubject(e.target.value)} />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Pesan</Label>
              <Textarea
                rows={4}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(null)} disabled={testSending}>
              Batal
            </Button>
            <Button onClick={sendTest} disabled={testSending}>
              {testSending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Send className="w-4 h-4 mr-2" />
              Kirim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Integrations;
