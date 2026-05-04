import { supabase } from "@/integrations/supabase/client";

const BUCKET = "payment-proofs";

/**
 * Bucket payment-proofs sekarang privat. URL publik tidak akan bekerja —
 * gunakan signed URL berdurasi pendek.
 *
 * Field DB `proof_url` bisa berisi:
 * - path relatif baru (mis. "<user_id>/file.jpg") → buat signed URL
 * - URL publik lama (https://…) → fallback: ekstrak path setelah "/payment-proofs/"
 */
export async function getProofSignedUrl(
  stored: string | null | undefined,
  expiresIn = 300
): Promise<string | null> {
  if (!stored) return null;
  let path = stored;
  if (stored.startsWith("http")) {
    const marker = `/${BUCKET}/`;
    const idx = stored.indexOf(marker);
    if (idx === -1) return stored; // tidak bisa diparse, pakai apa adanya
    path = stored.slice(idx + marker.length);
  }
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) {
    console.warn("getProofSignedUrl failed", error.message);
    return null;
  }
  return data.signedUrl;
}

/** Upload bukti bayar ke folder pengguna (sesuai RLS). Mengembalikan path tersimpan. */
export async function uploadPaymentProof(
  userId: string,
  file: File,
  prefix: string
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${prefix}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}
