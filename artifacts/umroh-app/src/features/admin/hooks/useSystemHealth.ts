import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/shared/lib/apiClient";

export interface SystemHealthData {
  status: "ok" | "degraded";
  timestamp: string;
  database: {
    status: "ok" | "error";
    latencyMs: number | null;
    error?: string;
  };
  supabaseAuth: {
    configured: boolean;
  };
  bookings: {
    total: number;
    active: number;
  };
  api: {
    windowMinutes: number;
    totalRequests: number;
    errorRequests: number;
    errorRate: number;
  };
}

const REFRESH_INTERVAL_MS = 30_000;

export function useSystemHealth() {
  const [data, setData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setError(null);
      const res = await apiFetch<SystemHealthData>("/api/admin/system-health");
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat status sistem");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchHealth();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return { data, loading, error, refresh: fetchHealth };
}
