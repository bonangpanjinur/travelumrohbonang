import { apiFetch } from "@/shared/lib/apiClient";
import { getCurrentAuthUser } from "@/shared/lib/currentUser";

// For storage, we still need supabase storage until a backend proxy is added,
// but the task says migrate off Supabase to Express API for data-query.
// paymentProofAccessLogs should go through API.
import { supabase } from "@/shared/integrations/supabase/client";

const BUCKET = "payment-proofs";
const DEFAULT_TTL = 300; // 5 menit
// Refresh sedikit lebih awal supaya URL tidak basi di tengah jalan
const SAFETY_WINDOW = 15; // detik

interface CacheEntry {
  url: string;
  expiresAt: number; // epoch ms
}

const cache = new Map<string, CacheEntry>();

/** Ekstrak path relatif dari URL publik lama atau path tersimpan. */
function resolvePath(stored: string): string {
  if (!stored.startsWith("http")) return stored;
  const marker = `/${BUCKET}/`;
  const idx = stored.indexOf(marker);
  if (idx === -1) return stored;
  return stored.slice(idx + marker.length);
}

async function logAccess(path: string, context?: string) {
  try {
    const data = await getCurrentAuthUser();
    const uid = data?.id;
    if (!uid) return;
    
    await apiFetch("/api/bookings/payments/proof-access-log", {
      method: "POST",
      body: JSON.stringify({
        userId: uid,
        proofPath: path,
        context: context ?? null,
      }),
    });
  } catch (e) {
    // jangan blokir UX karena gagal log
    console.warn("logAccess failed", e);
  }
}

/**
 * Bucket payment-proofs privat → gunakan signed URL berdurasi pendek.
 * Hasil di-cache sampai sisa waktu < SAFETY_WINDOW.
 */
export async function getProofSignedUrl(
  stored: string | null | undefined,
  expiresIn: number = DEFAULT_TTL,
  options: { context?: string; skipLog?: boolean } = {}
): Promise<string | null> {
  if (!stored) return null;
  const path = resolvePath(stored);
  if (!path) return null;

  const now = Date.now();
  const cached = cache.get(path);
  if (cached && cached.expiresAt - now > SAFETY_WINDOW * 1000) {
    if (!options.skipLog) void logAccess(path, options.context);
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    console.warn("getProofSignedUrl failed", error?.message);
    cache.delete(path);
    return null;
  }

  cache.set(path, {
    url: data.signedUrl,
    expiresAt: now + expiresIn * 1000,
  });

  if (!options.skipLog) void logAccess(path, options.context);
  return data.signedUrl;
}

/** Bersihkan cache (mis. saat logout / unit test). */
export function clearProofUrlCache() {
  cache.clear();
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
