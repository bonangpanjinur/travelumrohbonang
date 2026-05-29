// Runs before `vite dev` and `vite build` (predev/prebuild hooks). Writes public/sitemap.xml.
// Pulls dynamic content from Supabase via the public REST API (anon key, RLS-safe).

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://umroh-gateway.lovable.app";
const SUPABASE_URL = "https://snfjildozzqlyyabeyry.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuZmppbGRvenpxbHl5YWJleXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MzgxMjUsImV4cCI6MjA4NjMxNDEyNX0.nUtGiN4fLJCZGUAhU4SlVUprqv7BVTqrFqoAcnluTjQ";

interface Entry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const staticEntries: Entry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/paket", changefreq: "daily", priority: "0.9" },
  { path: "/blog", changefreq: "weekly", priority: "0.7" },
  { path: "/galeri", changefreq: "monthly", priority: "0.5" },
];

async function fetchTable(table: string, query: string): Promise<any[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (!res.ok) {
      console.warn(`[sitemap] ${table} fetch failed: ${res.status}`);
      return [];
    }
    return await res.json();
  } catch (e) {
    console.warn(`[sitemap] ${table} fetch error`, e);
    return [];
  }
}

function xmlEscape(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

async function build() {
  const [packages, posts, pages] = await Promise.all([
    fetchTable("packages", "select=slug,created_at&is_active=eq.true"),
    fetchTable("blog_posts", "select=slug,published_at,updated_at&is_published=eq.true"),
    fetchTable("pages", "select=slug,created_at&is_active=eq.true"),
  ]);

  const dynamic: Entry[] = [
    ...packages.map((p) => ({
      path: `/paket/${p.slug}`,
      lastmod: p.created_at?.split("T")[0],
      changefreq: "weekly" as const,
      priority: "0.8",
    })),
    ...posts.map((p) => ({
      path: `/blog/${p.slug}`,
      lastmod: (p.updated_at || p.published_at)?.split("T")[0],
      changefreq: "monthly" as const,
      priority: "0.6",
    })),
    ...pages
      .filter((p) => !["admin", "dashboard", "auth"].includes(p.slug))
      .map((p) => ({
        path: `/${p.slug}`,
        lastmod: p.created_at?.split("T")[0],
        changefreq: "monthly" as const,
        priority: "0.4",
      })),
  ];

  const entries = [...staticEntries, ...dynamic];

  const urls = entries.map((e) =>
    [
      "  <url>",
      `    <loc>${xmlEscape(BASE_URL + e.path)}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      "  </url>",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
  ].join("\n");

  writeFileSync(resolve("public/sitemap.xml"), xml);
  console.log(`[sitemap] wrote ${entries.length} entries (${packages.length} paket, ${posts.length} blog, ${pages.length} pages)`);
}

build().catch((e) => {
  console.error("[sitemap] failed:", e);
  // Tetap tulis sitemap minimal supaya build tidak gagal
  const fallback =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    staticEntries
      .map((e) => `  <url><loc>${BASE_URL}${e.path}</loc></url>`)
      .join("\n") +
    "\n</urlset>\n";
  writeFileSync(resolve("public/sitemap.xml"), fallback);
});
