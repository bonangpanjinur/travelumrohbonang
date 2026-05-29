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
  const [gscToken, setGscToken] = useState<string | null>(null);
  const { tenant } = useTenant();

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

  // Per-tenant Google Search Console verification token. On the main brand
  // domain we fall back to the `seo.gsc_verification` site_setting key.
  useEffect(() => {
    const tenantGsc = (tenant as { gsc_verification?: string | null } | null)?.gsc_verification;
    const fetchGsc = async () => {
      if (tenantGsc) {
        setGscToken(tenantGsc);
        return;
      }
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "seo")
        .maybeSingle();
      const v = (data?.value as { gsc_verification?: string } | null) ?? null;
      if (v?.gsc_verification) setGscToken(v.gsc_verification);
    };
    fetchGsc();
  }, [tenant]);

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

  // Always resolve og:image to an absolute URL. Relative paths break crawlers,
  // and the static /og-default.jpg fallback 404s on tenant subdomains.
  const resolveAbsolute = (src?: string) => {
    if (!src) return undefined;
    if (/^https?:\/\//i.test(src)) return src;
    if (src.startsWith("/")) return `${origin}${src}`;
    return `${origin}/${src}`;
  };
  const tenantDefault = (tenant as { seo_default_image?: string | null } | null)?.seo_default_image || null;
  const defaultImage =
    resolveAbsolute(image) ||
    resolveAbsolute(tenantDefault || undefined) ||
    resolveAbsolute(tenant?.hero_image_url || undefined) ||
    resolveAbsolute(tenant?.logo_url || undefined) ||
    `${origin}/og-default.jpg`;

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
      {gscToken && <meta name="google-site-verification" content={gscToken} />}
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
