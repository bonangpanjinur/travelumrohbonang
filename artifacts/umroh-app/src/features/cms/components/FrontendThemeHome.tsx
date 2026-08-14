import { useEffect, useState } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import HeroSection from "@/features/cms/components/HeroSection";
import ServicesSection from "@/features/cms/components/ServicesSection";
import AboutSection from "@/features/cms/components/AboutSection";
import PackagesPreview from "@/features/paket/components/PackagesPreview";
import GuideSection from "@/features/cms/components/GuideSection";
import TestimonialsSection from "@/features/cms/components/TestimonialsSection";
import GallerySection from "@/features/cms/components/GallerySection";
import BlogSection from "@/features/cms/components/BlogSection";
import FAQSection from "@/features/cms/components/FAQSection";
import CTASection from "@/features/cms/components/CTASection";

type FrontendLayout = "classic-home" | "conversion-home" | "story-home";

function useFrontendLayout(): FrontendLayout {
  const [layout, setLayout] = useState<FrontendLayout>("classic-home");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("category", "appearance").eq("key", "template").maybeSingle();
      if (cancelled) return;
      const value = data?.value as { active_layout?: string } | null;
      const active = value?.active_layout;
      setLayout(active === "conversion-home" || active === "story-home" ? active : "classic-home");
    };
    load();
    const channel = supabase.channel("frontend-template-selection").on("postgres_changes", { event: "*", schema: "public", table: "site_settings", filter: "category=eq.appearance" }, load).subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, []);

  return layout;
}

export default function FrontendThemeHome() {
  const layout = useFrontendLayout();

  if (layout === "conversion-home") {
    return <main className="bg-slate-50"><div className="bg-slate-950 text-white"><HeroSection /></div><PackagesPreview /><CTASection /><ServicesSection /><div className="bg-white"><AboutSection /></div><TestimonialsSection /><FAQSection /><GuideSection /><GallerySection /><BlogSection /></main>;
  }

  if (layout === "story-home") {
    return <main className="bg-[#fbf8f4]"><div className="bg-emerald-950 text-white"><HeroSection /></div><AboutSection /><ServicesSection /><div className="bg-[#f4eee7]"><TestimonialsSection /></div><GallerySection /><GuideSection /><PackagesPreview /><BlogSection /><FAQSection /><CTASection /></main>;
  }

  return <main className="bg-background"><HeroSection /><ServicesSection /><PackagesPreview /><AboutSection /><GuideSection /><TestimonialsSection /><GallerySection /><BlogSection /><FAQSection /><CTASection /></main>;
}
