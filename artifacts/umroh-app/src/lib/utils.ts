import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO, isValid } from "date-fns";
import type { Locale } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely format a date value (string | Date | null | undefined).
 * Returns `fallback` (default "-") instead of crashing on invalid/null dates.
 */
export function safeFormatDate(
  value: string | Date | null | undefined,
  fmt: string,
  options?: { locale?: Locale; fallback?: string },
): string {
  const fallback = options?.fallback ?? "-";
  if (!value) return fallback;
  try {
    const date = typeof value === "string" ? parseISO(value) : value;
    if (!isValid(date)) return fallback;
    return format(date, fmt, { locale: options?.locale });
  } catch {
    return fallback;
  }
}
