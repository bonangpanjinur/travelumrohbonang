import { useEffect, useState } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import { useAuth } from "@/shared/hooks/useAuth";
import { Helmet } from "react-helmet-async";
import { Star } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Input } from "@/shared/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  created_at: string;
  user_id: string;
  is_approved: boolean;
  profiles?: { full_name: string | null } | null;
}

export default function PackageReviews({ packageId, packageTitle }: { packageId: string; packageTitle: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("package_reviews")
      .select("*, profiles(full_name)")
      .eq("package_id", packageId)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(50);
    setReviews((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [packageId]);

  const approved = reviews;
  const avg = approved.length ? approved.reduce((s, r) => s + r.rating, 0) / approved.length : 0;

  const submit = async () => {
    if (!user) { toast.info("Login dulu untuk memberi ulasan"); return; }
    if (!comment.trim()) { toast.error("Komentar wajib diisi"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("package_reviews").insert({
      package_id: packageId, user_id: user.id, rating, title: title || null, comment,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Ulasan dikirim, menunggu moderasi admin.");
    setTitle(""); setComment(""); setRating(5);
  };

  return (
    <section className="space-y-4">
      {approved.length > 0 && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: packageTitle,
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: avg.toFixed(1),
              reviewCount: approved.length,
            },
            review: approved.slice(0, 5).map(r => ({
              "@type": "Review",
              reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
              author: { "@type": "Person", name: r.profiles?.full_name || "Jamaah" },
              datePublished: r.created_at,
              reviewBody: r.comment || "",
            })),
          })}</script>
        </Helmet>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">Ulasan Jamaah</h2>
        {approved.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className={`w-4 h-4 ${i <= Math.round(avg) ? "fill-gold text-gold" : "text-muted"}`} />
              ))}
            </div>
            <span className="text-sm font-medium">{avg.toFixed(1)} ({approved.length})</span>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Memuat ulasan…</p>
      ) : approved.length === 0 ? (
        <p className="text-muted-foreground text-sm">Belum ada ulasan. Jadilah yang pertama.</p>
      ) : (
        <div className="space-y-3">
          {approved.map(r => (
            <article key={r.id} className="bg-card border border-border rounded-xl p-4">
              <header className="flex items-center justify-between mb-1">
                <div className="font-semibold text-sm">{r.profiles?.full_name || "Jamaah"}</div>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`w-3 h-3 ${i <= r.rating ? "fill-gold text-gold" : "text-muted"}`} />
                  ))}
                </div>
              </header>
              {r.title && <h3 className="font-medium">{r.title}</h3>}
              {r.comment && <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>}
              <time className="text-xs text-muted-foreground mt-2 block">{format(new Date(r.created_at), "dd MMM yyyy")}</time>
            </article>
          ))}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-bold">Tulis Ulasan</h3>
        {!user ? (
          <p className="text-sm text-muted-foreground">Login untuk memberi ulasan.</p>
        ) : (
          <>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(i => (
                <button key={i} onClick={() => setRating(i)} aria-label={`Beri ${i} bintang`}>
                  <Star className={`w-6 h-6 ${i <= rating ? "fill-gold text-gold" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <Input placeholder="Judul (opsional)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="Bagikan pengalaman umroh Anda…" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
            <Button onClick={submit} disabled={submitting} className="gradient-gold text-primary">
              {submitting ? "Mengirim…" : "Kirim Ulasan"}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
