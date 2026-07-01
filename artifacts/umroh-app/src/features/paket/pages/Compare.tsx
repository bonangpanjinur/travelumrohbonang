import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/shared/integrations/supabase/client";
import Navbar from "@/shared/components/layout/Navbar";
import Footer from "@/shared/components/layout/Footer";
import SEO from "@/shared/components/seo/SEO";
import { Button } from "@/shared/components/ui/button";
import { Check, X } from "lucide-react";
import { useCurrency } from "@/shared/hooks/useCurrency";

interface Pkg {
  id: string; title: string; slug: string; image_url: string; duration_days: number;
  package_type: string; description: string | null;
  hotel_makkah?: { name: string; star: number } | null;
  hotel_madinah?: { name: string; star: number } | null;
  airline?: { name: string } | null;
  airport?: { city: string } | null;
  min_price?: number;
}

export default function Compare() {
  const { format: formatPrice } = useCurrency();
  const [params, setParams] = useSearchParams();
  const slugs = useMemo(() => (params.get("ids") || "").split(",").filter(Boolean).slice(0, 3), [params]);
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [allPkgs, setAllPkgs] = useState<{id:string;title:string;slug:string}[]>([]);

  useEffect(() => {
    supabase.from("packages").select("id,title,slug").eq("is_active", true).order("title").then(({ data }) => {
      setAllPkgs(data || []);
    });
  }, []);

  useEffect(() => {
    if (slugs.length === 0) { setPkgs([]); return; }
    (async () => {
      const { data } = await supabase
        .from("packages")
        .select(`id, title, slug, image_url, duration_days, package_type, description,
          hotel_makkah:hotels!packages_hotel_makkah_id_fkey(name, star),
          hotel_madinah:hotels!packages_hotel_madinah_id_fkey(name, star),
          airline:airlines(name),
          airport:airports(city)`)
        .in("slug", slugs);
      const list = (data as any) || [];
      const ids = list.map((p: any) => p.id);
      const { data: dep } = await supabase.from("package_departures").select("package_id, departure_prices(price)").in("package_id", ids);
      const priceMap = new Map<string, number>();
      (dep || []).forEach((d: any) => {
        const prices = (d.departure_prices || []).map((p: any) => p.price);
        if (prices.length) {
          const min = Math.min(...prices);
          if (!priceMap.has(d.package_id) || priceMap.get(d.package_id)! > min) priceMap.set(d.package_id, min);
        }
      });
      setPkgs(list.map((p: any) => ({ ...p, min_price: priceMap.get(p.id) })));
    })();
  }, [slugs.join(",")]);

  const addSlug = (slug: string) => {
    if (!slug || slugs.includes(slug) || slugs.length >= 3) return;
    setParams({ ids: [...slugs, slug].join(",") });
  };
  const removeSlug = (slug: string) => {
    setParams({ ids: slugs.filter(s => s !== slug).join(",") });
  };

  return (
    <div className="min-h-screen">
      <SEO title="Bandingkan Paket Umroh" description="Bandingkan hingga 3 paket umroh berdampingan: harga, hotel, durasi, dan fasilitas." />
      <Navbar />
      <main className="pt-24 container-custom section-padding">
        <h1 className="text-3xl font-display font-bold mb-2">Bandingkan Paket</h1>
        <p className="text-muted-foreground mb-8">Pilih hingga 3 paket untuk dibandingkan berdampingan.</p>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <select
            className="bg-card border border-border rounded-md px-3 py-2 text-sm"
            onChange={(e) => { addSlug(e.target.value); e.currentTarget.value = ""; }}
            defaultValue=""
            disabled={slugs.length >= 3}
          >
            <option value="">+ Tambah paket{slugs.length >= 3 ? " (maks 3)" : ""}…</option>
            {allPkgs.filter(p => !slugs.includes(p.slug)).map(p => (
              <option key={p.id} value={p.slug}>{p.title}</option>
            ))}
          </select>
        </div>

        {pkgs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">Belum ada paket dipilih.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[700px]">
              <thead>
                <tr>
                  <th className="text-left p-3"></th>
                  {pkgs.map(p => (
                    <th key={p.id} className="p-3 align-top text-left min-w-[220px]">
                      <div className="relative">
                        <button onClick={() => removeSlug(p.slug)} className="absolute top-0 right-0 text-muted-foreground hover:text-destructive" aria-label="Hapus">
                          <X className="w-4 h-4" />
                        </button>
                        <img src={p.image_url} alt={p.title} className="w-full h-32 object-cover rounded-lg mb-2" loading="lazy" />
                        <Link to={`/paket/${p.slug}`} className="font-bold hover:text-gold">{p.title}</Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm">
                <Row label="Harga mulai" values={pkgs.map(p => p.min_price ? formatPrice(p.min_price) : "—")} />
                <Row label="Durasi" values={pkgs.map(p => `${p.duration_days} hari`)} />
                <Row label="Tipe" values={pkgs.map(p => p.package_type)} />
                <Row label="Hotel Makkah" values={pkgs.map(p => p.hotel_makkah ? `${p.hotel_makkah.name} (${p.hotel_makkah.star}★)` : "—")} />
                <Row label="Hotel Madinah" values={pkgs.map(p => p.hotel_madinah ? `${p.hotel_madinah.name} (${p.hotel_madinah.star}★)` : "—")} />
                <Row label="Maskapai" values={pkgs.map(p => p.airline?.name || "—")} />
                <Row label="Keberangkatan" values={pkgs.map(p => p.airport?.city || "—")} />
                <tr>
                  <td className="p-3 font-medium bg-muted/30">Aksi</td>
                  {pkgs.map(p => (
                    <td key={p.id} className="p-3 bg-muted/30">
                      <Link to={`/paket/${p.slug}`}>
                        <Button size="sm" className="gradient-gold text-primary"><Check className="w-3 h-3 mr-1" /> Pilih Paket</Button>
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Row({ label, values }: { label: string; values: (string | number)[] }) {
  return (
    <tr className="border-t border-border">
      <td className="p-3 font-medium bg-muted/20 w-40">{label}</td>
      {values.map((v, i) => <td key={i} className="p-3">{v}</td>)}
    </tr>
  );
}
