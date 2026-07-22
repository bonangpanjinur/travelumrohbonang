import { Helmet } from "react-helmet-async";

interface ProductJsonLdProps {
  name: string;
  description?: string;
  image?: string;
  sku?: string;
  brand?: string;
  price?: number;
  currency?: string;
  availability?: "InStock" | "SoldOut" | "PreOrder";
  validFrom?: string;
  validThrough?: string;
  url: string;
  ratingValue?: number;
  reviewCount?: number;
}

const ProductJsonLd = ({
  name,
  description,
  image,
  sku,
  brand = "Vins Tour Travel",
  price,
  currency = "IDR",
  availability = "InStock",
  validFrom,
  validThrough,
  url,
  ratingValue,
  reviewCount,
}: ProductJsonLdProps) => {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image,
    sku,
    brand: { "@type": "Brand", name: brand },
  };

  if (price != null) {
    data.offers = {
      "@type": "Offer",
      price,
      priceCurrency: currency,
      availability: `https://schema.org/${availability}`,
      url,
      validFrom,
      priceValidUntil: validThrough,
    };
  }

  if (ratingValue && reviewCount && reviewCount > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue,
      reviewCount,
    };
  }

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
  );
};

export default ProductJsonLd;
