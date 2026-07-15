import { useEffect, useState } from "react";

const STORAGE_KEY = "admin-sidebar-recent";
const MAX_RECENT = 5;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeRecent(hrefs: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hrefs));
  } catch {
    // ignore storage errors (private browsing, quota, etc.)
  }
}

/** Tracks the last few distinct admin pages visited (by href), most recent first. */
export function useSidebarRecent(pathname: string, knownHrefs: Set<string>) {
  const [recent, setRecent] = useState<string[]>(() => readRecent());

  useEffect(() => {
    if (!knownHrefs.has(pathname)) return;
    setRecent((prev) => {
      if (prev[0] === pathname) return prev;
      const next = [pathname, ...prev.filter((h) => h !== pathname)].slice(0, MAX_RECENT);
      writeRecent(next);
      return next;
    });
  }, [pathname, knownHrefs]);

  return recent;
}
