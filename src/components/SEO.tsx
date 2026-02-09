import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const currentUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const defaultImage = image || "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200&q=80";

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
