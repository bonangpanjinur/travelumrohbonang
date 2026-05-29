import { Helmet } from "react-helmet-async";

export interface BreadcrumbItem {
  name: string;
  url: string; // absolute or root-relative path
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
}

const FALLBACK_ORIGIN = "https://umroh-gateway.lovable.app";

/**
 * Emits a BreadcrumbList JSON-LD into <head>.
 * Position is auto-assigned by array order (1-based).
 * URLs resolve against the current tenant origin so each domain stays
 * authoritative for its own breadcrumb ranking signals.
 */
const BreadcrumbJsonLd = ({ items }: BreadcrumbJsonLdProps) => {
  if (!items?.length) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : FALLBACK_ORIGIN;

  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${origin}${item.url}`,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
  );
};

export default BreadcrumbJsonLd;
