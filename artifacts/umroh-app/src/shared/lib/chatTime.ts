/**
 * chatTime.ts — Sprint 6 (chat_architecture.md)
 *
 * Shared timestamp formatting utilities for all chat surfaces.
 * Uses date-fns (already in the dependency tree).
 */

import {
  differenceInMinutes,
  differenceInHours,
  isToday,
  isYesterday,
  format,
} from "date-fns";
import { id as localeId } from "date-fns/locale";

/**
 * Relative timestamp for conversation list items (the "last message" label).
 * Examples: "Baru saja" · "5 menit lalu" · "Kemarin 14:30" · "23 Jul"
 */
export function formatConvTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const mins = differenceInMinutes(now, d);

  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} menit lalu`;

  const hrs = differenceInHours(now, d);
  if (isToday(d)) {
    if (hrs < 12) return `${hrs} jam lalu`;
    return format(d, "HH:mm");
  }
  if (isYesterday(d)) return `Kemarin ${format(d, "HH:mm")}`;

  return format(d, "d MMM", { locale: localeId });
}

/**
 * Full timestamp for message bubbles.
 * Examples: "Baru saja" · "5 menit lalu" · "Kemarin 14:30" · "23 Jul 2025, 14:30"
 */
export function formatBubbleTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const mins = differenceInMinutes(now, d);

  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} menit lalu`;

  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return `Kemarin ${format(d, "HH:mm")}`;

  return format(d, "d MMM yyyy, HH:mm", { locale: localeId });
}

/**
 * Day label for message group separators.
 * Examples: "Hari ini" · "Kemarin" · "Senin, 21 Juli 2025"
 */
export function getDayLabel(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  if (isToday(d)) return "Hari ini";
  if (isYesterday(d)) return "Kemarin";
  return format(d, "EEEE, d MMMM yyyy", { locale: localeId });
}
