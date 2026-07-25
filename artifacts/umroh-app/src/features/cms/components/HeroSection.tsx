import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/shared/components/ui/button";
import { ArrowRight, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/shared/integrations/supabase/client";
import { useLanguage } from "@/shared/i18n/LanguageContext";
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

interface GallerySlide {
  id: string;
  image_url: string;
  title: string | null;
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

const SLIDE_INTERVAL = 5000; // ms between auto-advance

const HeroSection = () => {
  const [settings, setSettings] = useState<HeroSettings>(defaultSettings);
  const { language, translateDynamic } = useLanguage();
  const [translated, setTranslated] = useState({ title: "", highlight: "", subtitle: "", primaryBtn: "", secondaryBtn: "" });

  // Slideshow state
  const [slides, setSlides] = useState<GallerySlide[]>([]);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    const fetchGallery = async () => {
      const { data } = await supabase
        .from("gallery")
        .select("id, image_url, title")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(8);
      if (data && data.length > 0) {
        setSlides(data);
      }
    };

    fetchSettings();
    fetchGallery();
  }, []);

  // Auto-advance slideshow
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDirection(1);
      setCurrent((c) => (c + 1) % Math.max(slides.length, 1));
    }, SLIDE_INTERVAL);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length > 1) {
      startTimer();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [slides.length, startTimer]);

  const goTo = useCallback((idx: number) => {
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
    startTimer(); // reset timer on manual nav
  }, [current, startTimer]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
    startTimer();
  }, [slides.length, startTimer]);

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrent((c) => (c + 1) % slides.length);
    startTimer();
  }, [slides.length, startTimer]);

  // Translate dynamic content when language changes
  useEffect(() => {
    const doTranslate = async () => {
      if (language === "id") {
        setTranslated({
          title: settings.title,
          highlight: settings.title_highlight,
          subtitle: settings.subtitle,
          primaryBtn: settings.primary_button_text,
          secondaryBtn: settings.secondary_button_text,
        });
        return;
      }
      const [title, highlight, subtitle, primaryBtn, secondaryBtn] = await Promise.all([
        translateDynamic(settings.title),
        translateDynamic(settings.title_highlight),
        translateDynamic(settings.subtitle),
        translateDynamic(settings.primary_button_text),
        translateDynamic(settings.secondary_button_text),
      ]);
      setTranslated({ title, highlight, subtitle, primaryBtn, secondaryBtn });
    };
    doTranslate();
  }, [language, settings, translateDynamic]);

  // Background: if gallery has images use slideshow, else fallback to settings/heroImg
  const fallbackBg = settings.background_url || heroImg;
  const hasSlides = slides.length > 0;

  const slideVariants = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 80 : -80 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -80 : 80 }),
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* ── Background Slideshow ── */}
      <div className="absolute inset-0">
        {hasSlides ? (
          <AnimatePresence initial={false} custom={direction}>
            <motion.img
              key={slides[current]?.id ?? current}
              src={slides[current]?.image_url ?? fallbackBg}
              alt={slides[current]?.title || "Hero umroh"}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.7, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </AnimatePresence>
        ) : (
          <img
            src={fallbackBg}
            alt="Masjidil Haram, Makkah - tujuan utama perjalanan umroh"
            className="w-full h-full object-cover"
            loading="eager"
            decoding="async"
            fetchPriority="high"
            width={1920}
            height={1080}
          />
        )}

        {/* Overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary/50"
          style={{ opacity: settings.overlay_opacity / 100 }}
        />
        <div className="absolute inset-0 islamic-pattern opacity-30" />
      </div>

      {/* ── Content ── */}
      <div className="relative container-custom section-padding pt-32 pb-20">
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
            {translated.title || settings.title}{" "}
            <span className="text-gradient-gold">{translated.highlight || settings.title_highlight}</span>{" "}
            {language === "id" ? "Impian Anda" : "of Your Dreams"}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-primary-foreground/80 mb-8 max-w-lg"
          >
            {translated.subtitle || settings.subtitle}
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
                  {translated.primaryBtn || settings.primary_button_text}
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
                  {translated.secondaryBtn || settings.secondary_button_text}
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

      {/* ── Slideshow Controls (only if gallery has images) ── */}
      {hasSlides && slides.length > 1 && (
        <>
          {/* Prev / Next arrows */}
          <button
            onClick={goPrev}
            aria-label="Slide sebelumnya"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 border border-white/20 flex items-center justify-center text-white transition-all backdrop-blur-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goNext}
            aria-label="Slide berikutnya"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 border border-white/20 flex items-center justify-center text-white transition-all backdrop-blur-sm"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Pagination dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                aria-label={`Ke slide ${idx + 1}`}
                className={`transition-all duration-300 rounded-full ${
                  idx === current
                    ? "w-6 h-2 bg-gold"
                    : "w-2 h-2 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default HeroSection;
