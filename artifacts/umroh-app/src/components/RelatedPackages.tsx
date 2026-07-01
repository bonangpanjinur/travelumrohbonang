import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight } from "lucide-react";

interface RelatedPackage {
  id: string;
  title: string;
  slug: string;
  image_url: string | null;
  description: string | null;
  duration_days: number | null;
  category: { name: string } | null;
}

interface Props {
  /** Current package id to exclude from results */
  excludeId?: string;
  /** Preferred category id to match against */
  categoryId?: string | null;
  /** Optional heading override */
  heading?: string;
  /** Optional intro paragraph for SEO context */
  intro?: string;
  limit?: number;
}

/**
 * Auto-generated internal-link block of related packages.
 * Anchor text uses the full package title (keyword-rich) plus a descriptive
 * aria-label to strengthen on-page SEO via contextual internal linking.
 */
const RelatedPackages = ({
  excludeId,
  categoryId,
  heading = "Paket Umroh Terkait",
  intro = "Jelajahi pilihan paket umroh lain yang mungkin sesuai dengan kebutuhan ibadah dan anggaran Anda.",
  limit = 3,
}: Props) => {
  const [items, setItems] = useState<RelatedPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const baseSelect = `id, title, slug, image_url, description, duration_days, category:package_categories(name)`;

      let primary: RelatedPackage[] = [];
      if (categoryId) {
        const { data } = await supabase
          .from("packages")
          .select(baseSelect)
          .eq("is_active", true)
          .eq("category_id", categoryId)
          .neq("id", excludeId ?? "00000000-0000-0000-0000-000000000000")
          .limit(limit);
        primary = (data as unknown as RelatedPackage[]) || [];
      }

      if (primary.length < limit) {
        const need = limit - primary.length;
        const existingIds = primary.map((p) => p.id);
        const excludeIds = [
          ...(excludeId ? [excludeId] : []),
          ...existingIds,
        ];
        const { data } = await supabase
          .from("packages")
          .select(baseSelect)
          .eq("is_active", true)
          .not("id", "in", `(${excludeIds.length ? excludeIds.join(",") : "00000000-0000-0000-0000-000000000000"})`)
          .order("created_at", { ascending: false })
          .limit(need);
        primary = [...primary, ...((data as unknown as RelatedPackage[]) || [])];
      }

      setItems(primary);
      setLoading(false);
    };
    run();
  }, [categoryId, excludeId, limit]);

  if (loading || items.length === 0) return null;

  return (
    <section className="section-padding bg-muted/40" aria-labelledby="related-packages-heading">
      <div className="container-custom">
        <h2 id="related-packages-heading" className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
          {heading}
        </h2>
        <p className="text-muted-foreground mb-8 max-w-2xl">{intro}</p>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((p) => {
            const anchor = `${p.title}${p.category?.name ? ` — ${p.category.name}` : ""}`;
            return (
              <Link
                key={p.id}
                to={`/paket/${p.slug}`}
                className="group bg-card border border-border rounded-xl overflow-hidden hover:border-gold/40 transition-all"
                aria-label={`Lihat detail ${anchor}`}
                title={anchor}
              >
                <div className="h-40 overflow-hidden">
                  <img
                    src={p.image_url || "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=400&q=80"}
                    alt={`Paket ${p.title}`}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-foreground group-hover:text-gold transition-colors line-clamp-2">
                    {p.title}
                  </h3>
                  {p.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{p.description}</p>
                  )}
                  <span className="inline-flex items-center gap-1 text-sm text-gold mt-3 font-medium">
                    Lihat paket <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RelatedPackages;
