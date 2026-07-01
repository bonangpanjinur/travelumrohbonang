import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface GalleryItem {
  id: string;
  title: string | null;
  image_url: string;
  category: string | null;
}

const GallerySection = () => {
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGallery = async () => {
      const { data, error } = await supabase
        .from("gallery")
        .select("id, title, image_url, category")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(5);

      if (!error && data) {
        setImages(data);
      }
      setLoading(false);
    };

    fetchGallery();
  }, []);

  // Helper to determine span based on index for a masonry-like look
  const getSpanClass = (index: number) => {
    if (index === 0) return "col-span-2 row-span-2";
    return "";
  };

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

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold"></div>
          </div>
        ) : images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px]">
            {images.map((img, index) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-xl overflow-hidden group ${getSpanClass(index)}`}
              >
                <img
                  src={img.image_url}
                  alt={img.title || "Gallery image"}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/30 transition-colors duration-300" />
                {img.title && (
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/60 to-transparent">
                    <p className="text-white text-xs font-medium">{img.title}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>Belum ada foto galeri untuk ditampilkan.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default GallerySection;
