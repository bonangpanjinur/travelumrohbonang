import { Helmet } from "react-helmet-async";

export interface BreadcrumbItem {
  name: string;
  url: string; // absolute or root-relative path
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
}

const PROD_ORIGIN = "https://umroh-gateway.lovable.app";

/**
 * Emits a BreadcrumbList JSON-LD into <head>.
 * Position is auto-assigned by array order (1-based).
 * Always include "Beranda" as the first item for consistency.
 */
const BreadcrumbJsonLd = ({ items }: BreadcrumbJsonLdProps) => {
  if (!items?.length) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${PROD_ORIGIN}${item.url}`,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
  );
};

export default BreadcrumbJsonLd;
