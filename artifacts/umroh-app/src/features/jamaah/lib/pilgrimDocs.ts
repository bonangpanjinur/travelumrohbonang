import { supabase } from "@/shared/integrations/supabase/client";
import { getCurrentAuthUser } from "@/shared/lib/currentUser";

/**
 * Extract the storage path from a Supabase storage URL.
 * Handles both public and signed URL shapes:
 *   .../storage/v1/object/public/<bucket>/<path>
 *   .../storage/v1/object/sign/<bucket>/<path>?token=...
 */
export function extractStoragePath(url: string, bucket: string): string | null {
  if (!url) return null;
  // If it's already a bare path, return as-is.
  if (!url.startsWith("http")) return url.replace(new RegExp(`^${bucket}/`), "");
  const re = new RegExp(`/storage/v1/object/(?:public|sign)/${bucket}/([^?]+)`);
  const m = url.match(re);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Generate a short-lived signed URL for a private pilgrim document and log
 * the access for audit. Returns null on failure.
 */
export async function getSignedPilgrimDocUrl(opts: {
  fileUrlOrPath: string;
  pilgrimId?: string;
  docType?: string;
  context?: string;
  expiresInSeconds?: number;
}): Promise<string | null> {
  const path = extractStoragePath(opts.fileUrlOrPath, "pilgrim-documents");
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from("pilgrim-documents")
    .createSignedUrl(path, opts.expiresInSeconds ?? 300);

  if (error || !data?.signedUrl) {
    console.error("Failed to sign pilgrim doc URL", error);
    return null;
  }

  // Best-effort audit log; ignore errors so view still works.
  try {
    const userData = await getCurrentAuthUser();
    await supabase.from("pilgrim_doc_access_logs").insert({
      user_id: userData?.id ?? null,
      pilgrim_id: opts.pilgrimId ?? null,
      doc_type: opts.docType ?? null,
      storage_path: path,
      context: opts.context ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch (e) {
    console.warn("doc access log failed", e);
  }

  return data.signedUrl;
}
