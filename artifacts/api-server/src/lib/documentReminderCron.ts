/**
 * Document Reminder Cron — §7.1.2
 *
 * Runs daily at 08:00 WIB (01:00 UTC).
 * Sends reminders at H-60, H-30, and H-14 days before departure
 * for any pilgrim whose documents are not yet fully verified.
 */

import {
  db,
  packageDepartures,
  bookings,
  bookingPilgrims,
  pilgrimDocuments,
  packages,
  profiles,
  eq,
  and,
  inArray,
} from "@workspace/db";
import { waNotifications } from "./notifications/waNotifications";
import { emailNotifications } from "./notifications/emailNotifications";

const TARGET_UTC_HOUR = 1; // 08:00 WIB
const HOUR_MS = 60 * 60 * 1_000;
const REMINDER_DAYS = [60, 30, 14] as const;

/** Default required document types if package has no custom config */
const DEFAULT_REQUIRED_DOCS = ["paspor", "ktp", "foto"] as const;

let lastRunDate: string | null = null;

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export async function sendDocumentReminders(): Promise<void> {
  try {
    const today = new Date();

    // Build target date windows: H-60, H-30, H-14
    const targetDates = REMINDER_DAYS.map((d) => addDays(today, d));

    // Fetch upcoming departures in any of the target windows
    const departures = await db
      .select({
        id: packageDepartures.id,
        departureDate: packageDepartures.departureDate,
        packageId: packageDepartures.packageId,
        packageTitle: packages.title,
        requiredDocTypes: packages.requiredDocTypes,
      })
      .from(packageDepartures)
      .leftJoin(packages, eq(packages.id, packageDepartures.packageId))
      .where(eq(packageDepartures.status, "open"));

    // Filter only departures that match a reminder window
    const relevantDepartures = departures.filter((dep: typeof departures[number]) => {
      if (!dep.departureDate) return false;
      const dDate = new Date(dep.departureDate as string);
      return targetDates.some((t) => isSameDay(dDate, t));
    });

    if (relevantDepartures.length === 0) return;

    for (const dep of relevantDepartures) {
      const dDate = new Date(dep.departureDate!);
      const daysUntil = Math.round(
        (dDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
      );

      // Get required doc types for this package
      let requiredDocs: string[] = DEFAULT_REQUIRED_DOCS.slice();
      if (dep.requiredDocTypes) {
        try {
          requiredDocs = JSON.parse(dep.requiredDocTypes) as string[];
        } catch {
          // use default
        }
      }

      // Find all bookings for this departure
      const depBookings = await db
        .select({
          id: bookings.id,
          userId: bookings.userId,
          bookingCode: bookings.bookingCode,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.departureId, dep.id),
            inArray(bookings.status, ["confirmed", "paid", "pending"])
          )
        );

      for (const booking of depBookings) {
        // Get pilgrims for this booking
        const pilgrims = await db
          .select({
            id: bookingPilgrims.id,
            name: bookingPilgrims.name,
          })
          .from(bookingPilgrims)
          .where(eq(bookingPilgrims.bookingId, booking.id));

        // Get uploaded docs for this booking
        const uploadedDocs = await db
          .select({
            pilgrimId: pilgrimDocuments.pilgrimId,
            documentType: pilgrimDocuments.documentType,
            status: pilgrimDocuments.status,
          })
          .from(pilgrimDocuments)
          .where(eq(pilgrimDocuments.bookingId, booking.id));

        // Check if any pilgrim has incomplete docs
        const hasIncomplete = pilgrims.some((pilgrim: { id: string }) => {
          const pilDocs = uploadedDocs.filter(
            (d: { pilgrimId: string }) => d.pilgrimId === pilgrim.id
          );
          return requiredDocs.some(
            (dt) =>
              !pilDocs.some(
                (d: { documentType: string; status: string }) =>
                  d.documentType === dt && d.status === "verified"
              )
          );
        });

        if (!hasIncomplete) continue;

        // Fetch user contact info
        if (!booking.userId) continue;
        const [profile] = await db
          .select({ name: profiles.name, email: profiles.email, phone: profiles.phone })
          .from(profiles)
          .where(eq(profiles.id, booking.userId))
          .limit(1);

        if (!profile) continue;

        const message = {
          jamaahName: profile.name ?? "Jamaah",
          bookingCode: booking.bookingCode,
          packageName: dep.packageTitle ?? "Paket Umroh",
          daysUntilDeparture: daysUntil,
          departureDate: new Intl.DateTimeFormat("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            timeZone: "Asia/Jakarta",
          }).format(dDate),
        };

        if (profile.phone)
          void waNotifications.documentReminder(profile.phone, message);
        if (profile.email)
          void emailNotifications.documentReminder(profile.email, message);
      }
    }

    console.info(`[documentCron] Reminders sent for ${relevantDepartures.length} departures`);
  } catch (err) {
    console.error("[documentCron] sendDocumentReminders failed:", err);
  }
}

export function startDocumentReminderCron(): void {
  console.info(
    "[documentCron] Scheduler started — fires daily at 08:00 WIB (H-60/H-30/H-14)"
  );

  setInterval(() => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const todayDate = now.toISOString().slice(0, 10);

    if (utcHour === TARGET_UTC_HOUR && lastRunDate !== todayDate) {
      lastRunDate = todayDate;
      console.info(`[documentCron] Triggering document reminders for ${todayDate}`);
      void sendDocumentReminders();
    }
  }, HOUR_MS);
}
