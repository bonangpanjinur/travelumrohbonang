import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { getAppOrigin } from "@/lib/env";



interface Branch {
  id: string;
  name: string;
  slug: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: string | null;
  image_url: string | null;
  map_url: string | null;
  description: string | null;
}

interface Props {
  /** When set, only emit JSON-LD for the matching branch (by id or slug). */
  branchId?: string;
  /** Brand/business name fallback when a branch lacks specifics. */
  brandName?: string;
}

const LocalBusinessJsonLd = ({ branchId, brandName = "Umroh Gateway" }: Props) => {
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    let q = supabase
      .from("branches")
      .select(
        "id,name,slug,address,phone,email,city,region,postal_code,country,latitude,longitude,opening_hours,image_url,map_url,description"
      )
      .eq("is_active", true);
    if (branchId) q = q.eq("id", branchId);
    q.order("name").then(({ data }) => setBranches((data as Branch[]) || []));
  }, [branchId]);

  if (!branches.length) return null;

  const origin = getAppOrigin();

  const items = branches.map((b) => {
    const url = b.slug ? `${origin}/cabang/${b.slug}` : `${origin}/#cabang-${b.id}`;
    const data: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "TravelAgency",
      "@id": url,
      name: `${brandName} — ${b.name}`,
      url,
    };
    if (b.description) data.description = b.description;
    if (b.image_url) data.image = b.image_url;
    if (b.phone) data.telephone = b.phone;
    if (b.email) data.email = b.email;
    if (b.map_url) data.hasMap = b.map_url;
    if (b.address || b.city || b.region || b.postal_code) {
      data.address = {
        "@type": "PostalAddress",
        ...(b.address ? { streetAddress: b.address } : {}),
        ...(b.city ? { addressLocality: b.city } : {}),
        ...(b.region ? { addressRegion: b.region } : {}),
        ...(b.postal_code ? { postalCode: b.postal_code } : {}),
        addressCountry: b.country || "ID",
      };
    }
    if (b.latitude != null && b.longitude != null) {
      data.geo = {
        "@type": "GeoCoordinates",
        latitude: b.latitude,
        longitude: b.longitude,
      };
    }
    if (b.opening_hours) data.openingHours = b.opening_hours;
    return data;
  });

  return (
    <Helmet>
      {items.map((item, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
    </Helmet>
  );
};

export default LocalBusinessJsonLd;
