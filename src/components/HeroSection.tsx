import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero-umroh.jpg";

interface HeroSettings {
  background_url: string;
  overlay_opacity: number;
  title: string;
  title_highlight: string;
  subtitle: string;
  show_stats: boolean;
  stats: { value: string; label: string }[];
  primary_button_text: string;
  primary_button_url: string;
  primary_button_enabled: boolean;
  secondary_button_text: string;
  secondary_button_url: string;
  secondary_button_enabled: boolean;
}

const defaultSettings: HeroSettings = {
  background_url: "",
  overlay_opacity: 70,
  title: "Wujudkan",
  title_highlight: "Ibadah Umroh",
  subtitle: "Perjalanan spiritual dengan pelayanan terbaik, bimbingan ustadz berpengalaman, dan hotel bintang 5 dekat Masjidil Haram.",
  show_stats: true,
  stats: [
    { value: "10K+", label: "Jemaah" },
    { value: "150+", label: "Keberangkatan" },
    { value: "15+", label: "Tahun" },
    { value: "4.9", label: "Rating" },
  ],
  primary_button_text: "Lihat Paket Umroh",
  primary_button_url: "/paket",
  primary_button_enabled: true,
  secondary_button_text: "Konsultasi Gratis",
  secondary_button_url: "#kontak",
  secondary_button_enabled: true,
};

const HeroSection = () => {
  const [settings, setSettings] = useState<HeroSettings>(defaultSettings);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "hero")
        .maybeSingle();

      if (data?.value) {
        setSettings({ ...defaultSettings, ...(data.value as object) });
      }
    };

    fetchSettings();
  }, []);

  const backgroundImage = settings.background_url || heroImg;

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={backgroundImage}
          alt="Masjidil Haram, Makkah"
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div 
          className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary/50"
          style={{ opacity: settings.overlay_opacity / 100 }}
        />
        <div className="absolute inset-0 islamic-pattern opacity-30" />
      </div>

      {/* Content */}
      <div className="relative container-custom section-padding pt-32">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-2 mb-6"
          >
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-gold text-gold" />
              ))}
            </div>
            <span className="text-sm text-gold-light font-medium">
              Dipercaya 10,000+ Jemaah
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-display font-bold text-primary-foreground leading-tight mb-6"
          >
            {settings.title}{" "}
            <span className="text-gradient-gold">{settings.title_highlight}</span>{" "}
            Impian Anda
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-primary-foreground/80 mb-8 max-w-lg"
          >
            {settings.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            {settings.primary_button_enabled && (
              <Link to={settings.primary_button_url}>
                <Button
                  size="lg"
                  className="gradient-gold text-primary font-semibold text-base px-8 hover:opacity-90 transition-opacity"
                >
                  {settings.primary_button_text}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            )}
            {settings.secondary_button_enabled && (
              <Link to={settings.secondary_button_url}>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-gold/50 text-gold hover:bg-gold/10 font-semibold text-base px-8"
                >
                  {settings.secondary_button_text}
                </Button>
              </Link>
            )}
          </motion.div>

          {/* Stats */}
          {settings.show_stats && settings.stats.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex gap-8 mt-12 pt-8 border-t border-primary-foreground/20"
            >
              {settings.stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl sm:text-3xl font-display font-bold text-gold">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-primary-foreground/60">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
