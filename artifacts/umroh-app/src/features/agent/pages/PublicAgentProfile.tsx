import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapPin, Phone, ArrowRight, ShieldCheck, Building2, Copy, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/shared/lib/apiClient";
import SEO from "@/shared/components/seo/SEO";
import Navbar from "@/shared/components/layout/Navbar";
import Footer from "@/shared/components/layout/Footer";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";

interface PublicAgent {
  id: string;
  name: string;
  gender: string | null;
  address: string | null;
  phone: string | null;
  photoUrl: string | null;
  agentCode: string | null;
  referralCode?: string | null;
  publicSlug: string;
  publicDescription: string | null;
  status: string;
  branch: {
    id: string;
    code: string | null;
    name: string | null;
    address: string | null;
    city: string | null;
    region: string | null;
    phone: string | null;
    mapUrl: string | null;
  } | null;
}

const PublicAgentProfile = () => {
  const { slug } = useParams<{ slug: string }>();
  const [agent, setAgent] = useState<PublicAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      try {
        const data = await apiFetch<PublicAgent>(`/api/agents/${encodeURIComponent(slug)}`);
        if (active) setAgent(data);
      } catch {
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [slug]);

  const bookingHref = useMemo(() => {
    if (!agent?.referralCode) return "/paket";
    return `/r/${encodeURIComponent(agent.referralCode)}?to=${encodeURIComponent("/paket")}`;
  }, [agent?.referralCode]);

  const copyPageLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  }

  if (notFound || !agent) {
    return <div className="min-h-screen bg-background"><Navbar /><main className="container min-h-[55vh] flex items-center justify-center py-20"><div className="text-center"><p className="text-sm uppercase tracking-[0.22em] text-primary font-semibold">Halaman tidak tersedia</p><h1 className="text-3xl font-display font-bold mt-3">Profil agen tidak ditemukan</h1><p className="text-muted-foreground mt-3 max-w-md">Link mungkin sudah tidak aktif atau halaman agen belum dipublikasikan.</p><Button asChild className="mt-6 gradient-gold text-primary"><Link to="/">Kembali ke Beranda</Link></Button></div></main><Footer /></div>;
  }

  const branchAddress = [agent.branch?.address, agent.branch?.city, agent.branch?.region].filter(Boolean).join(", ");
  const displayAddress = agent.address || branchAddress;
  const pageTitle = `${agent.name} — Agen Resmi`;
  const pageDescription = agent.publicDescription || `Hubungi ${agent.name}, agen resmi untuk informasi paket perjalanan ibadah umroh.`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: agent.name,
    jobTitle: agent.status,
    telephone: agent.phone || undefined,
    image: agent.photoUrl || undefined,
    address: displayAddress ? { "@type": "PostalAddress", streetAddress: displayAddress } : undefined,
    url: window.location.href,
    worksFor: { "@type": "TravelAgency", name: "Umroh Plus" },
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title={pageTitle} description={pageDescription} url={window.location.href} jsonLd={jsonLd} />
      <Navbar />
      <main>
        <section className="relative overflow-hidden border-b border-border bg-primary text-primary-foreground">
          <div className="absolute -right-28 -top-32 h-80 w-80 rounded-full bg-gold/20 blur-3xl" />
          <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="container relative py-14 md:py-20">
            <div className="flex flex-col md:flex-row md:items-center gap-8">
              <div className="shrink-0">{agent.photoUrl ? <img src={agent.photoUrl} alt={`Foto ${agent.name}`} className="h-32 w-32 md:h-40 md:w-40 rounded-full object-cover border-4 border-gold/70 shadow-2xl" /> : <div className="h-32 w-32 md:h-40 md:w-40 rounded-full bg-white/10 border-4 border-gold/70 flex items-center justify-center text-5xl font-display font-bold text-gold">{agent.name.charAt(0).toUpperCase()}</div>}</div>
            <div className="max-w-3xl">
              <Badge className="bg-gold text-primary border-0"><ShieldCheck className="w-3.5 h-3.5 mr-1" /> {agent.status}</Badge>
              <p className="mt-5 text-sm uppercase tracking-[0.28em] text-gold-light">Profil Mitra Vins Tour</p>
              <h1 className="mt-3 text-4xl md:text-6xl font-display font-bold leading-[1.05]">{agent.name}</h1>
              <p className="mt-5 text-primary-foreground/75 text-lg max-w-xl leading-relaxed">{pageDescription}</p>
              <div className="flex flex-wrap gap-3 mt-8"><Button asChild className="gradient-gold text-primary"><Link to={bookingHref}>Lihat Paket Umroh <ArrowRight className="w-4 h-4 ml-2" /></Link></Button><Button variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" onClick={copyPageLink}>{copied ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}{copied ? "Link Tersalin" : "Bagikan Profil"}</Button></div>
            </div></div>
          </div>
        </section>

        <section className="container py-10 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 md:gap-8">
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Informasi Agen</p>
              <h2 className="text-2xl font-display font-bold mt-2">Temui mitra resmi kami</h2>
              <div className="grid sm:grid-cols-2 gap-4 mt-7">
                <div className="rounded-xl bg-muted/50 p-4"><div className="flex items-center gap-2 text-muted-foreground text-sm"><ShieldCheck className="w-4 h-4 text-primary" /> Status</div><p className="font-semibold mt-2">{agent.status}</p></div>
                <div className="rounded-xl bg-muted/50 p-4"><div className="flex items-center gap-2 text-muted-foreground text-sm"><span className="font-mono text-primary">#</span> Kode Agen</div><p className="font-mono font-semibold mt-2">{agent.agentCode || "-"}</p></div>
              </div>
              <div className="mt-5 space-y-4">
                {agent.phone && <a href={`tel:${agent.phone}`} className="flex items-start gap-3 group"><Phone className="w-5 h-5 text-primary mt-0.5" /><span><span className="block text-xs text-muted-foreground">Nomor Telepon</span><span className="font-semibold group-hover:text-primary transition-colors">{agent.phone}</span></span></a>}
                {displayAddress && <div className="flex items-start gap-3"><MapPin className="w-5 h-5 text-primary mt-0.5" /><span><span className="block text-xs text-muted-foreground">Alamat</span><span className="font-semibold leading-relaxed">{displayAddress}</span></span></div>}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm flex flex-col justify-between">
              <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Afiliasi</p><h2 className="text-2xl font-display font-bold mt-2">Butuh bantuan memilih paket?</h2><p className="text-muted-foreground mt-3 leading-relaxed">Hubungi agen ini untuk mendapatkan informasi dan pendampingan sebelum booking.</p></div>
              <div className="mt-8 space-y-3">{agent.branch && <div className="flex items-start gap-3 text-sm"><Building2 className="w-5 h-5 text-primary mt-0.5" /><span><span className="block text-xs text-muted-foreground">Cabang</span><span className="font-semibold">{agent.branch.code ? `${agent.branch.code} — ` : ""}{agent.branch.name || "Pusat"}</span>{branchAddress && <span className="block text-muted-foreground mt-1">{branchAddress}</span>}</span></div>}{agent.branch?.mapUrl && <a href={agent.branch.mapUrl} target="_blank" rel="noreferrer" className="inline-flex text-sm text-primary hover:underline">Buka lokasi cabang <ArrowRight className="w-4 h-4 ml-1" /></a>}<Button asChild className="w-full gradient-gold text-primary mt-2"><Link to={bookingHref}>Jelajahi Paket Umroh <ArrowRight className="w-4 h-4 ml-2" /></Link></Button></div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PublicAgentProfile;
