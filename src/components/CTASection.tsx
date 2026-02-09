import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Phone } from "lucide-react";

const CTASection = () => {
  return (
    <section className="section-padding bg-background">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-3xl overflow-hidden bg-primary p-12 md:p-16 text-center"
        >
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 islamic-pattern pointer-events-none" />
          
          {/* Content */}
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-primary-foreground mb-4">
              Siap Berangkat <span className="text-gradient-gold">Umroh?</span>
            </h2>
            <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8 text-lg">
              Daftarkan diri Anda sekarang dan wujudkan perjalanan spiritual impian Anda bersama UmrohPlus.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="gradient-gold text-primary font-semibold text-base px-8 hover:opacity-90">
                Daftar Sekarang
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="border-gold/50 text-gold hover:bg-gold/10 font-semibold">
                <Phone className="w-5 h-5 mr-2" />
                Hubungi Kami
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
