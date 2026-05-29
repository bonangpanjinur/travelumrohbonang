// Multi-tenant sitemap generator.
// Detects the tenant by the Host header (or ?host=... query param) and emits
// a sitemap.xml whose <loc> entries use the same origin the request came in
// on — so each tenant subdomain / custom domain advertises its own URLs.
//
// Hook it up by pointing your tenant edge / CDN rewrite rule for
// /sitemap.xml at this function:
//   https://<project-ref>.functions.supabase.co/sitemap

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Entry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

function xmlEscape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildXml(entries: Entry[]) {
  const urls = entries
    .map((e) =>
      [
        "  <url>",
        `    <loc>${xmlEscape(e.loc)}</loc>`,
        e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
        e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
        e.priority ? `    <priority>${e.priority}</priority>` : null,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

function resolveOrigin(req: Request, override?: string | null) {
  if (override) {
    const safe = override.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    return `https://${safe}`;
  }
  const fwdHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const fwdProto = req.headers.get("x-forwarded-proto") || "https";
  return `${fwdProto}://${fwdHost}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const hostOverride = url.searchParams.get("host");
    const origin = resolveOrigin(req, hostOverride);
    const host = new URL(origin).host.toLowerCase();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve tenant by host. Match either custom_domain or subdomain prefix.
    const subdomainCandidate = host.split(".")[0];
    const { data: tenants } = await supabase
      .from("tenant_sites")
      .select("id, subdomain, custom_domain, is_active")
      .eq("is_active", true);

    const tenant =
      (tenants || []).find((t) => t.custom_domain && t.custom_domain.toLowerCase() === host) ||
      (tenants || []).find((t) => t.subdomain?.toLowerCase() === subdomainCandidate) ||
      null;

    const entries: Entry[] = [
      { loc: `${origin}/`, changefreq: "weekly", priority: "1.0" },
      { loc: `${origin}/paket`, changefreq: "weekly", priority: "0.9" },
      { loc: `${origin}/blog`, changefreq: "weekly", priority: "0.7" },
      { loc: `${origin}/galeri`, changefreq: "monthly", priority: "0.5" },
    ];

    // Packages — if the tenant has a curated whitelist use it, otherwise all active.
    let packageQuery = supabase
      .from("packages")
      .select("slug, updated_at")
      .eq("is_active", true);
    if (tenant) {
      const { data: tp } = await supabase
        .from("tenant_packages")
        .select("package_id")
        .eq("tenant_site_id", tenant.id)
        .eq("is_visible", true);
      const ids = (tp || []).map((r) => r.package_id);
      if (ids.length) packageQuery = packageQuery.in("id", ids);
    }
    const { data: packages } = await packageQuery;
    for (const p of packages || []) {
      if (!p.slug) continue;
      entries.push({
        loc: `${origin}/paket/${p.slug}`,
        lastmod: p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : undefined,
        changefreq: "weekly",
        priority: "0.8",
      });
    }

    // Blog posts — published only.
    const { data: posts } = await supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("is_published", true);
    for (const p of posts || []) {
      if (!p.slug) continue;
      entries.push({
        loc: `${origin}/blog/${p.slug}`,
        lastmod: (p.updated_at || p.published_at)
          ? new Date(p.updated_at || p.published_at!).toISOString().slice(0, 10)
          : undefined,
        changefreq: "monthly",
        priority: "0.6",
      });
    }

    return new Response(buildXml(entries), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=600, s-maxage=600",
      },
      status: 200,
    });
  } catch (err) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<!-- sitemap error: ${(err as Error).message} -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>`,
      { headers: { ...corsHeaders, "Content-Type": "application/xml" }, status: 200 },
    );
  }
});
