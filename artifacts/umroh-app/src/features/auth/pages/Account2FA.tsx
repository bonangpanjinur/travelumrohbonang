import { useEffect, useState } from "react";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { useAuth } from "@/shared/hooks/useAuth";
import { supabase } from "@/shared/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/shared/hooks/use-toast";
import SEO from "@/shared/components/SEO";
import { ShieldCheck, ShieldOff, Lock } from "lucide-react";
import { useAuthSettings } from "@/admin/hooks/useAuthSettings";
import { Link } from "react-router-dom";

const ISSUER = "Umroh Gateway";

const Account2FA = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings: authSettings, loading: settingsLoading } = useAuthSettings();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [secret, setSecret] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("totp_enabled")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setEnabled(!!data?.totp_enabled);
        setLoading(false);
      });
  }, [user]);

  const startEnroll = async () => {
    if (!user) return;
    const newSecret = new OTPAuth.Secret({ size: 20 }).base32;
    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      label: user.email ?? user.id,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(newSecret),
    });
    const otpauthUrl = totp.toString();
    const qr = await QRCode.toDataURL(otpauthUrl, { width: 240, margin: 1 });
    setSecret(newSecret);
    setQrDataUrl(qr);
  };

  const confirmEnroll = async () => {
    if (!user || !secret) return;
    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      label: user.email ?? user.id,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    const delta = totp.validate({ token: code.trim(), window: 1 });
    if (delta === null) {
      toast({ title: "Kode salah", description: "Coba lagi dengan kode dari authenticator.", variant: "destructive" });
      return;
    }

    const codes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
    );

    const { error } = await supabase
      .from("profiles")
      .update({ totp_secret: secret, totp_enabled: true, totp_backup_codes: codes })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
      return;
    }

    setEnabled(true);
    setBackupCodes(codes);
    setSecret(null);
    setQrDataUrl(null);
    setCode("");
    toast({ title: "2FA aktif", description: "Simpan kode cadangan di tempat aman." });
  };

  const disable2FA = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ totp_secret: null, totp_enabled: false, totp_backup_codes: null })
      .eq("id", user.id);
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
      return;
    }
    setEnabled(false);
    setBackupCodes(null);
    toast({ title: "2FA dinonaktifkan" });
  };

  return (
    <>
      <SEO title="Keamanan Akun • 2FA" description="Aktifkan autentikasi dua faktor (TOTP) untuk akun Anda." noIndex />
      <div className="container max-w-2xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-display font-bold mb-6 flex items-center gap-2">
          {enabled ? <ShieldCheck className="text-success" /> : <ShieldOff className="text-muted-foreground" />}
          Two-Factor Authentication
        </h1>

        {loading || settingsLoading ? (
          <p>Memuat…</p>
        ) : !authSettings.enable_2fa && !enabled ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> 2FA Sedang Dinonaktifkan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Fitur Two-Factor Authentication sedang dinonaktifkan oleh administrator. Silakan hubungi admin untuk mengaktifkannya.
              </p>
              <Button asChild variant="outline"><Link to="/dashboard">Kembali ke Dashboard</Link></Button>
            </CardContent>
          </Card>
        ) : enabled ? (
          <Card>
            <CardHeader><CardTitle>2FA Aktif</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Akun Anda dilindungi dengan TOTP. Untuk login Anda akan butuh kode dari authenticator.
              </p>
              {backupCodes && (
                <div className="rounded-md border p-3 bg-muted/40">
                  <p className="text-sm font-medium mb-2">Kode cadangan (simpan sekarang):</p>
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {backupCodes.map((c) => <span key={c}>{c}</span>)}
                  </div>
                </div>
              )}
              <Button variant="destructive" onClick={disable2FA}>Nonaktifkan 2FA</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle>Aktifkan 2FA</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {!secret ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Gunakan Google Authenticator, Authy, atau aplikasi TOTP lain. Klik mulai untuk dapat QR code.
                  </p>
                  <Button onClick={startEnroll}>Mulai Enroll</Button>
                </>
              ) : (
                <>
                  <p className="text-sm">1. Scan QR code dengan aplikasi authenticator:</p>
                  {qrDataUrl && <img src={qrDataUrl} alt="2FA QR" className="border rounded-md" />}
                  <p className="text-xs text-muted-foreground">Atau masukkan manual: <span className="font-mono">{secret}</span></p>
                  <p className="text-sm">2. Masukkan kode 6 digit yang muncul:</p>
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" maxLength={6} />
                  <div className="flex gap-2">
                    <Button onClick={confirmEnroll} disabled={code.length !== 6}>Konfirmasi</Button>
                    <Button variant="outline" onClick={() => { setSecret(null); setQrDataUrl(null); }}>Batal</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default Account2FA;
