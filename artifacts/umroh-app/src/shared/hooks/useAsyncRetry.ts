import { useCallback, useEffect, useRef, useState } from "react";

export interface UseAsyncRetryOptions {
  /** Jumlah percobaan ulang otomatis setelah percobaan pertama gagal. */
  retries?: number;
  /** Jeda dasar (ms) untuk backoff eksponensial. */
  retryDelayMs?: number;
  /** Batas waktu per percobaan (ms). Lewat dari ini dianggap gagal/lambat. */
  timeoutMs?: number;
  /** Jalankan langsung saat mount. */
  immediate?: boolean;
}

export interface UseAsyncRetryResult<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  /** true saat sedang menunggu percobaan ulang otomatis. */
  retrying: boolean;
  attempt: number;
  retry: () => void;
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

/**
 * Menjalankan fetcher async dengan timeout dan retry otomatis (exponential backoff).
 * Dipakai komponen homepage agar tidak blank saat endpoint lambat/gagal.
 */
export function useAsyncRetry<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: unknown[] = [],
  options: UseAsyncRetryOptions = {},
): UseAsyncRetryResult<T> {
  const {
    retries = 2,
    retryDelayMs = 800,
    timeoutMs = 10000,
    immediate = true,
  } = options;

  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<Error | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [nonce, setNonce] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const retry = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!immediate && nonce === 0) return;

    const controller = new AbortController();
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      for (let i = 0; i <= retries; i++) {
        if (cancelled) return;
        setAttempt(i + 1);
        setRetrying(i > 0);

        const timeoutCtrl = new AbortController();
        const onAbort = () => timeoutCtrl.abort();
        controller.signal.addEventListener("abort", onAbort);
        const timer = setTimeout(() => timeoutCtrl.abort(), timeoutMs);

        try {
          const result = await fetcherRef.current(timeoutCtrl.signal);
          if (cancelled) return;
          setData(result);
          setError(null);
          setRetrying(false);
          setLoading(false);
          return;
        } catch (err) {
          if (cancelled || controller.signal.aborted) return;
          if (i === retries) {
            setError(err instanceof Error ? err : new Error(String(err)));
            setRetrying(false);
            setLoading(false);
            return;
          }
          try {
            await wait(retryDelayMs * 2 ** i, controller.signal);
          } catch {
            return;
          }
        } finally {
          clearTimeout(timer);
          controller.signal.removeEventListener("abort", onAbort);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, retries, retryDelayMs, timeoutMs, immediate, ...deps]);

  return { data, loading, error, retrying, attempt, retry };
}

export default useAsyncRetry;
