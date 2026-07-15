import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTenant } from "@/shared/hooks/useTenant";
import { lookupSlugRedirect } from "@/features/cms/lib/slugRedirect";
import { supabase } from "@/shared/integrations/supabase/client";
import Navbar from "@/shared/components/layout/Navbar";
import Footer from "@/shared/components/layout/Footer";
import { motion } from "framer-motion";
import { Calendar, User, ArrowLeft, Tag, Share2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import SEO from "@/shared/components/seo/SEO";
import BreadcrumbJsonLd from "@/shared/components/seo/BreadcrumbJsonLd";
import { sanitizeHtml } from "@/shared/lib/sanitizeHtml";
import RelatedPackages from "@/features/paket/components/RelatedPackages";
import RelatedArticles from "@/features/cms/components/RelatedArticles";
import { toast } from "sonner";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image_url: string;
  category: string;
  author: string;
  published_at: string;
  created_at: string;
  seo_title: string;
  seo_description: string;
}

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  image_url: string;
  excerpt: string;
  published_at: string;
}

const BlogDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;

      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (error) {
        console.error("Gagal memuat artikel:", error);
        toast.error("Gagal memuat artikel. Coba muat ulang halaman.");
        setLoading(false);
        return;
      }

      if (data) {
        setPost(data as BlogPost);

        // Fetch related posts
        const { data: related, error: relatedError } = await supabase
          .from("blog_posts")
          .select("id, title, slug, image_url, excerpt, published_at")
          .eq("is_published", true)
          .neq("id", data.id)
          .limit(3);

        if (relatedError) {
          console.error("Gagal memuat artikel terkait:", relatedError);
        }

        setRelatedPosts((related || []) as RelatedPost[]);
      } else {
        const redirectTo = await lookupSlugRedirect("blog", slug, tenant?.id);
        if (redirectTo) {
          navigate(`/blog/${redirectTo}`, { replace: true });
          return;
        }
      }

      setLoading(false);
    };

    fetchPost();
  }, [slug, tenant?.id, navigate]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          text: post?.excerpt,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link berhasil disalin!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-20">
          <div className="h-64 md:h-80 bg-muted animate-pulse" />
          <div className="container-custom max-w-3xl py-12 space-y-4">
            <div className="h-8 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
            <div className="space-y-3 pt-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`h-4 bg-muted animate-pulse rounded ${i === 2 || i === 5 ? "w-2/3" : "w-full"}`} />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h1 className="text-2xl font-bold text-foreground mb-4">Artikel tidak ditemukan</h1>
          <Link to="/blog">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Blog
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SEO
        title={post.seo_title || post.title}
        description={post.seo_description || post.excerpt}
        image={post.image_url}
        type="article"
        publishedTime={post.published_at || post.created_at}
        author={post.author}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Beranda", url: "/" },
          { name: "Blog", url: "/blog" },
          { name: post.title, url: `/blog/${post.slug}` },
        ]}
      />
      
      <Navbar />
      <main className="pt-20">
        {/* Hero */}
        <section className="relative h-[50vh] min-h-[400px]">
          <img
            src={post.image_url || "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200&q=80"}
            alt={post.title}
            className="w-full h-full object-cover"
            fetchPriority="high"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute inset-0 flex items-end">
            <div className="container-custom pb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl"
              >
                <Link to="/blog" className="inline-flex items-center text-primary-foreground/80 hover:text-gold mb-4 transition-colors">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Kembali ke Blog
                </Link>
                
                {post.category && (
                  <Badge className="mb-4 gradient-gold text-primary">
                    <Tag className="w-3 h-3 mr-1" />
                    {post.category}
                  </Badge>
                )}
                
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground">
                  {post.title}
                </h1>
                
                <div className="flex items-center gap-4 mt-6 text-muted-foreground">
                  {post.author && (
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {post.author}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(post.published_at || post.created_at), "d MMMM yyyy", { locale: idLocale })}
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleShare}>
                    <Share2 className="w-4 h-4 mr-1" />
                    Bagikan
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="section-padding">
          <div className="container-custom">
            <div className="max-w-3xl mx-auto">
              <motion.article
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="prose prose-lg dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
              />
            </div>
          </div>
        </section>

        {/* Internal linking: related articles + related packages for SEO */}
        <RelatedArticles
          excludeId={post.id}
          category={post.category}
          heading="Artikel Umroh Lainnya"
          intro="Lanjutkan membaca panduan dan tips perjalanan ibadah umroh dari tim kami."
        />
        <RelatedPackages
          heading="Paket Umroh Rekomendasi"
          intro="Siap berangkat? Lihat paket umroh terbaik dengan hotel bintang 5 dan bimbingan ustadz berpengalaman."
        />
      </main>
      <Footer />
    </div>
  );
};

export default BlogDetail;
