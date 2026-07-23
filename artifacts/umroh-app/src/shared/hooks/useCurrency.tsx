import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from "react";
import { apiFetch } from "@/shared/lib/apiClient";

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  rate_to_idr: number;
  is_default: boolean;
  is_active: boolean;
  rate_updated_at?: string | null;
}

interface CurrencyContextType {
  currencies: Currency[];
  current: Currency | null;
  setCurrency: (code: string) => void;
  format: (idrAmount: number) => string;
  refresh: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const STORAGE_KEY = "preferred_currency";

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [current, setCurrent] = useState<Currency | null>(null);

  const refresh = useCallback(async () => {
    try {
      // Use public /api/currencies (miscRouter, no auth) so CurrencyProvider
      // works for all users — public, jamaah, and admin alike.
      const data = await apiFetch<any[]>("/api/currencies");
      const list: Currency[] = (data || [])
        .sort((a: any, b: any) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0) || a.code.localeCompare(b.code))
        .map((c: any) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          symbol: c.symbol,
          rate_to_idr: c.rateToIdr ?? 1,
          is_default: c.isDefault ?? false,
          is_active: c.isActive ?? true,
          rate_updated_at: c.rateUpdatedAt ?? null,
        }));
      setCurrencies(list);
      const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      const picked = list.find((c) => c.code === stored) || list.find((c) => c.is_default) || list[0] || null;
      setCurrent(picked);
    } catch {
      // silently fail — non-critical for public pages
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const setCurrency = (code: string) => {
    const found = currencies.find((c) => c.code === code);
    if (found) {
      setCurrent(found);
      localStorage.setItem(STORAGE_KEY, code);
    }
  };

  const format = (idrAmount: number) => {
    if (!current) return new Intl.NumberFormat("id-ID").format(idrAmount);
    const converted = idrAmount / (current.rate_to_idr || 1);
    if (current.code === "IDR") {
      return `Rp ${new Intl.NumberFormat("id-ID").format(Math.round(converted))}`;
    }
    return `${current.symbol} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(converted)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currencies, current, setCurrency, format, refresh }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
};
