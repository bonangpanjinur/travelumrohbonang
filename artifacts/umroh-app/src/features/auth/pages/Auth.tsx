import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { motion } from "framer-motion";
import { ArrowLeft, LogIn } from "lucide-react";
import SEO from "@/shared/components/seo/SEO";
import { useAuth } from "@/shared/hooks/useAuth";

const Auth = () => {
  const { login } = useAuth();

  return (
    <>
      <SEO title="Masuk" description="Login untuk mengelola booking umroh Anda." noIndex />
      <div className="min-h-screen flex items-center justify-center bg-background islamic-pattern px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border rounded-2xl shadow-xl p-8 text-center">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Beranda
            </Link>

            <div className="w-14 h-14 mx-auto rounded-full gradient-gold flex items-center justify-center mb-4">
              <span className="font-display font-bold text-2xl text-primary">U</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">Masuk ke Akun</h1>
            <p className="text-sm text-muted-foreground mt-2 mb-8">
              Masuk untuk mengelola booking dan profil umroh Anda.
            </p>

            <Button
              onClick={login}
              className="w-full gradient-gold text-primary font-semibold"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Masuk
            </Button>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Auth;
