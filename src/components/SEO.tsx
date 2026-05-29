import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "product";
  publishedTime?: string;
  author?: string;
  jsonLd?: object;
  noIndex?: boolean;
}

interface BrandingSettings {
  company_name: string;
  tagline: string;
}

const defaultBranding: BrandingSettings = {
  company_name: "UmrohPlus",
  tagline: "Travel & Tours",
};

const SEO = ({
  title,
  description = "Perjalanan spiritual dengan pelayanan terbaik, bimbingan ustadz berpengalaman, dan hotel bintang 5 dekat Masjidil Haram.",
  image,
  url,
  type = "website",
  publishedTime,
  author,
  jsonLd,
  noIndex = false,
}: SEOProps) => {
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);

  useEffect(() => {
    const fetchBranding = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "branding")
        .eq("category", "general")
        .maybeSingle();

      if (data?.value && typeof data.value === "object") {
        setBranding({ ...defaultBranding, ...(data.value as object) });
      }
    };
    fetchBranding();
  }, []);

  const siteName = branding.company_name;
  const fullTitle = title ? `${title} | ${siteName}` : `${siteName} - ${branding.tagline}`;

  // Tenant-aware origin: each domain self-canonicals so search engines don't
  // merge ranking signals across the main brand and white-label tenants.
  // Fallback to the production brand origin during SSR / non-browser contexts.
  const FALLBACK_ORIGIN = "https://umroh-gateway.lovable.app";
  const origin = typeof window !== "undefined" ? window.location.origin : FALLBACK_ORIGIN;
  const pathname = typeof window !== "undefined"
    ? window.location.pathname + window.location.search
    : "/";
  const currentUrl = url || `${origin}${pathname}`;
  const defaultImage = image || `${origin}/og-default.jpg`;

  // Default Organization JSON-LD
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: siteName,
    description: description,
    url: currentUrl,
    logo: defaultImage,
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["Indonesian", "English"],
    },
  };

  // Article JSON-LD for blog posts
  const articleJsonLd = type === "article" ? {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: description,
    image: defaultImage,
    author: {
      "@type": "Person",
      name: author || siteName,
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
      logo: {
        "@type": "ImageObject",
        url: defaultImage,
      },
    },
    datePublished: publishedTime,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": currentUrl,
    },
  } : null;

  // Custom or default JSON-LD
  const structuredData = jsonLd || (type === "article" ? articleJsonLd : organizationJsonLd);

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={currentUrl} />

      {/* hreflang — points back to the same tenant origin so each domain is
          authoritative for its own language variants and ranking signals
          stay scoped per tenant. */}
      <link rel="alternate" hrefLang="id" href={currentUrl} />
      <link rel="alternate" hrefLang="en" href={currentUrl} />
      <link rel="alternate" hrefLang="x-default" href={currentUrl} />


      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={defaultImage} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="id_ID" />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {author && <meta property="article:author" content={author} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={defaultImage} />

      {/* JSON-LD Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
