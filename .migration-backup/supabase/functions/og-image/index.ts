// Dynamic Open Graph image generator. Returns an SVG (image/svg+xml) sized
// 1200x630, branded with the project tagline. Crawlers that support SVG (most
// modern ones do) will use it directly; the admin can still upload a PNG/JPG
// override per page from /admin/seo.
//
// Query params:
//   title (string, required)
//   subtitle (string, optional)
//   brand (string, optional — default "UmrohPlus")
//
// Example:
//   /functions/v1/og-image?title=Paket+Umroh+Hemat&subtitle=Berangkat+April+2026

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function xmlEscape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrap(text: string, max: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > max) {
      lines.push(current.trim());
      current = w;
      if (lines.length === maxLines - 1) {
        // last line: append remaining
        const rest = words.slice(words.indexOf(w)).join(" ");
        lines.push(rest.length > max ? rest.slice(0, max - 1) + "…" : rest);
        return lines;
      }
    } else {
      current += " " + w;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const title = (url.searchParams.get("title") || "Umroh & Haji Plus").slice(0, 140);
  const subtitle = (url.searchParams.get("subtitle") || "").slice(0, 160);
  const brand = (url.searchParams.get("brand") || "UmrohPlus").slice(0, 60);

  const titleLines = wrap(title, 26, 3);
  const titleY = 250 + (3 - titleLines.length) * 35;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4a0e15"/>
      <stop offset="100%" stop-color="#7c1d2a"/>
    </linearGradient>
    <pattern id="dots" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="rgba(212,175,55,0.15)"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#dots)"/>
  <rect x="60" y="60" width="1080" height="510" fill="none" stroke="rgba(212,175,55,0.4)" stroke-width="2" rx="20"/>
  <text x="100" y="140" font-family="Georgia, serif" font-size="28" fill="#d4af37" font-weight="700">${xmlEscape(brand)}</text>
  ${titleLines
    .map(
      (line, i) =>
        `<text x="100" y="${titleY + i * 78}" font-family="Georgia, serif" font-size="68" fill="#ffffff" font-weight="800">${xmlEscape(line)}</text>`,
    )
    .join("\n  ")}
  ${
    subtitle
      ? `<text x="100" y="520" font-family="Inter, Arial, sans-serif" font-size="30" fill="rgba(255,255,255,0.85)">${xmlEscape(subtitle.length > 80 ? subtitle.slice(0, 80) + "…" : subtitle)}</text>`
      : ""
  }
  <text x="100" y="570" font-family="Inter, Arial, sans-serif" font-size="20" fill="rgba(212,175,55,0.9)">Perjalanan Spiritual Terpercaya</text>
</svg>`;

  return new Response(svg, {
    headers: {
      ...corsHeaders,
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
});
