import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowLeft, ShieldCheck } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import SEO from "@/shared/components/SEO";
import TurnstileCaptcha from "@/shared/components/TurnstileCaptcha";
import { rateLimit } from "@/shared/lib/rateLimit";
import { supabase } from "@/shared/integrations/supabase/client";
import * as OTPAuth from "otpauth";
import { z } from "zod";

const STAFF_ROLES = ["admin", "super_admin", "superadmin", "staff", "branch_manager", "marketing", "finance", "operations"];

const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Password tidak cocok",
  path: ["confirmPassword"],
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [twoFA, setTwoFA] = useState<{ redirect: string; code: string } | null>(null);
  const [twoFALoading, setTwoFALoading] = useState(false);

  const { signIn, signUp, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!captchaToken) {
      toast({ title: "Verifikasi captcha", description: "Selesaikan captcha terlebih dahulu.", variant: "destructive" });
      return;
    }

    const limit = await rateLimit(isLogin ? "auth:login" : "auth:signup", { max: 10, windowSec: 60 });
    if (!limit.allowed) {
      toast({ title: "Terlalu banyak percobaan", description: "Coba lagi dalam 1 menit.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const validation = loginSchema.safeParse({ email, password });
        if (!validation.success) {
          const fieldErrors: Record<string, string> = {};
          validation.error.errors.forEach((err) => {
            if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error, isAdmin } = await signIn(email, password);
        if (error) {
          toast({
            title: "Gagal masuk",
            description: error.message === "Invalid login credentials" 
              ? "Email atau password salah" 
              : error.message,
            variant: "destructive",
          });
        } else {
          const redirect = isAdmin ? "/admin" : "/dashboard";

          // Check 2FA requirement
          const { data: authData } = await supabase.auth.getUser();
          const uid = authData.user?.id;
          let needs2FA = false;
          if (uid) {
            const [{ data: prof }, { data: roleRow }] = await Promise.all([
              supabase.from("profiles").select("totp_enabled").eq("id", uid).maybeSingle(),
              supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
            ]);
            const isStaff = STAFF_ROLES.includes(roleRow?.role ?? "");
            if (prof?.totp_enabled) needs2FA = true;
            else if (isStaff) {
              // Staff without 2FA → force enroll first
              toast({ title: "2FA wajib", description: "Aktifkan 2FA di Account untuk melanjutkan." });
              navigate("/account/2fa");
              return;
            }
          }

          if (needs2FA) {
            setTwoFA({ redirect, code: "" });
          } else {
            toast({ title: "Berhasil masuk!", description: "Selamat datang kembali" });
            navigate(redirect);
          }
        }
      } else {
        const validation = registerSchema.safeParse({ email, password, name, confirmPassword });
        if (!validation.success) {
          const fieldErrors: Record<string, string> = {};
          validation.error.errors.forEach((err) => {
            if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, name);
        if (error) {
          const message = error.message.includes("already registered")
            ? "Email sudah terdaftar"
            : error.message;
          toast({ title: "Gagal daftar", description: message, variant: "destructive" });
        } else {
          toast({
            title: "Pendaftaran berhasil!",
            description: "Silakan cek email untuk verifikasi",
          });
          setIsLogin(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyTwoFA = async () => {
    if (!twoFA) return;
    const codeRaw = twoFA.code.trim().toUpperCase();
    if (!codeRaw) return;
    setTwoFALoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
      if (!uid) throw new Error("Sesi tidak valid");

      const { data: prof } = await supabase
        .from("profiles")
        .select("totp_secret, totp_backup_codes")
        .eq("id", uid)
        .maybeSingle();

      if (!prof?.totp_secret) throw new Error("Konfigurasi 2FA tidak ditemukan");

      let ok = false;
      // Try TOTP first (6-digit numeric)
      if (/^\d{6}$/.test(codeRaw)) {
        const totp = new OTPAuth.TOTP({
          secret: OTPAuth.Secret.fromBase32(prof.totp_secret),
          algorithm: "SHA1",
          digits: 6,
          period: 30,
        });
        ok = totp.validate({ token: codeRaw, window: 1 }) !== null;
      }

      // Fallback: backup code
      if (!ok && Array.isArray(prof.totp_backup_codes) && prof.totp_backup_codes.includes(codeRaw)) {
        const remaining = (prof.totp_backup_codes as string[]).filter((c) => c !== codeRaw);
        await supabase.from("profiles").update({ totp_backup_codes: remaining }).eq("id", uid);
        ok = true;
      }

      if (!ok) {
        toast({ title: "Kode 2FA salah", description: "Periksa kembali kode dari authenticator.", variant: "destructive" });
        return;
      }

      toast({ title: "Berhasil masuk!", description: "Verifikasi 2FA sukses." });
      const target = twoFA.redirect;
      setTwoFA(null);
      navigate(target);
    } catch (err) {
      toast({ title: "Gagal verifikasi", description: (err as Error).message, variant: "destructive" });
    } finally {
      setTwoFALoading(false);
    }
  };

  const cancelTwoFA = async () => {
    setTwoFA(null);
    await signOut();
  };

  return (
    <>
      <SEO title={isLogin ? "Masuk" : "Daftar Akun"} description="Login atau daftar akun untuk mengelola booking umroh Anda." noIndex />
    <div className="min-h-screen flex items-center justify-center bg-background islamic-pattern px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Beranda
          </Link>

          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto rounded-full gradient-gold flex items-center justify-center mb-4">
              {twoFA ? <ShieldCheck className="w-7 h-7 text-primary" /> : <span className="font-display font-bold text-2xl text-primary">U</span>}
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {twoFA ? "Verifikasi 2FA" : isLogin ? "Masuk ke Akun" : "Daftar Akun Baru"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {twoFA
                ? "Masukkan 6 digit kode dari authenticator atau kode cadangan."
                : isLogin ? "Masukkan email dan password Anda" : "Buat akun untuk melanjutkan"}
            </p>
          </div>

          {twoFA ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="totp">Kode 2FA</Label>
                <Input
                  id="totp"
                  inputMode="text"
                  autoFocus
                  value={twoFA.code}
                  onChange={(e) => setTwoFA({ ...twoFA, code: e.target.value })}
                  placeholder="123456 atau XXXX-XXXX"
                  className="mt-1 tracking-widest font-mono"
                  onKeyDown={(e) => { if (e.key === "Enter") verifyTwoFA(); }}
                />
              </div>
              <Button onClick={verifyTwoFA} disabled={twoFALoading || !twoFA.code} className="w-full gradient-gold text-primary font-semibold">
                {twoFALoading ? "Memverifikasi..." : "Verifikasi & Masuk"}
              </Button>
              <Button variant="outline" onClick={cancelTwoFA} className="w-full">Batal</Button>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Anda"
                  className="mt-1"
                />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>
            )}

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="mt-1"
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
              {isLogin && (
                <div className="text-right">
                  <Link to="/forgot-password" className="text-xs text-accent hover:underline">
                    Lupa kata sandi?
                  </Link>
                </div>
              )}
            </div>

            {!isLogin && (
              <div>
                <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1"
                />
                {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
              </div>
            )}

            <TurnstileCaptcha onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />

            <Button
              type="submit"
              className="w-full gradient-gold text-primary font-semibold"
              disabled={loading || !captchaToken}
            >
              {loading ? "Memproses..." : isLogin ? "Masuk" : "Daftar"}
            </Button>
          </form>
          )}

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
            </span>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="text-accent font-semibold hover:underline"
            >
              {isLogin ? "Daftar Sekarang" : "Masuk"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
    </>
  );
};

export default Auth;
