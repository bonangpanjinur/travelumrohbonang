import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Helmet } from "react-helmet-async";

interface PageData {
  id: string;
  slug: string;
  title: string | null;
  content: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
}

const DynamicPage = () => {
  const { slug } = useParams();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPage = async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setPage(data as PageData);
      }
      setLoading(false);
    };

    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container-custom max-w-3xl text-center">
            <h1 className="text-4xl font-display font-bold mb-4">Halaman Tidak Ditemukan</h1>
            <p className="text-muted-foreground mb-8">
              Halaman yang Anda cari tidak ada atau sudah dihapus.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{page.seo_title || page.title || "Halaman"} | UmrohPlus</title>
        {page.seo_description && (
          <meta name="description" content={page.seo_description} />
        )}
      </Helmet>

      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container-custom max-w-4xl">
          {/* Breadcrumb */}
          <div className="mb-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
            </Link>
          </div>

          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="gradient-emerald p-8 text-center">
              <h1 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground">
                {page.title || "Untitled"}
              </h1>
              <div className="flex items-center justify-center gap-2 mt-4 text-primary-foreground/70">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">
                  {format(new Date(page.created_at), "d MMMM yyyy", { locale: localeId })}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 md:p-12">
              {page.content ? (
                <div
                  className="prose prose-lg max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground"
                  dangerouslySetInnerHTML={{ __html: page.content }}
                />
              ) : (
                <p className="text-center text-muted-foreground">
                  Konten belum tersedia.
                </p>
              )}
            </div>
          </motion.article>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DynamicPage;
