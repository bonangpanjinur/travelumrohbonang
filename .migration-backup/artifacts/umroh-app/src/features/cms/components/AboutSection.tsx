import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import aboutImg from "@/assets/about-madinah.jpg";

const advantages = [
  "Izin resmi Kementerian Agama RI",
  "Berpengalaman lebih dari 15 tahun",
  "Hotel bintang 5 dekat Masjidil Haram",
  "Pembimbing ibadah profesional",
  "Harga transparan tanpa biaya tersembunyi",
  "Garansi keberangkatan sesuai jadwal",
];

const AboutSection = () => {
  return (
    <section id="tentang" className="section-padding bg-primary relative overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 islamic-pattern pointer-events-none" />
      
      <div className="container-custom relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={aboutImg}
                alt="Interior Masjid Nabawi"
                className="w-full h-[400px] lg:h-[500px] object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/50 to-transparent" />
            </div>
            {/* Floating card */}
            <div className="absolute -bottom-6 -right-6 bg-card rounded-2xl p-6 shadow-xl border border-gold/20 hidden md:block">
              <div className="text-3xl font-display font-bold text-gold">15+</div>
              <div className="text-sm text-muted-foreground">Tahun Pengalaman</div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-sm font-semibold text-gold uppercase tracking-widest">
              Tentang Kami
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mt-3 mb-6">
              Mitra Terpercaya Perjalanan Spiritual Anda
            </h2>
            <p className="text-primary-foreground/80 mb-8 leading-relaxed">
              UmrohPlus hadir sebagai mitra perjalanan ibadah Anda dengan komitmen
              memberikan pelayanan terbaik. Dengan pengalaman lebih dari 15 tahun,
              kami telah memberangkatkan ribuan jemaah dengan penuh keikhlasan dan
              profesionalisme.
            </p>

            <div className="grid gap-3">
              {advantages.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-gold flex-shrink-0" />
                  <span className="text-primary-foreground/90 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
