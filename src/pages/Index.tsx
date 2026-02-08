import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import AboutSection from "@/components/AboutSection";
import PackagesPreview from "@/components/PackagesPreview";
import GuideSection from "@/components/GuideSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import GallerySection from "@/components/GallerySection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

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
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
