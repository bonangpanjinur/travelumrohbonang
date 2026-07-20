import { apiFetch } from "@/shared/lib/apiClient";

export type SlugResource = "package" | "blog" | "page";

/**
 * Look up a slug redirect (old → new). Returns the destination slug or null.
 * Tenant-aware: if tenantSiteId is provided, the tenant-scoped redirect wins
 * over a global (NULL tenant) entry with the same old_slug.
 *
 * Uses apiFetch (API server REST proxy) instead of the Supabase client so this
 * works in production even when VITE_SUPABASE_* env vars are absent.
 */
export async function lookupSlugRedirect(
  resource: SlugResource,
  oldSlug: string,
  tenantSiteId?: string | null,
): Promise<string | null> {
  if (!oldSlug) return null;
  try {
    let filter = `resource_type=eq.${encodeURIComponent(resource)}&old_slug=eq.${encodeURIComponent(oldSlug)}&select=new_slug,tenant_site_id`;
    if (tenantSiteId) {
      filter += `&or=(tenant_site_id.eq.${encodeURIComponent(tenantSiteId)},tenant_site_id.is.null)`;
    } else {
      filter += `&tenant_site_id=is.null`;
    }
    const data: { new_slug: string; tenant_site_id: string | null }[] = await apiFetch(
      `/rest/v1/slug_redirects?${filter}`,
    );
    if (!data || data.length === 0) return null;
    const tenantMatch = data.find((r) => r.tenant_site_id === tenantSiteId);
    return (tenantMatch || data[0]).new_slug;
  } catch {
    return null;
  }
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
