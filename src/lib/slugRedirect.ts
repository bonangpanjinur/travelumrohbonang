import { supabase } from "@/integrations/supabase/client";

export type SlugResource = "package" | "blog" | "page";

/**
 * Look up a slug redirect (old → new). Returns the destination slug or null.
 * Tenant-aware: if tenantSiteId is provided, the tenant-scoped redirect wins
 * over a global (NULL tenant) entry with the same old_slug.
 */
export async function lookupSlugRedirect(
  resource: SlugResource,
  oldSlug: string,
  tenantSiteId?: string | null,
): Promise<string | null> {
  if (!oldSlug) return null;
  const query = supabase
    .from("slug_redirects")
    .select("new_slug, tenant_site_id")
    .eq("resource_type", resource)
    .eq("old_slug", oldSlug);

  const { data } = tenantSiteId
    ? await query.or(`tenant_site_id.eq.${tenantSiteId},tenant_site_id.is.null`)
    : await query.is("tenant_site_id", null);

  if (!data || data.length === 0) return null;
  // Prefer tenant-scoped match over global
  const tenantMatch = data.find((r) => r.tenant_site_id === tenantSiteId);
  return (tenantMatch || data[0]).new_slug;
}

export function buildRedirectPath(resource: SlugResource, newSlug: string): string {
  switch (resource) {
    case "package":
      return `/paket/${newSlug}`;
    case "blog":
      return `/blog/${newSlug}`;
    case "page":
      return `/${newSlug}`;
  }
}
