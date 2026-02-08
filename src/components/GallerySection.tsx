import { motion } from "framer-motion";

const images = [
  { src: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=600&q=80", alt: "Makkah", span: "col-span-2 row-span-2" },
  { src: "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=400&q=80", alt: "Madinah", span: "" },
  { src: "https://images.unsplash.com/photo-1542816417-0983c9c9ad53?w=400&q=80", alt: "Ibadah", span: "" },
  { src: "https://images.unsplash.com/photo-1466442929976-97f336a657be?w=400&q=80", alt: "Masjid", span: "" },
  { src: "https://images.unsplash.com/photo-1585036156171-384164a8c821?w=400&q=80", alt: "Perjalanan", span: "" },
];

const GallerySection = () => {
  return (
    <section id="galeri" className="section-padding bg-background">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-accent uppercase tracking-widest">
            Galeri
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mt-3">
            Momen <span className="text-gradient-gold">Berharga</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px]">
          {images.map((img, index) => (
            <motion.div
              key={img.alt}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-xl overflow-hidden group ${img.span}`}
            >
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/30 transition-colors duration-300" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GallerySection;
