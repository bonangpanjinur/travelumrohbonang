import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, User } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  image_url: string;
  category: string;
  author: string;
  published_at: string;
  created_at: string;
}

const BlogSection = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, image_url, category, author, published_at, created_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(3);

      setPosts((data || []) as BlogPost[]);
      setLoading(false);
    };

    fetchPosts();
  }, []);

  if (loading) {
    return (
      <section className="section-padding bg-muted/50">
        <div className="container-custom">
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
          </div>
        </div>
      </section>
    );
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="section-padding bg-muted/50">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-sm font-semibold text-accent uppercase tracking-widest">
            Blog & Artikel
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mt-3">
            Berita <span className="text-gradient-gold">Terkini</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Tips dan informasi seputar perjalanan umroh
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={`/blog/${post.slug}`} className="group block h-full">
                <div className="bg-card border border-border rounded-2xl overflow-hidden hover:border-gold/30 hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                  <div className="h-48 overflow-hidden">
                    <img
                      src={post.image_url || "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=600&q=80"}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    {post.category && (
                      <span className="text-xs font-medium text-gold uppercase tracking-wider mb-2">
                        {post.category}
                      </span>
                    )}
                    <h3 className="text-lg font-display font-bold text-foreground group-hover:text-gold transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground text-sm mt-2 line-clamp-2 flex-1">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
                      {post.author && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {post.author}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(post.published_at || post.created_at), "d MMM yyyy", { locale: idLocale })}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link to="/blog">
            <Button variant="outline" size="lg" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              Lihat Semua Artikel
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
