import { useEffect, useState } from "react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import TenantClassicTemplate from "@/components/tenant/TenantClassicTemplate";
import TenantModernTemplate from "@/components/tenant/TenantModernTemplate";
import TenantPremiumTemplate from "@/components/tenant/TenantPremiumTemplate";

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
      const { data } = await supabase
        .from("tenant_site_packages")
        .select("package_id, is_featured, sort_order, packages(id, title, slug, image_url, description, duration_days, package_type)")
        .eq("tenant_site_id", tenant.id)
        .order("sort_order");

      if (data) {
        const pkgs = data
          .filter((d: any) => d.packages)
          .map((d: any) => ({
            ...d.packages,
            is_featured: d.is_featured,
          }));
        setPackages(pkgs);
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
      {tenant.template === "modern" ? (
        <TenantModernTemplate tenant={tenant} packages={packages} />
      ) : (
        <TenantClassicTemplate tenant={tenant} packages={packages} />
      )}
    </>
  );
};

export default TenantSite;
