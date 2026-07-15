import { supabase } from "@/shared/integrations/supabase/client";

const COOKIE_NAME = "aff_ref";
const COOKIE_DAYS = 30;

export function setAffiliateCookie(code: string) {
  const expires = new Date();
  expires.setDate(expires.getDate() + COOKIE_DAYS);
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(code)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

export function getAffiliateCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function clearAffiliateCookie() {
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

/** Resolve the agent_id from a referral code stored in cookie. */
export async function resolveAffiliateAgentId(): Promise<string | null> {
  const code = getAffiliateCookie();
  if (!code) return null;
  const { data } = await supabase
    .from("agents_public" as any)
    .select("id")
    .eq("referral_code", code)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function trackAffiliateClick(agentId: string, code: string, landingPath: string) {
  try {
    const { error } = await supabase.from("affiliate_clicks").insert({
      agent_id: agentId,
      referral_code: code,
      landing_path: landingPath,
      user_agent: navigator.userAgent.slice(0, 500),
    });
    if (error) console.error("Failed to track affiliate click:", error.message);
  } catch (err) {
    console.error("Failed to track affiliate click:", err);
  }
}
