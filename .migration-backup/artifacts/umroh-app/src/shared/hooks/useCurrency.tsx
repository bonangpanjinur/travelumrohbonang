import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/shared/integrations/supabase/client";

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  rate_to_idr: number;
  is_default: boolean;
  is_active: boolean;
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
    const { data } = await supabase
      .from("currencies")
      .select("*")
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("code");
    const list = (data || []) as Currency[];
    setCurrencies(list);
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const picked = list.find((c) => c.code === stored) || list.find((c) => c.is_default) || list[0] || null;
    setCurrent(picked);
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
