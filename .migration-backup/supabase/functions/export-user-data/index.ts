// Export user personal data (GDPR/UU PDP)
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: cors });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error: uerr } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    ).auth.getUser();
    if (uerr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

    const uid = user.id;
    const [profile, bookings, pilgrims, payments, docs, reviews, wishlists, points, leads] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("bookings").select("*").eq("user_id", uid),
      supabase.from("pilgrims").select("*").eq("user_id", uid),
      supabase.from("payments").select("*, bookings!inner(user_id)").eq("bookings.user_id", uid),
      supabase.from("pilgrim_documents").select("*").eq("user_id", uid),
      supabase.from("package_reviews").select("*").eq("user_id", uid),
      supabase.from("wishlists").select("*").eq("user_id", uid),
      supabase.from("loyalty_points").select("*").eq("user_id", uid),
      supabase.from("leads").select("*").eq("user_id", uid),
    ]);

    const payload = {
      exported_at: new Date().toISOString(),
      user: { id: user.id, email: user.email, created_at: user.created_at },
      profile: profile.data,
      bookings: bookings.data,
      pilgrims: pilgrims.data,
      payments: payments.data,
      pilgrim_documents: docs.data,
      package_reviews: reviews.data,
      wishlists: wishlists.data,
      loyalty_points: points.data,
      leads: leads.data,
    };
    return new Response(JSON.stringify(payload, null, 2), {
      headers: { ...cors, "Content-Type": "application/json", "Content-Disposition": `attachment; filename=my-data-${uid}.json` },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors });
  }
});
