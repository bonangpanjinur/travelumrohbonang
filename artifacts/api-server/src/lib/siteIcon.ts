export interface SiteIconBranding {
  favicon_url?: unknown;
  logo_url?: unknown;
}

/** Accept only local root-relative paths or absolute HTTP(S) URLs from branding settings. */
export function resolvePublicIconUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const candidate = value.trim();
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;

  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/** A custom favicon wins; otherwise the browser/app icon follows the current logo. */
export function resolveSiteIconUrl(branding: SiteIconBranding): string | null {
  return resolvePublicIconUrl(branding.favicon_url) ?? resolvePublicIconUrl(branding.logo_url);
}
