import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Calendar, User, ArrowLeft, Tag, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import SEO from "@/components/SEO";
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
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;

      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (data) {
        setPost(data as BlogPost);
        
        // Fetch related posts
        const { data: related } = await supabase
          .from("blog_posts")
          .select("id, title, slug, image_url, excerpt, published_at")
          .eq("is_published", true)
          .neq("id", data.id)
          .limit(3);
        
        setRelatedPosts((related || []) as RelatedPost[]);
      }

      setLoading(false);
    };

    fetchPost();
  }, [slug]);

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
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
        </div>
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
      
      <Navbar />
      <main className="pt-20">
        {/* Hero */}
        <section className="relative h-[50vh] min-h-[400px]">
          <img
            src={post.image_url || "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200&q=80"}
            alt={post.title}
            className="w-full h-full object-cover"
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
                dangerouslySetInnerHTML={{ __html: post.content || "" }}
              />
            </div>
          </div>
        </section>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="section-padding bg-muted/50">
            <div className="container-custom">
              <h2 className="text-2xl font-display font-bold text-foreground mb-8">
                Artikel Lainnya
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <Link key={relatedPost.id} to={`/blog/${relatedPost.slug}`} className="group">
                    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-gold/30 transition-all">
                      <div className="h-40 overflow-hidden">
                        <img
                          src={relatedPost.image_url || "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=400&q=80"}
                          alt={relatedPost.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-foreground group-hover:text-gold transition-colors line-clamp-2">
                          {relatedPost.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {relatedPost.excerpt}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BlogDetail;
