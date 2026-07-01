// Weekly SEO audit. Scans public content for missing/short meta and writes
// findings to `seo_audit_results`. Findings are admin-only (RLS) and surface
// in /admin/seo. Trigger via cron (see migrations) or manual POST.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Finding {
  path: string;
  issue: string;
  severity: "info" | "warning" | "error";
  details?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const findings: Finding[] = [];

  try {
    // Packages
    const { data: pkgs } = await supabase
      .from("packages")
      .select("slug,title,description,image_url,meta_description")
      .eq("is_active", true);
    for (const p of pkgs || []) {
      const path = `/paket/${p.slug}`;
      if (!p.title || p.title.length < 10)
        findings.push({ path, issue: "Judul paket terlalu pendek (<10 char)", severity: "warning" });
      const desc = (p as { meta_description?: string }).meta_description || p.description || "";
      if (!desc) findings.push({ path, issue: "Meta description kosong", severity: "error" });
      else if (desc.length < 80)
        findings.push({ path, issue: "Meta description <80 char", severity: "warning", details: { length: desc.length } });
      else if (desc.length > 160)
        findings.push({ path, issue: "Meta description >160 char", severity: "info", details: { length: desc.length } });
      if (!p.image_url) findings.push({ path, issue: "Gambar/OG image kosong", severity: "warning" });
    }

    // Blog posts
    const { data: posts } = await supabase
      .from("blog_posts")
      .select("slug,title,excerpt,cover_image_url,meta_description")
      .eq("is_published", true);
    for (const p of posts || []) {
      const path = `/blog/${p.slug}`;
      if (!p.title || p.title.length < 10)
        findings.push({ path, issue: "Judul artikel terlalu pendek", severity: "warning" });
      const desc = (p as { meta_description?: string }).meta_description || p.excerpt || "";
      if (!desc) findings.push({ path, issue: "Meta description / excerpt kosong", severity: "error" });
      else if (desc.length < 80)
        findings.push({ path, issue: "Meta description <80 char", severity: "warning", details: { length: desc.length } });
      if (!p.cover_image_url) findings.push({ path, issue: "Cover image kosong", severity: "warning" });
    }

    // Pages
    const { data: pages } = await supabase
      .from("pages")
      .select("slug,title,meta_description")
      .eq("is_active", true);
    for (const p of pages || []) {
      const path = `/${p.slug}`;
      if (!p.title) findings.push({ path, issue: "Judul halaman kosong", severity: "error" });
      const desc = (p as { meta_description?: string }).meta_description || "";
      if (!desc) findings.push({ path, issue: "Meta description kosong", severity: "warning" });
    }

    // Replace prior audit snapshot
    await supabase.from("seo_audit_results").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (findings.length) {
      const chunk = 500;
      for (let i = 0; i < findings.length; i += chunk) {
        await supabase.from("seo_audit_results").insert(findings.slice(i, i + chunk));
      }
    }

    return new Response(
      JSON.stringify({ ok: true, scanned: (pkgs?.length || 0) + (posts?.length || 0) + (pages?.length || 0), findings: findings.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
