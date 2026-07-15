import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { HelpCircle } from "lucide-react";

interface PageFAQProps {
  scopes?: ("general" | "paket" | "package")[];
  scope?: "general" | "paket" | "package";
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

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function PageFAQ({
  scopes,
  scope,
  packageId,
  title = "Pertanyaan yang Sering Diajukan",
  description,
  className = "",
}: PageFAQProps) {
  const scopeList = scopes ?? (scope ? [scope] : ["general"]);

  const { data: faqs = [] } = useQuery<FAQ[]>({
    queryKey: ["faqs-page", scopeList.join(","), packageId ?? ""],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("scopes", scopeList.join(","));
      if (packageId) params.set("package_id", packageId);
      const res = await fetch(`${API_BASE}/api/faqs?${params.toString()}`);
      if (!res.ok) return [];
      const json = await res.json();
      const data: FAQ[] = json.data || [];
      return data.sort((a, b) => {
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
