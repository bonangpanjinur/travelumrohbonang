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

type FrontendTheme = "classic" | "modern" | "premium";

function useFrontendTheme(): FrontendTheme {
  const [theme, setTheme] = useState<FrontendTheme>("classic");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("category", "appearance").eq("key", "template").maybeSingle();
      if (cancelled) return;
      const value = data?.value as { active_template?: string } | null;
      const active = value?.active_template;
      setTheme(active === "modern" || active === "premium" ? active : "classic");
    };
    load();
    const channel = supabase.channel("frontend-template-selection").on("postgres_changes", { event: "*", schema: "public", table: "site_settings", filter: "category=eq.appearance" }, load).subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, []);

  return theme;
}

export default function FrontendThemeHome() {
  const theme = useFrontendTheme();

  if (theme === "modern") {
    return <main className="bg-slate-50"><div className="bg-slate-950 text-white"><HeroSection /></div><PackagesPreview /><ServicesSection /><div className="bg-white"><AboutSection /></div><GuideSection /><div className="bg-slate-100"><GallerySection /></div><BlogSection /><TestimonialsSection /><FAQSection /><div className="bg-slate-950 text-white"><CTASection /></div></main>;
  }

  if (theme === "premium") {
    return <main className="bg-[#fbf8f4]"><div className="bg-[#151126] text-white"><HeroSection /></div><PackagesPreview /><div className="bg-[#f4eee7]"><AboutSection /></div><ServicesSection /><TestimonialsSection /><div className="bg-[#eee7df]"><GallerySection /></div><GuideSection /><BlogSection /><FAQSection /><div className="bg-[#151126] text-white"><CTASection /></div></main>;
  }

  return <main className="bg-background"><HeroSection /><ServicesSection /><PackagesPreview /><AboutSection /><GuideSection /><TestimonialsSection /><GallerySection /><BlogSection /><FAQSection /><CTASection /></main>;
}
