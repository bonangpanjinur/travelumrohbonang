import { useEffect } from "react";
import { captureReferralFromUrl } from "@/shared/lib/audit";
import Navbar from "@/shared/components/Navbar";
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
import Footer from "@/shared/components/Footer";
import FloatingButtons from "@/shared/components/FloatingButtons";
import SEO from "@/shared/components/SEO";
import LocalBusinessJsonLd from "@/shared/components/LocalBusinessJsonLd";

const Index = () => {
  useEffect(() => { captureReferralFromUrl(); }, []);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Berapa lama durasi umroh?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Durasi umroh bervariasi mulai dari 9 hari hingga 14 hari tergantung paket yang dipilih.",
        },
      },
      {
        "@type": "Question",
        name: "Apa saja yang termasuk dalam paket umroh?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Paket umroh kami sudah termasuk tiket pesawat PP, hotel bintang 5, makan 3x sehari, visa umroh, muthawif berpengalaman, dan asuransi perjalanan.",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen">
      <SEO
        title="Perjalanan Umroh Terbaik"
        description="Wujudkan ibadah umroh impian Anda dengan pelayanan terbaik, bimbingan ustadz berpengalaman, dan hotel bintang 5 dekat Masjidil Haram."
        jsonLd={faqJsonLd}
      />
      <LocalBusinessJsonLd />
      <Navbar />
      <main>
        <HeroSection />
        <ServicesSection />
        <PackagesPreview />
        <AboutSection />
        <GuideSection />
        <TestimonialsSection />
        <GallerySection />
        <BlogSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
      <FloatingButtons />
    </div>
  );
};

export default Index;
