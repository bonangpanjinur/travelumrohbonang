import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/shared/integrations/supabase/client";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { HelpCircle } from "lucide-react";

interface PageFAQProps {
  /** Daftar scope yang ingin diambil. Contoh: ['paket'] atau ['package','general'] */
  scopes: ("general" | "paket" | "package")[];
  /** Jika diisi, akan menambah FAQ spesifik paket ini juga. */
  packageId?: string;
  title?: string;
  description?: string;
  className?: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  scope: string;
  package_id: string | null;
  sort_order: number | null;
}

export default function PageFAQ({
  scopes,
  packageId,
  title = "Pertanyaan yang Sering Diajukan",
  description,
  className = "",
}: PageFAQProps) {
  const { data: faqs = [] } = useQuery({
    queryKey: ["faqs-page", scopes.join(","), packageId ?? ""],
    queryFn: async () => {
      let q = supabase
        .from("faqs")
        .select("id, question, answer, scope, package_id, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      // Ambil scope yang diminta ATAU FAQ khusus paket ini.
      if (packageId) {
        q = q.or(`scope.in.(${scopes.join(",")}),package_id.eq.${packageId}`);
      } else {
        q = q.in("scope", scopes);
      }
      const { data, error } = await q;
      if (error) throw error;
      // Urutkan: package-specific dulu, lalu sort_order
      return ((data as FAQ[]) || []).sort((a, b) => {
        const aSpec = a.package_id === packageId ? 0 : 1;
        const bSpec = b.package_id === packageId ? 0 : 1;
        if (aSpec !== bSpec) return aSpec - bSpec;
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      });
    },
  });

  if (faqs.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };

  return (
    <section className={`py-12 ${className}`}>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <div className="container-custom max-w-3xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-gold mb-2">
            <HelpCircle className="w-5 h-5" />
            <span className="text-xs uppercase tracking-wider font-semibold">FAQ</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-bold">{title}</h2>
          {description && (
            <p className="text-muted-foreground mt-2">{description}</p>
          )}
        </div>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground whitespace-pre-line">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
