import { motion } from "framer-motion";
import { FileText, CreditCard, Plane, BookOpen, Heart } from "lucide-react";

const steps = [
  {
    icon: FileText,
    step: "01",
    title: "Pilih Paket",
    description: "Pilih paket umroh yang sesuai dengan kebutuhan dan budget Anda.",
  },
  {
    icon: CreditCard,
    step: "02",
    title: "Booking & Pembayaran",
    description: "Lakukan pendaftaran dan pembayaran sesuai metode yang tersedia.",
  },
  {
    icon: BookOpen,
    step: "03",
    title: "Manasik Umroh",
    description: "Ikuti bimbingan manasik untuk persiapan ibadah yang sempurna.",
  },
  {
    icon: Plane,
    step: "04",
    title: "Keberangkatan",
    description: "Berangkat bersama rombongan dengan pendampingan penuh.",
  },
  {
    icon: Heart,
    step: "05",
    title: "Ibadah Umroh",
    description: "Jalani ibadah umroh dengan khusyuk dan bimbingan muthawif.",
  },
];

const GuideSection = () => {
  return (
    <section className="section-padding bg-card">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-accent uppercase tracking-widest">
            Panduan
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mt-3">
            Langkah Mudah <span className="text-gradient-gold">Umroh</span>
          </h2>
        </motion.div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative text-center"
              >
                <div className="relative z-10 w-20 h-20 mx-auto rounded-full gradient-gold flex items-center justify-center mb-4 shadow-lg shadow-gold/20">
                  <step.icon className="w-8 h-8 text-primary" />
                </div>
                <span className="text-xs font-bold text-gold tracking-widest">
                  STEP {step.step}
                </span>
                <h3 className="text-lg font-display font-bold text-foreground mt-1 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default GuideSection;
