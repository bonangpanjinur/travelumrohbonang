import { useCallback, useState } from "react";

const STORAGE_KEY = "admin-sidebar-favorites";

function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeFavorites(hrefs: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hrefs));
  } catch {
    // ignore storage errors (private browsing, quota, etc.)
  }
}

/** Persists a set of pinned sidebar menu hrefs in localStorage. */
export function useSidebarFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => readFavorites());

  const toggleFavorite = useCallback((href: string) => {
    setFavorites((prev) => {
      const next = prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href];
      writeFavorites(next);
      return next;
    });
  }, []);

  return { favorites, toggleFavorite };
}
