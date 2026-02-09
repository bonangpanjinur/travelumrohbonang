import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import AboutSection from "@/components/AboutSection";
import PackagesPreview from "@/components/PackagesPreview";
import GuideSection from "@/components/GuideSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import GallerySection from "@/components/GallerySection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import FloatingButtons from "@/components/FloatingButtons";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <HeroSection />
        <ServicesSection />
        <PackagesPreview />
        <AboutSection />
        <GuideSection />
        <TestimonialsSection />
        <GallerySection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
      <FloatingButtons />
    </div>
  );
};

export default Index;
