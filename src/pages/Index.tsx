import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import AboutSection from "@/components/AboutSection";
import PackagesPreview from "@/components/PackagesPreview";
import GuideSection from "@/components/GuideSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import GallerySection from "@/components/GallerySection";
import BlogSection from "@/components/BlogSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import FloatingButtons from "@/components/FloatingButtons";
import SEO from "@/components/SEO";

const Index = () => {
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
