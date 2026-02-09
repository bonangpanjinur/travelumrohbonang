import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const emailSchema = z.object({
  email: z.string().email("Email tidak valid"),
});

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validation = emailSchema.safeParse({ email });
    if (!validation.success) {
      setError(validation.error.errors[0]?.message || "Email tidak valid");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setSent(true);
      toast({
        title: "Email terkirim!",
        description: "Silakan cek inbox email Anda untuk reset password",
      });
    } catch (err: any) {
      console.error("Error sending reset email:", err);
      toast({
        title: "Gagal mengirim email",
        description: err.message || "Terjadi kesalahan, silakan coba lagi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

          {sent ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground mb-2">
                Email Terkirim!
              </h1>
              <p className="text-muted-foreground mb-6">
                Kami telah mengirim link reset password ke{" "}
                <span className="font-medium text-foreground">{email}</span>
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Silakan cek inbox email Anda. Jika tidak ada, cek folder spam.
              </p>
              <Button
                variant="outline"
                onClick={() => setSent(false)}
                className="w-full"
              >
                Kirim Ulang Email
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-muted-foreground" />
                </div>
                <h1 className="text-2xl font-display font-bold text-foreground">
                  Lupa Kata Sandi?
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Masukkan email Anda dan kami akan mengirim link untuk reset password
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
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
                  {error && (
                    <p className="text-xs text-destructive mt-1">{error}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-gold text-primary font-semibold"
                  disabled={loading}
                >
                  {loading ? "Mengirim..." : "Kirim Link Reset"}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Ingat password? </span>
                <Link to="/auth" className="text-accent font-semibold hover:underline">
                  Masuk
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
