import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { apiFetch } from "@/shared/lib/apiClient";
import {
  DEFAULT_FLAGS,
  ALL_FEATURE_IDS,
  type FeatureId,
} from "@/features/admin/config/featureDefinitions";

// ── Types ─────────────────────────────────────────────────────────────────────

export type FeatureFlags = Record<FeatureId, boolean>;

export interface FeatureFlagsContextType {
  flags: FeatureFlags;
  loading: boolean;
  /** Returns true if the feature is enabled (or not recognised → always true) */
  isEnabled: (id: FeatureId) => boolean;
  /** Update one or more flags and persist to backend */
  setFlags: (patch: Partial<FeatureFlags>) => Promise<void>;
  saving: boolean;
  reload: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const FeatureFlagsContext = createContext<FeatureFlagsContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlagsState] = useState<FeatureFlags>({ ...DEFAULT_FLAGS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchFlags = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: Partial<FeatureFlags> }>(
        "/api/admin/feature-flags"
      );
      // Merge with defaults so new features are always enabled unless explicitly off
      const merged: FeatureFlags = { ...DEFAULT_FLAGS };
      for (const id of ALL_FEATURE_IDS) {
        if (typeof res.data[id] === "boolean") {
          merged[id] = res.data[id] as boolean;
        }
      }
      setFlagsState(merged);
    } catch {
      // On failure keep defaults (all enabled)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const isEnabled = useCallback(
    (id: FeatureId): boolean => {
      return flags[id] ?? true;
    },
    [flags]
  );

  const setFlags = useCallback(
    async (patch: Partial<FeatureFlags>) => {
      const next: FeatureFlags = { ...flags, ...patch };
      setFlagsState(next); // optimistic
      setSaving(true);
      try {
        await apiFetch("/api/admin/feature-flags", {
          method: "PUT",
          body: JSON.stringify({ flags: next }),
        });
      } catch {
        // Revert on failure
        setFlagsState(flags);
        throw new Error("Gagal menyimpan — coba lagi.");
      } finally {
        setSaving(false);
      }
    },
    [flags]
  );

  return React.createElement(
    FeatureFlagsContext.Provider,
    { value: { flags, loading, isEnabled, setFlags, saving, reload: fetchFlags } },
    children
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFeatureFlags(): FeatureFlagsContextType {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) throw new Error("useFeatureFlags must be inside FeatureFlagsProvider");
  return ctx;
}
