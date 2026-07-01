import { useEffect, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import * as OTPAuth from "otpauth";
import { useAuth } from "@/shared/hooks/useAuth";
import { useAuthSettings } from "@/features/admin/hooks/useAuthSettings";
import { supabase } from "@/shared/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useToast } from "@/shared/hooks/use-toast";
import { ShieldAlert, ShieldCheck } from "lucide-react";

const ISSUER = "Umroh Gateway";

const sessionKey = (uid: string) => `admin_2fa_verified_${uid}`;

const AdminRoute = () => {
  const { user, isAdmin, loading } = useAuth();
  const { settings, loading: settingsLoading } = useAuthSettings();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [verified, setVerified] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!user || !isAdmin) {
        setChecking(false);
        return;
      }
      // Already verified in this session?
      if (sessionStorage.getItem(sessionKey(user.id)) === "1") {
        setVerified(true);
        setChecking(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("totp_enabled, totp_secret, totp_backup_codes")
        .eq("id", user.id)
        .maybeSingle();
      setTotpEnabled(!!data?.totp_enabled);
      setTotpSecret((data?.totp_secret as string | null) ?? null);
      setBackupCodes((data?.totp_backup_codes as string[] | null) ?? null);
      setChecking(false);
    };
    run();
  }, [user, isAdmin]);

  const verifyCode = async () => {
    if (!user || !totpSecret) return;
    setSubmitting(true);
    try {
      const trimmed = code.trim().toUpperCase();
      // Try TOTP
      let ok = false;
      try {
        const totp = new OTPAuth.TOTP({
          issuer: ISSUER,
          label: user.email ?? user.id,
          secret: OTPAuth.Secret.fromBase32(totpSecret),
        });
        ok = totp.validate({ token: code.trim(), window: 1 }) !== null;
      } catch {
        ok = false;
      }
      // Or backup code (single-use)
      if (!ok && backupCodes?.includes(trimmed)) {
        ok = true;
        const remaining = backupCodes.filter((c) => c !== trimmed);
        await supabase
          .from("profiles")
          .update({ totp_backup_codes: remaining })
          .eq("id", user.id);
      }
      if (!ok) {
        toast({ title: "Kode salah", description: "Periksa authenticator atau gunakan kode cadangan.", variant: "destructive" });
        return;
      }
      sessionStorage.setItem(sessionKey(user.id), "1");
      setVerified(true);
      toast({ title: "Verifikasi berhasil", description: "Selamat datang kembali, admin." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || settingsLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  // 2FA enforcement
  if (settings.enable_2fa && settings.require_2fa) {
    if (!totpEnabled) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="text-destructive" /> 2FA Wajib Diaktifkan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Administrator wajib mengaktifkan Two-Factor Authentication sebelum mengakses panel admin.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => navigate("/account/2fa")}>Aktifkan 2FA Sekarang</Button>
                <Button variant="outline" onClick={() => supabase.auth.signOut().then(() => navigate("/auth"))}>
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (!verified) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="text-primary" /> Verifikasi 2FA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Masukkan kode 6 digit dari authenticator Anda untuk melanjutkan ke panel admin.
              </p>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456 atau kode cadangan"
                maxLength={11}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") verifyCode();
                }}
              />
              <div className="flex gap-2">
                <Button onClick={verifyCode} disabled={submitting || code.length < 6}>
                  {submitting ? "Memverifikasi…" : "Verifikasi"}
                </Button>
                <Button variant="outline" onClick={() => supabase.auth.signOut().then(() => navigate("/auth"))}>
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <Outlet />;
};

export default AdminRoute;
