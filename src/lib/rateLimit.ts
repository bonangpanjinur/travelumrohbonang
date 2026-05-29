import { supabase } from "@/integrations/supabase/client";

/**
 * Best-effort client-side rate limit using the request_log table.
 * For real protection use server-side checks; this discourages abuse and
 * gives us audit data.
 */
export async function rateLimit(endpoint: string, opts: { max: number; windowSec: number }) {
  const ipPlaceholder = "client";
  const since = new Date(Date.now() - opts.windowSec * 1000).toISOString();

  try {
    const { count } = await supabase
      .from("request_log")
      .select("id", { count: "exact", head: true })
      .eq("endpoint", endpoint)
      .gte("created_at", since);

    if ((count ?? 0) >= opts.max) {
      return { allowed: false, remaining: 0 };
    }

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("request_log").insert({
      ip: ipPlaceholder,
      endpoint,
      user_id: user?.id ?? null,
    });

    return { allowed: true, remaining: opts.max - (count ?? 0) - 1 };
  } catch {
    return { allowed: true, remaining: opts.max };
  }
}
