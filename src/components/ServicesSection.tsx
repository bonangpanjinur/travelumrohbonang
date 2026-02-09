import { motion } from "framer-motion";
import { Plane, Hotel, BookOpen, Users, Shield, Headphones } from "lucide-react";

const services = [
  {
    icon: Plane,
    title: "Penerbangan Premium",
    description: "Maskapai terpercaya dengan jadwal yang fleksibel dan nyaman.",
  },
  {
    icon: Hotel,
    title: "Hotel Bintang 5",
    description: "Lokasi strategis dekat Masjidil Haram & Masjid Nabawi.",
  },
  {
    icon: BookOpen,
    title: "Bimbingan Ibadah",
    description: "Ustadz berpengalaman mendampingi setiap ibadah Anda.",
  },
  {
    icon: Users,
    title: "Muthawif Profesional",
    description: "Pemandu lokal bersertifikat untuk kenyamanan Anda.",
  },
  {
    icon: Shield,
    title: "Jaminan Berangkat",
    description: "Kepastian jadwal keberangkatan sesuai yang dijanjikan.",
  },
  {
    icon: Headphones,
    title: "Layanan 24/7",
    description: "Tim support siap membantu kapanpun Anda butuhkan.",
  },
];

const ServicesSection = () => {
  return (
    <section className="section-padding bg-background islamic-pattern-light">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-accent uppercase tracking-widest">
            Layanan Kami
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mt-3">
            Pelayanan <span className="text-gradient-gold">Terbaik</span> untuk Anda
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Kami menyediakan layanan lengkap untuk kenyamanan ibadah umroh Anda
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative p-8 rounded-2xl bg-card border border-border hover:border-gold/30 transition-all duration-300 hover:shadow-lg hover:shadow-gold/5"
            >
              <div className="w-14 h-14 rounded-xl gradient-gold flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <service.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-display font-bold text-foreground mb-2">
                {service.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {service.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
