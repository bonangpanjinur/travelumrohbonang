import { useEffect, useState } from "react";
import { useTenant } from "@/shared/hooks/useTenant";
import { supabase } from "@/shared/integrations/supabase/client";
import { apiFetch } from "@/shared/lib/apiClient";
import SEO from "@/shared/components/seo/SEO";
import TenantClassicTemplate from "@/features/tenant/components/TenantClassicTemplate";
import TenantModernTemplate from "@/features/tenant/components/TenantModernTemplate";
import TenantPremiumTemplate from "@/features/tenant/components/TenantPremiumTemplate";

interface PackageData {
  id: string;
  title: string;
  slug: string;
  image_url: string | null;
  description: string | null;
  duration_days: number | null;
  package_type: string | null;
  is_featured?: boolean;
}

const TenantSite = () => {
  const { tenant } = useTenant();
  const [packages, setPackages] = useState<PackageData[]>([]);

  useEffect(() => {
    if (!tenant) return;

    const fetchPackages = async () => {
      try {
        // 1. Fetch ALL active packages from the public API so nothing is hidden
        const allPkgs = await apiFetch<any[]>("/api/packages").catch(() => []);

        // 2. Fetch tenant_site_packages to know which are featured + their sort order
        const { data: sitePkgs } = await supabase
          .from("tenant_site_packages")
          .select("package_id, is_featured, sort_order")
          .eq("tenant_site_id", tenant.id)
          .order("sort_order");

        // Map: packageId → { is_featured, sort_order }
        const featuredMap = new Map<string, { is_featured: boolean; sort_order: number }>(
          (sitePkgs ?? []).map((sp: any) => [
            sp.package_id,
            { is_featured: Boolean(sp.is_featured), sort_order: sp.sort_order ?? 999 },
          ])
        );

        // 3. Sort: curated (tenant_site_packages) packages first by sort_order,
        //    then the rest alphabetically — so admins that did curate see their order.
        const sorted = [...(allPkgs ?? [])]
          .filter((p: any) => p.is_active !== false)
          .sort((a: any, b: any) => {
            const aEntry = featuredMap.get(a.id);
            const bEntry = featuredMap.get(b.id);
            if (aEntry && bEntry) return aEntry.sort_order - bEntry.sort_order;
            if (aEntry) return -1;
            if (bEntry) return 1;
            return (a.title ?? "").localeCompare(b.title ?? "");
          });

        setPackages(
          sorted.map((p: any) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            image_url: p.image_url ?? null,
            description: p.description ?? null,
            duration_days: p.duration_days ?? null,
            package_type: p.package_type ?? null,
            is_featured: featuredMap.get(p.id)?.is_featured ?? false,
          }))
        );
      } catch (err) {
        console.error("[TenantSite] fetchPackages error:", err);
      }
    };

    fetchPackages();
  }, [tenant]);

  if (!tenant) return null;

  return (
    <>
      <SEO
        title={`${tenant.site_name} - ${tenant.tagline}`}
        description={tenant.about_text?.slice(0, 160) || `${tenant.site_name} - ${tenant.tagline}`}
      />
      {tenant.template === "premium" ? (
        <TenantPremiumTemplate tenant={tenant} packages={packages} />
      ) : tenant.template === "modern" ? (
        <TenantModernTemplate tenant={tenant} packages={packages} />
      ) : (
        <TenantClassicTemplate tenant={tenant} packages={packages} />
      )}
    </>
  );
};

export default TenantSite;
