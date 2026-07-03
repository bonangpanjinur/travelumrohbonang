import { supabase } from "@/shared/integrations/supabase/client";
import { getCurrentAuthUser } from "@/shared/lib/currentUser";

/**
 * Catat aksi penting ke audit_logs. Best-effort: tidak melempar error
 * agar tidak menggagalkan aksi utama.
 */
export async function logAudit(params: {
  action: string;
  entityType?: string;
  entityId?: string | number | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const u = await getCurrentAuthUser();
    const userId = u?.id ?? null;
    if (!userId) return;
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId == null ? null : String(params.entityId),
      metadata: (params.metadata ?? null) as any,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch (e) {
    console.warn("logAudit failed:", e);
  }
}

/** Simpan kode referral dari URL ke localStorage untuk attach saat checkout. */
export function captureReferralFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("referral_code", ref);
      localStorage.setItem("referral_captured_at", String(Date.now()));
    }
  } catch {}
}

export function getStoredReferral(): string | null {
  try {
    return localStorage.getItem("referral_code");
  } catch {
    return null;
  }
}

export function clearStoredReferral() {
  try {
    localStorage.removeItem("referral_code");
    localStorage.removeItem("referral_captured_at");
  } catch {}
}
