// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface WAPayload {
  to: string; // E.164 or local (628...)
  message: string;
  provider?: "fonnte" | "wablas"; // optional override
}

function normalizeNumber(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const payload = (await req.json()) as WAPayload;
    const target = normalizeNumber(payload.to);

    // Pick active provider: explicit override → first active fonnte/wablas
    const providers = payload.provider ? [payload.provider] : ["fonnte", "wablas"];
    const { data: secrets } = await supabase
      .from("integration_secrets")
      .select("provider, config, is_active")
      .in("provider", providers);

    const active = (secrets || []).find((s) => s.is_active && (s.config as any)?.api_key);
    if (!active) {
      return new Response(JSON.stringify({ error: "Tidak ada provider WhatsApp aktif. Atur di Admin → Integrasi." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let res: Response;
    if (active.provider === "fonnte") {
      const form = new FormData();
      form.append("target", target);
      form.append("message", payload.message);
      const device = (active.config as any)?.device;
      if (device) form.append("countryCode", "62");
      res = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: { Authorization: (active.config as any).api_key },
        body: form,
      });
    } else {
      // wablas
      const endpoint = (active.config as any)?.endpoint || "https://console.wablas.com";
      res = await fetch(`${endpoint.replace(/\/$/, "")}/api/send-message`, {
        method: "POST",
        headers: {
          Authorization: (active.config as any).api_key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: target, message: payload.message }),
      });
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "WhatsApp provider error", details: data }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, provider: active.provider, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
