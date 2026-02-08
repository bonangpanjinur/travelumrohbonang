import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Hj. Siti Aminah",
    role: "Jemaah Paket VIP 2024",
    content: "Alhamdulillah, pelayanan sangat memuaskan. Hotel dekat dengan Masjidil Haram, pembimbing sangat sabar dan penuh perhatian.",
    rating: 5,
  },
  {
    name: "H. Ahmad Fauzi",
    role: "Jemaah Paket Reguler 2024",
    content: "Perjalanan umroh yang sangat berkesan. Semua terorganisir dengan baik, dari keberangkatan hingga kepulangan. Terima kasih UmrohPlus!",
    rating: 5,
  },
  {
    name: "Ibu Nurhaliza",
    role: "Jemaah Paket Hemat 2023",
    content: "Meskipun paket hemat, pelayanannya tetap prima. Insya Allah akan berangkat lagi bersama UmrohPlus.",
    rating: 5,
  },
];

const TestimonialsSection = () => {
  return (
    <section className="section-padding gradient-emerald islamic-pattern">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-gold uppercase tracking-widest">
            Testimoni
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-primary-foreground mt-3">
            Kata Mereka tentang <span className="text-gradient-gold">Kami</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, index) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="bg-card/10 backdrop-blur-sm border border-gold/20 rounded-2xl p-8 relative"
            >
              <Quote className="w-8 h-8 text-gold/30 absolute top-6 right-6" />
              <div className="flex gap-1 mb-4">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-gold text-gold" />
                ))}
              </div>
              <p className="text-primary-foreground/80 text-sm leading-relaxed mb-6">
                "{t.content}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center text-primary font-bold text-sm">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-primary-foreground text-sm">{t.name}</div>
                  <div className="text-xs text-gold-light">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
