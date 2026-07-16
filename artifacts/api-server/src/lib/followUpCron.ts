/**
 * CRM Follow-up Reminder Cron
 *
 * Runs once per day at 08:00 WIB (01:00 UTC).
 * Finds pending follow-ups that are overdue or due today and logs a summary.
 * If WhatsApp is configured, sends a WA reminder to the admin/assignee.
 *
 * Pattern matches installmentReminderCron: setInterval every hour, fires
 * only when the UTC hour matches the target. Idempotent within a day.
 */

import { db, leads, leadFollowUps, eq, and, lte } from "@workspace/db";
import { waNotifications } from "./notifications/waNotifications";

const TARGET_UTC_HOUR = 1; // 01:00 UTC = 08:00 WIB
const HOUR_MS = 60 * 60 * 1_000;

let lastRunDate: string | null = null;

export async function sendFollowUpReminders(): Promise<void> {
  try {
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // All pending follow-ups due by end of today (includes overdue)
    const pending = await db
      .select({
        id: leadFollowUps.id,
        leadId: leadFollowUps.leadId,
        followUpDate: leadFollowUps.followUpDate,
        type: leadFollowUps.type,
        notes: leadFollowUps.notes,
        leadName: leads.name,
        leadPhone: leads.phone,
        assignedTo: leads.assignedTo,
      })
      .from(leadFollowUps)
      .leftJoin(leads, eq(leadFollowUps.leadId, leads.id))
      .where(
        and(
          eq(leadFollowUps.isDone, false),
          lte(leadFollowUps.followUpDate, todayEnd),
        ),
      );

    console.info(`[followUpCron] ${pending.length} follow-up(s) due today or overdue`);

    for (const fu of pending) {
      const fuDate = fu.followUpDate ? new Intl.DateTimeFormat("id-ID", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }).format(fu.followUpDate) : "-";

      const typeLabel: Record<string, string> = {
        call: "Telepon", whatsapp: "WhatsApp", email: "Email", meeting: "Meeting",
      };

      console.info(
        `[followUpCron] → ${fu.leadName ?? "Lead"} | ${typeLabel[fu.type ?? ""] ?? fu.type ?? "-"} | ${fuDate}`,
      );

      // If the lead has a phone and WA is configured, send a brief reminder
      // to the assignee (or lead itself for self-serve future feature)
      try {
        if (fu.assignedTo && fu.leadPhone) {
          await waNotifications.customMessage?.(fu.assignedTo, {
            message:
              `📌 *Follow-up Reminder*\n\n` +
              `Lead: *${fu.leadName ?? "-"}*\n` +
              `Tipe: ${typeLabel[fu.type ?? ""] ?? fu.type ?? "-"}\n` +
              `Jadwal: ${fuDate}\n` +
              `HP Lead: ${fu.leadPhone}\n` +
              (fu.notes ? `Catatan: ${fu.notes}` : ""),
          });
        }
      } catch {
        // WA not configured — skip silently
      }
    }
  } catch (err) {
    console.error("[followUpCron] sendFollowUpReminders failed:", err);
  }
}

export function startFollowUpCron(): void {
  const tick = async () => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const todayStr = now.toISOString().slice(0, 10);

    if (utcHour === TARGET_UTC_HOUR && lastRunDate !== todayStr) {
      lastRunDate = todayStr;
      await sendFollowUpReminders();
    }
  };

  // Run once immediately on startup (won't fire reminders unless it's 01:00 UTC)
  void tick();
  setInterval(tick, HOUR_MS);

  console.info("[followUpCron] Scheduler started — fires daily at 08:00 WIB (01:00 UTC)");
}
