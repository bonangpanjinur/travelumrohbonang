import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/shared/integrations/supabase/client";
import { useAuth } from "@/shared/hooks/useAuth";
import Navbar from "@/shared/components/Navbar";
import Footer from "@/shared/components/Footer";
import SEO from "@/shared/components/SEO";
import WishlistButton from "@/features/paket/components/WishlistButton";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

export default function Wishlist() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("wishlists")
        .select("package_id, packages(id, title, slug, image_url, duration_days, package_type)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setItems((data || []).filter((r: any) => r.packages));
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen">
      <SEO title="Wishlist Saya" noIndex />
      <Navbar />
      <main className="pt-24 container-custom section-padding">
        <h1 className="text-3xl font-display font-bold mb-8 flex items-center gap-2">
          <Heart className="text-destructive" /> Wishlist Saya
        </h1>
        {authLoading || loading ? (
          <p className="text-muted-foreground">Memuat…</p>
        ) : !user ? (
          <div className="text-center py-16">
            <p className="mb-4 text-muted-foreground">Login untuk melihat wishlist.</p>
            <Link to="/auth"><Button>Login</Button></Link>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="mb-4 text-muted-foreground">Belum ada paket di wishlist.</p>
            <Link to="/paket"><Button>Jelajahi Paket</Button></Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((it: any) => (
              <div key={it.package_id} className="bg-card border border-border rounded-xl overflow-hidden group">
                <Link to={`/paket/${it.packages.slug}`}>
                  <img src={it.packages.image_url} alt={it.packages.title} className="w-full h-48 object-cover" loading="lazy" />
                </Link>
                <div className="p-4 flex items-start justify-between gap-2">
                  <div>
                    <Link to={`/paket/${it.packages.slug}`}>
                      <h3 className="font-bold hover:text-gold transition">{it.packages.title}</h3>
                    </Link>
                    <p className="text-sm text-muted-foreground">{it.packages.duration_days} hari · {it.packages.package_type}</p>
                  </div>
                  <WishlistButton packageId={it.packages.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
