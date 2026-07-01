import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Calendar } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  image_url: string | null;
  category: string | null;
  published_at: string | null;
  created_at: string;
}

interface Props {
  excludeId?: string;
  category?: string | null;
  heading?: string;
  intro?: string;
  limit?: number;
}

/**
 * Auto-generated internal-link block of related blog articles.
 * Picks posts from the same category first, then falls back to the most recent
 * published posts. Anchor uses post.title (keyword-rich) plus aria-label.
 */
const RelatedArticles = ({
  excludeId,
  category,
  heading = "Artikel Umroh Terkait",
  intro = "Baca panduan, tips, dan kisah inspiratif seputar perjalanan ibadah umroh.",
  limit = 3,
}: Props) => {
  const [items, setItems] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const baseSelect = "id, title, slug, excerpt, image_url, category, published_at, created_at";

      let primary: RelatedArticle[] = [];
      if (category) {
        const { data } = await supabase
          .from("blog_posts")
          .select(baseSelect)
          .eq("is_published", true)
          .eq("category", category)
          .neq("id", excludeId ?? "00000000-0000-0000-0000-000000000000")
          .order("published_at", { ascending: false })
          .limit(limit);
        primary = (data as unknown as RelatedArticle[]) || [];
      }

      if (primary.length < limit) {
        const need = limit - primary.length;
        const excludeIds = [
          ...(excludeId ? [excludeId] : []),
          ...primary.map((p) => p.id),
        ];
        const { data } = await supabase
          .from("blog_posts")
          .select(baseSelect)
          .eq("is_published", true)
          .not("id", "in", `(${excludeIds.length ? excludeIds.join(",") : "00000000-0000-0000-0000-000000000000"})`)
          .order("published_at", { ascending: false })
          .limit(need);
        primary = [...primary, ...((data as unknown as RelatedArticle[]) || [])];
      }

      setItems(primary);
      setLoading(false);
    };
    run();
  }, [category, excludeId, limit]);

  if (loading || items.length === 0) return null;

  return (
    <section className="section-padding" aria-labelledby="related-articles-heading">
      <div className="container-custom">
        <h2 id="related-articles-heading" className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
          {heading}
        </h2>
        <p className="text-muted-foreground mb-8 max-w-2xl">{intro}</p>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((post) => {
            const date = post.published_at || post.created_at;
            return (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group bg-card border border-border rounded-xl overflow-hidden hover:border-gold/40 transition-all"
                aria-label={`Baca artikel: ${post.title}`}
                title={post.title}
              >
                <div className="h-40 overflow-hidden">
                  <img
                    src={post.image_url || "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=400&q=80"}
                    alt={post.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  {post.category && (
                    <span className="text-xs uppercase tracking-wide text-gold font-semibold">
                      {post.category}
                    </span>
                  )}
                  <h3 className="font-semibold text-foreground group-hover:text-gold transition-colors line-clamp-2 mt-1">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{post.excerpt}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    {date && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(date), "d MMM yyyy", { locale: idLocale })}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-sm text-gold font-medium">
                      Baca <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RelatedArticles;
