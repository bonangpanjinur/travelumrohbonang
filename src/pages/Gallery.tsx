import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Camera, X } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface GalleryItem {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  category: string | null;
}

const Gallery = () => {
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [backgroundPattern, setBackgroundPattern] = useState("islamic");

  useEffect(() => {
    const fetchData = async () => {
      // Fetch gallery images
      const { data: galleryData } = await supabase
        .from("gallery")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (galleryData) {
        setImages(galleryData);
      }

      // Fetch background pattern setting
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

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Galeri | UmrohPlus</title>
        <meta name="description" content="Galeri foto perjalanan umroh bersama UmrohPlus. Lihat momen-momen indah jamaah kami di Tanah Suci." />
      </Helmet>

      <Navbar />

      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="py-16 bg-primary relative overflow-hidden">
          {/* Subtle pattern overlay */}
          <div className={`absolute inset-0 pointer-events-none ${getBackgroundClass()}`} />
          
          <div className="container-custom text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-gold/20 text-gold px-4 py-2 rounded-full mb-6">
                <Camera className="w-4 h-4" />
                <span className="text-sm font-medium">Momen Berharga</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-primary-foreground mb-4">
                Galeri <span className="text-gradient-gold">Perjalanan</span>
              </h1>
              <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
                Kenangan indah jamaah kami dalam menjalankan ibadah umroh di Tanah Suci
              </p>
            </motion.div>
          </div>
        </section>

        {/* Gallery Grid */}
        <section className="section-padding">
          <div className="container-custom">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
              </div>
            ) : images.length === 0 ? (
              <div className="text-center py-16">
                <Camera className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Belum ada foto dalam galeri</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <motion.div
                    key={image.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="group relative aspect-square overflow-hidden rounded-xl cursor-pointer"
                    onClick={() => setSelectedImage(image)}
                  >
                    <img
                      src={image.image_url}
                      alt={image.title || "Gallery image"}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        {image.title && (
                          <h3 className="text-white font-semibold text-sm">
                            {image.title}
                          </h3>
                        )}
                        {image.category && (
                          <span className="text-white/70 text-xs">
                            {image.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
          {selectedImage && (
            <div className="relative">
              <img
                src={selectedImage.image_url}
                alt={selectedImage.title || "Gallery image"}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
              {(selectedImage.title || selectedImage.description) && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg">
                  {selectedImage.title && (
                    <h3 className="text-white font-semibold text-lg">
                      {selectedImage.title}
                    </h3>
                  )}
                  {selectedImage.description && (
                    <p className="text-white/80 text-sm mt-1">
                      {selectedImage.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Gallery;
