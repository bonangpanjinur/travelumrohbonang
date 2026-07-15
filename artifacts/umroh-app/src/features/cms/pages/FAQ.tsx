import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/integrations/supabase/client";
import Navbar from "@/shared/components/layout/Navbar";
import Footer from "@/shared/components/layout/Footer";
import FloatingButtons from "@/shared/components/common/FloatingButtons";
import SEO from "@/shared/components/seo/SEO";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { HelpCircle, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

const FAQPage = () => {
  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["faqs-page"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faqs")
        .select("*")
        .eq("is_active", true)
        .is("package_id", null)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as FAQ[];
    },
  });

  return (
    <div className="min-h-screen">
      <SEO
        title="FAQ — Pertanyaan yang Sering Diajukan"
        description="Temukan jawaban atas pertanyaan umum seputar layanan umroh UmrohPlus — dari paket, pembayaran, visa, hingga tips perjalanan."
      />
      <Navbar />

      {/* Hero */}
      <section className="relative bg-primary py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 20px,
                rgba(255,255,255,0.15) 20px,
                rgba(255,255,255,0.15) 40px
              )`,
            }}
          />
        </div>
        <div className="container-custom px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-4">
            <HelpCircle className="w-4 h-4 text-gold" />
            <span className="text-sm font-medium text-gold">Bantuan & Informasi</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            Pertanyaan yang Sering{" "}
            <span className="text-gold">Diajukan</span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Temukan jawaban atas pertanyaan umum seputar layanan umroh kami
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-20 bg-background">
        <div className="container-custom px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            ) : faqs.length === 0 ? (
              <div className="text-center py-16">
                <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Belum ada FAQ tersedia</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq) => (
                  <AccordionItem
                    key={faq.id}
                    value={faq.id}
                    className="bg-card border border-border rounded-xl px-6 shadow-sm"
                  >
                    <AccordionTrigger className="text-left font-semibold text-foreground hover:text-gold hover:no-underline py-5">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

            {/* CTA */}
            <div className="mt-16 bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center">
              <MessageCircle className="w-10 h-10 text-gold mx-auto mb-4" />
              <h3 className="font-display text-2xl font-bold text-foreground mb-2">
                Masih Ada Pertanyaan?
              </h3>
              <p className="text-muted-foreground mb-6">
                Tim kami siap membantu Anda 24 jam via WhatsApp
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="https://wa.me/6281212345678?text=Halo%20UmrohPlus%2C%20saya%20ingin%20bertanya"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full font-semibold transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  Chat WhatsApp
                </a>
                <Link
                  to="/paket"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-full font-semibold transition-colors"
                >
                  Lihat Paket Umroh
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <FloatingButtons />
    </div>
  );
};

export default FAQPage;
