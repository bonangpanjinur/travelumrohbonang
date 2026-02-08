import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star } from "lucide-react";
import heroImg from "@/assets/hero-umroh.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImg}
          alt="Masjidil Haram, Makkah"
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/40" />
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
            Wujudkan{" "}
            <span className="text-gradient-gold">Ibadah Umroh</span>{" "}
            Impian Anda
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-primary-foreground/80 mb-8 max-w-lg"
          >
            Perjalanan spiritual dengan pelayanan terbaik, bimbingan ustadz
            berpengalaman, dan hotel bintang 5 dekat Masjidil Haram.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button
              size="lg"
              className="gradient-gold text-primary font-semibold text-base px-8 hover:opacity-90 transition-opacity"
            >
              Lihat Paket Umroh
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-gold/50 text-gold hover:bg-gold/10 font-semibold text-base px-8"
            >
              Konsultasi Gratis
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex gap-8 mt-12 pt-8 border-t border-primary-foreground/20"
          >
            {[
              { value: "10K+", label: "Jemaah" },
              { value: "150+", label: "Keberangkatan" },
              { value: "15+", label: "Tahun" },
              { value: "4.9", label: "Rating" },
            ].map((stat) => (
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
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
