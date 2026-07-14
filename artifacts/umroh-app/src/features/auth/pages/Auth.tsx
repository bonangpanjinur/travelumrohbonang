import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { motion } from "framer-motion";
import { ArrowLeft, LogIn, Eye, EyeOff, UserPlus, Loader2 } from "lucide-react";
import SEO from "@/shared/components/seo/SEO";
import { supabaseAuth } from "@/shared/integrations/supabase/auth-client";
import { useToast } from "@/shared/hooks/use-toast";

type AuthMode = "login" | "signup" | "forgot";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const { error } = await supabaseAuth.auth.signInWithPassword({ email, password });
      if (error) {
        toast({
          title: "Login gagal",
          description: translateError(error.message),
          variant: "destructive",
        });
        return;
      }
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (password !== confirmPassword) {
      toast({ title: "Kata sandi tidak cocok", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Kata sandi minimal 6 karakter", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabaseAuth.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });
      if (error) {
        toast({
          title: "Pendaftaran gagal",
          description: translateError(error.message),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Akun berhasil dibuat!",
        description: "Silakan cek email Anda untuk konfirmasi, lalu masuk kembali.",
      });
      setMode("login");
      setPassword("");
      setConfirmPassword("");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });
      if (error) {
        toast({
          title: "Gagal mengirim email",
          description: translateError(error.message),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Email terkirim",
        description: "Silakan cek email Anda untuk reset kata sandi.",
      });
      setMode("login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title="Masuk" description="Login untuk mengelola booking umroh Anda." noIndex />
      <div className="min-h-screen flex items-center justify-center bg-background islamic-pattern px-4">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border rounded-2xl shadow-xl p-8">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Beranda
            </Link>

            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto rounded-full gradient-gold flex items-center justify-center mb-4">
                <span className="font-display font-bold text-2xl text-primary">U</span>
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                {mode === "login" && "Masuk ke Akun"}
                {mode === "signup" && "Buat Akun Baru"}
                {mode === "forgot" && "Lupa Kata Sandi"}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {mode === "login" && "Masuk untuk mengelola booking dan profil umroh Anda."}
                {mode === "signup" && "Daftarkan diri Anda untuk mulai booking umroh."}
                {mode === "forgot" && "Masukkan email Anda untuk menerima link reset kata sandi."}
              </p>
            </div>

            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Kata Sandi</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Lupa kata sandi?
                  </button>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gradient-gold text-primary font-semibold"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4 mr-2" />
                  )}
                  {loading ? "Memproses…" : "Masuk"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Belum punya akun?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-primary font-medium hover:underline"
                  >
                    Daftar sekarang
                  </button>
                </p>
              </form>
            )}

            {mode === "signup" && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Kata Sandi</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 6 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Konfirmasi Kata Sandi</Label>
                  <Input
                    id="confirm"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ulangi kata sandi"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gradient-gold text-primary font-semibold"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  {loading ? "Mendaftar…" : "Daftar"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Sudah punya akun?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-primary font-medium hover:underline"
                  >
                    Masuk
                  </button>
                </p>
              </form>
            )}

            {mode === "forgot" && (
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gradient-gold text-primary font-semibold"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {loading ? "Mengirim…" : "Kirim Link Reset"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-primary font-medium hover:underline"
                  >
                    ← Kembali ke halaman masuk
                  </button>
                </p>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
};

function translateError(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "Email atau kata sandi salah.";
  if (msg.includes("Email not confirmed")) return "Email belum dikonfirmasi. Cek inbox Anda.";
  if (msg.includes("User already registered")) return "Email sudah terdaftar. Silakan masuk.";
  if (msg.includes("Password should be at least")) return "Kata sandi minimal 6 karakter.";
  if (msg.includes("rate limit")) return "Terlalu banyak percobaan. Tunggu sebentar.";
  return msg;
}

export default Auth;
