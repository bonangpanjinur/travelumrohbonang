import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Star, Calendar, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const packages = [
  {
    id: 1,
    title: "Paket Hemat",
    category: "Ekonomi",
    price: "25.900.000",
    duration: "9 Hari",
    hotel: "Bintang 3",
    quota: 45,
    image: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=600&q=80",
    features: ["Pesawat PP", "Hotel Bintang 3", "Makan 3x", "Muthawif"],
  },
  {
    id: 2,
    title: "Paket Reguler",
    category: "Populer",
    price: "32.500.000",
    duration: "9 Hari",
    hotel: "Bintang 4",
    quota: 40,
    popular: true,
    image: "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=600&q=80",
    features: ["Pesawat PP", "Hotel Bintang 4", "Makan 3x", "Muthawif", "City Tour"],
  },
  {
    id: 3,
    title: "Paket VIP",
    category: "Premium",
    price: "45.000.000",
    duration: "12 Hari",
    hotel: "Bintang 5",
    quota: 25,
    image: "https://images.unsplash.com/photo-1542816417-0983c9c9ad53?w=600&q=80",
    features: ["Pesawat PP Business", "Hotel Bintang 5", "Makan 3x", "Muthawif VIP", "City Tour", "Laundry"],
  },
];

const PackagesPreview = () => {
  return (
    <section className="section-padding bg-background">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-accent uppercase tracking-widest">
            Paket Umroh
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mt-3">
            Pilih Paket <span className="text-gradient-gold">Terbaik</span> Anda
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Berbagai pilihan paket umroh yang sesuai dengan kebutuhan dan budget Anda
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className={`relative rounded-2xl overflow-hidden bg-card border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                pkg.popular ? "border-gold shadow-lg shadow-gold/10" : "border-border"
              }`}
            >
              {pkg.popular && (
                <div className="absolute top-4 right-4 z-10 gradient-gold text-primary text-xs font-bold px-3 py-1 rounded-full">
                  Terpopuler
                </div>
              )}

              <div className="relative h-48 overflow-hidden">
                <img src={pkg.image} alt={pkg.title} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                <div className="absolute bottom-3 left-4">
                  <span className="bg-primary/90 text-primary-foreground text-xs px-3 py-1 rounded-full">
                    {pkg.category}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-display font-bold text-foreground">{pkg.title}</h3>

                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> {pkg.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4" /> {pkg.hotel}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" /> {pkg.quota} seat
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {pkg.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                      {f}
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-border flex items-end justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground">Mulai dari</span>
                    <div className="text-2xl font-display font-bold text-foreground">
                      Rp {pkg.price}
                    </div>
                  </div>
                  <Link to="/paket">
                  <Button
                    size="sm"
                    className={pkg.popular ? "gradient-gold text-primary" : "bg-primary text-primary-foreground"}
                  >
                    Detail
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/paket">
            <Button variant="outline" size="lg" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              Lihat Semua Paket
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PackagesPreview;
