import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Calendar, User, ArrowRight, Tag, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import SEO from "@/components/SEO";

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
}

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      const postsData = (data || []) as BlogPost[];
      setPosts(postsData);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(postsData.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories);
      
      setLoading(false);
    };

    fetchPosts();
  }, []);

  const filteredPosts = posts.filter(post => {
    const matchesSearch = !search || 
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.excerpt?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredPost = filteredPosts[0];
  const otherPosts = filteredPosts.slice(1);

  return (
    <div className="min-h-screen">
      <SEO
        title="Blog"
        description="Artikel dan tips seputar ibadah umroh, panduan perjalanan, dan informasi terkini dari UmrohPlus Travel."
      />
      
      <Navbar />
      <main className="pt-20">
        {/* Header */}
        <section className="bg-primary section-padding relative overflow-hidden">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 islamic-pattern pointer-events-none" />
          
          <div className="container-custom text-center relative z-10">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-5xl font-display font-bold text-primary-foreground mb-4"
            >
              Blog <span className="text-gradient-gold">UmrohPlus</span>
            </motion.h1>
            <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
              Artikel, tips, dan informasi seputar ibadah umroh
            </p>

            {/* Search */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Cari artikel..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 bg-card border-none h-12"
              />
            </div>
          </div>
        </section>

        {/* Categories */}
        {categories.length > 0 && (
          <section className="bg-muted/50 py-4">
            <div className="container-custom">
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Kategori:</span>
                <Badge 
                  variant={!selectedCategory ? "default" : "outline"}
                  className="cursor-pointer whitespace-nowrap"
                  onClick={() => setSelectedCategory(null)}
                >
                  Semua
                </Badge>
                {categories.map(cat => (
                  <Badge 
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Blog Content */}
        <section className="section-padding bg-background">
          <div className="container-custom">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">Belum ada artikel</p>
              </div>
            ) : (
              <>
                {/* Featured Post */}
                {featuredPost && (
                  <motion.article
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                  >
                    <Link to={`/blog/${featuredPost.slug}`} className="group block">
                      <div className="grid lg:grid-cols-2 gap-8 bg-card border border-border rounded-2xl overflow-hidden hover:border-gold/30 transition-all">
                        <div className="h-64 lg:h-auto overflow-hidden">
                          <img
                            src={featuredPost.image_url || "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800&q=80"}
                            alt={featuredPost.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-8 flex flex-col justify-center">
                          {featuredPost.category && (
                            <Badge variant="secondary" className="w-fit mb-4">
                              <Tag className="w-3 h-3 mr-1" />
                              {featuredPost.category}
                            </Badge>
                          )}
                          <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground group-hover:text-gold transition-colors">
                            {featuredPost.title}
                          </h2>
                          <p className="text-muted-foreground mt-4 line-clamp-3">
                            {featuredPost.excerpt}
                          </p>
                          <div className="flex items-center gap-4 mt-6 text-sm text-muted-foreground">
                            {featuredPost.author && (
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {featuredPost.author}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(featuredPost.published_at || featuredPost.created_at), "d MMMM yyyy", { locale: idLocale })}
                            </span>
                          </div>
                          <Button className="mt-6 w-fit gradient-gold text-primary">
                            Baca Selengkapnya
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    </Link>
                  </motion.article>
                )}

                {/* Other Posts Grid */}
                {otherPosts.length > 0 && (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {otherPosts.map((post, index) => (
                      <motion.article
                        key={post.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Link to={`/blog/${post.slug}`} className="group block">
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
                                <Badge variant="secondary" className="w-fit mb-3">
                                  {post.category}
                                </Badge>
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
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
