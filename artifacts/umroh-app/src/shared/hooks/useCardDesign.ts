import { useEffect, useState } from "react";

export interface CardDesignSettings {
  image_ratio: "landscape" | "portrait";
  info_layout: "cards" | "compact";
}

export const defaultCardDesign: CardDesignSettings = {
  image_ratio: "landscape",
  info_layout: "cards",
};

const API_BASE = import.meta.env.VITE_API_URL || "";

/**
 * Fetches card design settings from the public site-settings endpoint.
 * Falls back to defaults if the setting has not been saved yet.
 */
export function useCardDesign(): { cardDesign: CardDesignSettings; loading: boolean } {
  const [cardDesign, setCardDesign] = useState<CardDesignSettings>(defaultCardDesign);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/cms/site-settings`)
      .then((r) => r.json())
      .then((json: { data?: Array<{ key: string; value: unknown }> }) => {
        const entry = (json.data ?? []).find((s) => s.key === "card_design");
        if (entry?.value && typeof entry.value === "object") {
          setCardDesign({ ...defaultCardDesign, ...(entry.value as Partial<CardDesignSettings>) });
        }
      })
      .catch(() => {/* use defaults */})
      .finally(() => setLoading(false));
  }, []);

  return { cardDesign, loading };
}
