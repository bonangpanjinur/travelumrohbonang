import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Testimonial {
  id: string;
  name: string;
  location: string | null;
  package_name: string | null;
  photo_url: string | null;
  rating: number;
  content: string;
}

const TestimonialsSection = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [backgroundPattern, setBackgroundPattern] = useState("islamic");

  useEffect(() => {
    const fetchData = async () => {
      // Fetch testimonials
      const { data: testimonialsData } = await supabase
        .from("testimonials")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(6);

      if (testimonialsData && testimonialsData.length > 0) {
        setTestimonials(testimonialsData);
      }

      // Fetch background pattern
      const { data: settingsData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "background_pattern")
        .single();

      if (settingsData?.value) {
        setBackgroundPattern(settingsData.value);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const getBackgroundClass = () => {
    switch (backgroundPattern) {
      case "islamic":
        return "islamic-pattern";
      case "dots":
        return "bg-dots-pattern";
      case "grid":
        return "bg-grid-pattern";
      case "none":
        return "";
      default:
        return "islamic-pattern";
    }
  };

  // Fallback to static data if no testimonials in database
  const displayTestimonials = testimonials.length > 0 ? testimonials : [
    {
      id: "1",
      name: "Hj. Siti Aminah",
      location: "Jakarta",
      package_name: "Paket VIP 2024",
      photo_url: null,
      rating: 5,
      content: "Alhamdulillah, pelayanan sangat memuaskan. Hotel dekat dengan Masjidil Haram, pembimbing sangat sabar dan penuh perhatian.",
    },
    {
      id: "2",
      name: "H. Ahmad Fauzi",
      location: "Surabaya",
      package_name: "Paket Reguler 2024",
      photo_url: null,
      rating: 5,
      content: "Perjalanan umroh yang sangat berkesan. Semua terorganisir dengan baik, dari keberangkatan hingga kepulangan. Terima kasih UmrohPlus!",
    },
    {
      id: "3",
      name: "Ibu Nurhaliza",
      location: "Bandung",
      package_name: "Paket Hemat 2023",
      photo_url: null,
      rating: 5,
      content: "Meskipun paket hemat, pelayanannya tetap prima. Insya Allah akan berangkat lagi bersama UmrohPlus.",
    },
  ];

  return (
    <section className="section-padding bg-primary relative overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className={`absolute inset-0 pointer-events-none ${getBackgroundClass()}`} />
      
      <div className="container-custom relative z-10">
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
          {displayTestimonials.slice(0, 3).map((t, index) => (
            <motion.div
              key={t.id}
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
                <Avatar className="w-12 h-12 border-2 border-gold/30">
                  <AvatarImage src={t.photo_url || undefined} />
                  <AvatarFallback className="gradient-gold text-primary font-bold">
                    {t.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-primary-foreground text-sm">{t.name}</div>
                  <div className="text-xs text-gold-light">
                    {t.location && `${t.location} • `}{t.package_name || "Jamaah Umroh"}
                  </div>
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
