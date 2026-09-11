import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  MapPin,
  Phone,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
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

  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const whatsappHref = agent?.phone
    ? `https://wa.me/${agent.phone.replace(/\D/g, "").replace(/^0/, "62")}?text=${encodeURIComponent(`Halo ${agent.name}, saya ingin bertanya tentang paket umroh.`)}`
    : null;

  const copyPageLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: agent ? `Profil ${agent.name}` : "Profil Agen", url: pageUrl });
        return;
      } catch {
        // User cancelled native share; continue without showing an error.
      }
    }
    await navigator.clipboard.writeText(pageUrl);
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
    url: pageUrl,
    worksFor: { "@type": "TravelAgency", name: "Umroh Plus" },
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#faf9f7]">
      <SEO title={pageTitle} description={pageDescription} url={pageUrl} jsonLd={jsonLd} />
      <Navbar />
      <main>
        <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(219,165,45,0.24),transparent_28%),radial-gradient(circle_at_6%_95%,rgba(255,255,255,0.10),transparent_30%)]" />
          <div className="absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full border border-gold/20" />
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-gold/10" />
          <div className="container relative max-w-6xl px-4 pb-10 pt-24 sm:px-6 sm:pb-12 sm:pt-28 md:py-20 lg:px-8 lg:py-24">
            <div className="grid min-w-0 items-center gap-7 lg:grid-cols-[220px_1fr] lg:gap-14">
              <div className="relative mx-auto lg:mx-0">
                <div className="absolute -inset-3 rounded-full border border-gold/35" />
                <div className="absolute -inset-6 rounded-full border border-white/10" />
                {agent.photoUrl ? <img src={agent.photoUrl} alt={`Foto ${agent.name}`} className="relative h-32 w-32 rounded-full border-[4px] border-gold object-cover shadow-2xl sm:h-40 sm:w-40 md:h-52 md:w-52 md:border-[5px]" /> : <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-[4px] border-gold bg-white/10 text-5xl font-display font-bold text-gold shadow-2xl sm:h-40 sm:w-40 md:h-52 md:w-52 md:border-[5px] md:text-6xl">{agent.name.charAt(0).toUpperCase()}</div>}
                <div className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center whitespace-nowrap rounded-full border border-gold/30 bg-primary px-2.5 py-1.5 text-[10px] font-semibold text-gold shadow-lg sm:px-3 sm:text-xs"><ShieldCheck className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-3.5 sm:w-3.5" /> Agen Terverifikasi</div>
              </div>
              <div className="min-w-0 max-w-3xl text-center lg:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 lg:justify-start"><Badge className="border-0 bg-gold text-xs text-primary"><ShieldCheck className="mr-1 h-3.5 w-3.5" /> {agent.status}</Badge><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-light sm:text-xs sm:tracking-[0.25em]">Profil Mitra Resmi</span></div>
                <h1 className="mt-4 break-words text-4xl font-display font-bold leading-[1.05] tracking-tight sm:text-5xl md:mt-5 md:text-6xl lg:text-7xl">{agent.name}</h1>
                <p className="mx-auto mt-4 max-w-2xl break-words text-[15px] leading-relaxed text-primary-foreground/78 sm:text-base md:mt-5 md:text-xl lg:mx-0">{pageDescription}</p>
                <div className="mt-6 flex w-full flex-col justify-center gap-3 sm:mt-8 sm:flex-row lg:justify-start">
                  <Button asChild size="lg" className="w-full gradient-gold text-primary shadow-lg shadow-black/15 sm:w-auto"><Link to={bookingHref}>Lihat Paket Umroh <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                  {whatsappHref ? <Button asChild size="lg" variant="outline" className="w-full border-white/30 bg-transparent text-white hover:border-white/60 hover:bg-white/10 sm:w-auto"><a href={whatsappHref} target="_blank" rel="noreferrer"><Phone className="mr-2 h-4 w-4" /> Hubungi Agen</a></Button> : <Button size="lg" variant="outline" className="w-full border-white/30 bg-transparent text-white hover:border-white/60 hover:bg-white/10 sm:w-auto" onClick={copyPageLink}>{copied ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Share2 className="mr-2 h-4 w-4" />}{copied ? "Link Tersalin" : "Bagikan Profil"}</Button>}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container relative z-10 max-w-6xl px-4 py-8 sm:px-6 sm:py-10 md:py-16 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
            <div className="min-w-0 rounded-3xl border border-border/80 bg-card p-4 shadow-sm sm:p-6 md:p-9">
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Informasi Agen</p><h2 className="mt-2 text-2xl font-display font-bold md:text-3xl">Temui mitra resmi kami</h2></div><div className="rounded-2xl bg-primary/8 p-3 text-primary"><Sparkles className="h-5 w-5" /></div></div>
              <div className="mt-7 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-muted/55 p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> Status</div><p className="mt-2 font-semibold">{agent.status}</p></div><div className="rounded-2xl bg-muted/55 p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="font-mono text-primary">#</span> Kode Agen</div><p className="mt-2 font-mono font-semibold">{agent.agentCode || "-"}</p></div></div>
              <div className="mt-6 divide-y divide-border/70 rounded-2xl border border-border/70 px-4"><div className="flex items-start gap-3 py-4">{agent.phone ? <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> : <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />}<span><span className="block text-xs text-muted-foreground">{agent.phone ? "Nomor Telepon" : "Mitra Resmi"}</span>{agent.phone ? <a href={`tel:${agent.phone}`} className="font-semibold transition-colors hover:text-primary">{agent.phone}</a> : <span className="font-semibold">Pendamping perjalanan ibadah Anda</span>}</span></div>{displayAddress && <div className="flex items-start gap-3 py-4"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span><span className="block text-xs text-muted-foreground">Alamat</span><span className="font-semibold leading-relaxed">{displayAddress}</span></span></div>}</div>
            </div>

            <div className="rounded-3xl border border-primary/10 bg-white p-4 shadow-sm sm:p-6 md:p-9"><p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Afiliasi</p><h2 className="mt-2 text-2xl font-display font-bold md:text-3xl">Siap berangkat bersama?</h2><p className="mt-3 leading-relaxed text-muted-foreground">Dapatkan bantuan memilih paket yang sesuai dari agen resmi kami.</p><div className="mt-8 space-y-4">{agent.branch && <div className="flex items-start gap-3 rounded-2xl bg-muted/55 p-4"><Building2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span><span className="block text-xs text-muted-foreground">Cabang</span><span className="font-semibold">{agent.branch.code ? `${agent.branch.code} — ` : ""}{agent.branch.name || "Pusat"}</span>{branchAddress && <span className="mt-1 block text-sm text-muted-foreground">{branchAddress}</span>}</span></div>}{agent.branch?.mapUrl && <a href={agent.branch.mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm font-semibold text-primary hover:underline">Buka lokasi cabang <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></a>}<Button asChild size="lg" className="mt-2 w-full gradient-gold text-primary"><Link to={bookingHref}>Jelajahi Paket Umroh <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>{whatsappHref && <Button asChild size="lg" variant="outline" className="w-full"><a href={whatsappHref} target="_blank" rel="noreferrer"><Phone className="mr-2 h-4 w-4" /> Chat via WhatsApp</a></Button>}<button type="button" onClick={copyPageLink} className="flex min-h-11 w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">{copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Link profil tersalin" : "Bagikan profil ini"}</button></div></div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PublicAgentProfile;
