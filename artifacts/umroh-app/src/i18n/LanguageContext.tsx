import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { translations, Language } from "./translations";
import { supabase } from "@/integrations/supabase/client";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  translateDynamic: (text: string, sourceLang?: Language) => Promise<string>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Simple in-memory cache for dynamic translations
const dynamicCache = new Map<string, string>();

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("app_language");
    return (saved === "en" || saved === "id") ? saved : "id";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app_language", lang);
    document.documentElement.lang = lang;
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key: string): string => {
      return translations[language]?.[key] || translations["id"]?.[key] || key;
    },
    [language]
  );

  const translateDynamic = useCallback(
    async (text: string, sourceLang: Language = "id"): Promise<string> => {
      if (!text || language === sourceLang) return text;

      const cacheKey = `${language}:${text.slice(0, 100)}`;
      if (dynamicCache.has(cacheKey)) return dynamicCache.get(cacheKey)!;

      try {
        const { data, error } = await supabase.functions.invoke("translate", {
          body: { text, targetLang: language, sourceLang },
        });

        if (error) throw error;
        const translated = data?.translated || text;
        dynamicCache.set(cacheKey, translated);
        return translated;
      } catch {
        return text;
      }
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translateDynamic }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
