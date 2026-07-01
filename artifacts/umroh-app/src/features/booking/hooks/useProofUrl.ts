import { useEffect, useState } from "react";
import { getProofSignedUrl } from "@/features/booking/lib/paymentProofs";

export interface ProofUrlState {
  url: string | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Memuat signed URL bukti bayar dengan state loading & error yang konsisten.
 * Hanya aktif ketika `enabled` true dan path tersedia.
 */
export function useProofUrl(
  storedPath: string | null | undefined,
  enabled: boolean,
  context?: string
): ProofUrlState {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled || !storedPath) {
      setUrl(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProofSignedUrl(storedPath, 300, { context })
      .then((u) => {
        if (cancelled) return;
        if (!u) setError("Gagal memuat bukti transfer");
        setUrl(u);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(e?.message || "Gagal memuat bukti transfer");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storedPath, enabled, context, tick]);

  return { url, loading, error, reload: () => setTick((t) => t + 1) };
}
