import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TenantSite {
  id: string;
  owner_id: string;
  branch_id: string | null;
  agent_id: string | null;
  subdomain: string;
  custom_domain: string | null;
  site_name: string;
  tagline: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  hero_image_url: string;
  hero_title: string;
  hero_subtitle: string;
  about_text: string;
  whatsapp_number: string;
  phone: string;
  email: string;
  address: string;
  instagram_url: string;
  facebook_url: string;
  is_active: boolean;
  template: string;
}

interface TenantContextType {
  tenant: TenantSite | null;
  isTenantSite: boolean;
  loading: boolean;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  isTenantSite: false,
  loading: true,
});

export const useTenant = () => useContext(TenantContext);

/**
 * Extracts subdomain from hostname.
 * e.g. "cabang-jakarta.umroh-gateway.lovable.app" => "cabang-jakarta"
 * or "cabang-jakarta.yourdomain.com" => "cabang-jakarta"
 * Returns null for main site (no subdomain or www)
 */
function getSubdomain(): string | null {
  const hostname = window.location.hostname;
  
  // localhost or IP - no tenant
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    // Allow testing via query param
    const params = new URLSearchParams(window.location.search);
    return params.get("tenant");
  }

  const parts = hostname.split(".");
  
  // For lovable.app preview domains: xxx.lovable.app (3 parts = main site)
  // For custom domains: sub.domain.com (3+ parts, first is subdomain)
  if (parts.length >= 3) {
    const sub = parts[0];
    // Skip common non-tenant subdomains
    if (["www", "api", "admin", "id-preview--8b092382-a23b-4640-b4ae-5e404be3b948"].includes(sub)) {
      return null;
    }
    // Skip lovable preview subdomains
    if (sub.startsWith("id-preview--")) {
      return null;
    }
    return sub;
  }

  return null;
}

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const [tenant, setTenant] = useState<TenantSite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subdomain = getSubdomain();
    
    if (!subdomain) {
      setLoading(false);
      return;
    }

    const fetchTenant = async () => {
      try {
        // Try subdomain first, then custom_domain
        const { data } = await supabase
          .from("tenant_sites")
          .select("*")
          .eq("subdomain", subdomain)
          .eq("is_active", true)
          .maybeSingle();

        if (data) {
          setTenant(data as TenantSite);
        } else {
          // Try matching by custom domain
          const hostname = window.location.hostname;
          const { data: domainData } = await supabase
            .from("tenant_sites")
            .select("*")
            .eq("custom_domain", hostname)
            .eq("is_active", true)
            .maybeSingle();
          
          if (domainData) {
            setTenant(domainData as TenantSite);
          }
        }
      } catch (err) {
        console.error("Error fetching tenant:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, isTenantSite: !!tenant, loading }}>
      {children}
    </TenantContext.Provider>
  );
};
