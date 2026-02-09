import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, KeyRound, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const passwordSchema = z.object({
  password: z.string().min(6, "Password minimal 6 karakter"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Password tidak cocok",
  path: ["confirmPassword"],
});

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidSession, setIsValidSession] = useState(false);
  const [checking, setChecking] = useState(true);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if there's a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if we have the recovery token in URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const type = hashParams.get("type");
      
      if (type === "recovery" && accessToken) {
        setIsValidSession(true);
      } else if (session) {
        // User might already be logged in with recovery session
        setIsValidSession(true);
      }
      
      setChecking(false);
    };

    checkSession();

    // Listen for auth state changes (recovery token exchange)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsValidSession(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = passwordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      setSuccess(true);
      toast({
        title: "Password berhasil diubah!",
        description: "Anda sekarang bisa login dengan password baru",
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/auth");
      }, 3000);
    } catch (err: any) {
      console.error("Error resetting password:", err);
      toast({
        title: "Gagal mengubah password",
        description: err.message || "Terjadi kesalahan, silakan coba lagi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background islamic-pattern px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <KeyRound className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">
              Link Tidak Valid
            </h1>
            <p className="text-muted-foreground mb-6">
              Link reset password tidak valid atau sudah kadaluarsa. Silakan minta link baru.
            </p>
            <Link to="/forgot-password">
              <Button className="w-full gradient-gold text-primary font-semibold">
                Minta Link Baru
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background islamic-pattern px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8">
          <Link
            to="/auth"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Login
          </Link>

          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground mb-2">
                Password Berhasil Diubah!
              </h1>
              <p className="text-muted-foreground mb-6">
                Anda akan dialihkan ke halaman login...
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                  <KeyRound className="w-6 h-6 text-muted-foreground" />
                </div>
                <h1 className="text-2xl font-display font-bold text-foreground">
                  Reset Password
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Masukkan password baru untuk akun Anda
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="password">Password Baru</Label>
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
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.password}
                    </p>
                  )}
                </div>

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
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-gold text-primary font-semibold"
                  disabled={loading}
                >
                  {loading ? "Menyimpan..." : "Simpan Password Baru"}
                </Button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
