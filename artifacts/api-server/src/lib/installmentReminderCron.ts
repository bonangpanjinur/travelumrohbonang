/**
 * F-05: H-7 Installment Reminder — daily cron job.
 *
 * Runs once per day at ~08:00 WIB (01:00 UTC).
 * Finds all pending installments with due_date exactly 7 days from today
 * and sends WA + email reminders.
 *
 * Design: uses setInterval (no external cron package needed).
 * The interval fires every hour and checks whether the current UTC hour
 * matches the target. Idempotent — re-running on the same day is safe
 * because reminders are gated on the exact 7-day window.
 */

import { db, installmentSchedules, bookings, packages, profiles, eq, and } from "@workspace/db";
import { waNotifications } from "./notifications/waNotifications";
import { emailNotifications } from "./notifications/emailNotifications";
import type { InstallmentReminderData } from "@workspace/email";

const TARGET_UTC_HOUR = 1; // 01:00 UTC = 08:00 WIB
const HOUR_MS = 60 * 60 * 1_000;

let lastRunDate: string | null = null; // ISO date string "YYYY-MM-DD"

/**
 * Send H-7 reminders for all pending installments due in exactly 7 days.
 * Never throws.
 */
export async function sendInstallmentReminders(): Promise<void> {
  try {
    const today = new Date();
    // Target: due_date is between now+6d 23h and now+7d 23h (±12h window)
    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() + 6);
    windowStart.setHours(0, 0, 0, 0);
    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + 8);
    windowEnd.setHours(0, 0, 0, 0);

    // Fetch pending installments in the 7-day window with booking + profile context
    const rows = await db
      .select({
        installmentId: installmentSchedules.id,
        bookingId: installmentSchedules.bookingId,
        installmentNumber: installmentSchedules.installmentNumber,
        dueDate: installmentSchedules.dueDate,
        amount: installmentSchedules.amount,
        bookingCode: bookings.bookingCode,
        packageName: packages.title,
        jamaahName: profiles.name,
        email: profiles.email,
        phone: profiles.phone,
      })
      .from(installmentSchedules)
      .leftJoin(bookings, eq(bookings.id, installmentSchedules.bookingId))
      .leftJoin(packages, eq(packages.id, bookings.packageId))
      .leftJoin(profiles, eq(profiles.id, bookings.userId))
      .where(eq(installmentSchedules.status, "pending"));

    // Filter in-process (Drizzle between not available without sql``)
    const due = rows.filter((r) => {
      if (!r.dueDate) return false;
      return r.dueDate >= windowStart && r.dueDate < windowEnd;
    });

    console.info(`[installmentCron] Found ${due.length} installments to remind`);

    for (const row of due) {
      const dueDateStr = row.dueDate
        ? new Intl.DateTimeFormat("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            timeZone: "Asia/Jakarta",
          }).format(row.dueDate)
        : "-";

      const waData = {
        jamaahName: row.jamaahName ?? "Jamaah",
        bookingCode: row.bookingCode ?? "-",
        packageName: row.packageName ?? "Paket Umroh",
        installmentNumber: row.installmentNumber,
        amountDue: row.amount,
        dueDate: dueDateStr,
      };

      const emailData: InstallmentReminderData = {
        jamaahName: row.jamaahName ?? "Jamaah",
        bookingCode: row.bookingCode ?? "-",
        installmentNumber: row.installmentNumber,
        amountDue: row.amount,
        dueDate: dueDateStr,
      };

      // Fire-and-forget both channels
      if (row.phone) void waNotifications.installmentReminder(row.phone, waData);
      if (row.email) void emailNotifications.installmentReminder(row.email, emailData);
    }
  } catch (err) {
    console.error("[installmentCron] sendInstallmentReminders failed:", err);
  }
}

/**
 * Start the daily H-7 reminder scheduler.
 * Call once at server startup.
 */
export function startInstallmentReminderCron(): void {
  console.info("[installmentCron] Scheduler started — fires daily at 08:00 WIB (01:00 UTC)");

  setInterval(() => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const todayDate = now.toISOString().slice(0, 10); // "YYYY-MM-DD"

    if (utcHour === TARGET_UTC_HOUR && lastRunDate !== todayDate) {
      lastRunDate = todayDate;
      console.info(`[installmentCron] Triggering H-7 reminders for ${todayDate}`);
      void sendInstallmentReminders();
    }
  }, HOUR_MS);
}
