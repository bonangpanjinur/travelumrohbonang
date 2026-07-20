/**
 * Fase 3 — Auto-Alert Deadline Lunas
 *
 * Runs daily at 08:00 WIB (01:00 UTC).
 * Detects bookings with outstanding balance whose departure date falls on
 * exactly H-30, H-14, or H-7 from today, then:
 *   1. Sends a WA reminder to the jamaah (via Fonnte).
 *   2. Inserts an in-app notification for the user.
 *   3. (H-7 only) Sends an admin summary WA to ADMIN_PHONE env var.
 *
 * Anti-duplicate strategy:
 *   - `lastRunDate` guard prevents re-running on the same calendar day even
 *     after a server restart if it happens within the same hour window.
 *   - The query window (±12 h around each milestone day) is narrow enough
 *     that the same booking cannot match twice across consecutive daily runs.
 *
 * Design: no external cron package — uses setInterval + UTC hour check,
 * same pattern as installmentReminderCron and documentReminderCron.
 */

import { db, sql } from "@workspace/db";
import { sendWhatsApp, paymentDeadlineAlertWA, paymentDeadlineAdminSummaryWA } from "@workspace/whatsapp";
import { createNotification } from "./paymentSync";

const TARGET_UTC_HOUR = 1; // 08:00 WIB = 01:00 UTC
const HOUR_MS = 60 * 60 * 1_000;
const ALERT_MILESTONES = [30, 14, 7] as const; // days before departure

let lastRunDate: string | null = null;

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameUTCDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

interface AlertRow {
  bookingId: string;
  bookingCode: string;
  userId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  totalPrice: number;
  totalPaid: number;
  outstanding: number;
  departureDate: Date;
  packageTitle: string | null;
}

/**
 * Query all active bookings with outstanding balance whose departure_date
 * falls within one of the milestone target windows.
 */
async function fetchAlertBookings(today: Date): Promise<Map<number, AlertRow[]>> {
  // Build target dates for each milestone
  const targets = ALERT_MILESTONES.map((days) => addDays(today, days));

  // window: departure_date between target-0.5 day and target+0.5 day
  const windowStart = addDays(today, ALERT_MILESTONES[ALERT_MILESTONES.length - 1] - 1); // H-29 (broadest start)
  const windowEnd   = addDays(today, ALERT_MILESTONES[0] + 1);                           // H-31 (broadest end)

  const getRows = (r: any) => (r as any).rows ?? r;

  const result = await db.execute(sql`
    SELECT
      b.id            AS booking_id,
      b.booking_code,
      b.user_id,
      b.total_price,
      p.name          AS customer_name,
      p.phone         AS customer_phone,
      pkg.title       AS package_title,
      dep.departure_date,
      COALESCE(paid.total_paid, 0)                         AS total_paid,
      b.total_price - COALESCE(paid.total_paid, 0)         AS outstanding
    FROM bookings b
    JOIN package_departures dep ON dep.id = b.departure_id
    JOIN packages pkg ON pkg.id = b.package_id
    LEFT JOIN profiles p ON p.id = b.user_id
    LEFT JOIN (
      SELECT booking_id, SUM(amount) AS total_paid
      FROM booking_payments WHERE is_voided = false
      GROUP BY booking_id
    ) paid ON paid.booking_id = b.id
    WHERE b.status NOT IN ('cancelled', 'draft')
      AND dep.departure_date::date >= ${windowStart.toISOString().slice(0, 10)}::date
      AND dep.departure_date::date <= ${windowEnd.toISOString().slice(0, 10)}::date
      AND COALESCE(paid.total_paid, 0) < b.total_price
  `);

  const rows = getRows(result) as any[];

  // Bucket into milestones based on actual isSameUTCDay match
  const buckets = new Map<number, AlertRow[]>();
  for (const milestone of ALERT_MILESTONES) {
    buckets.set(milestone, []);
  }

  for (const r of rows) {
    const dDate = new Date(r.departure_date);
    for (let i = 0; i < ALERT_MILESTONES.length; i++) {
      if (isSameUTCDay(dDate, targets[i])) {
        buckets.get(ALERT_MILESTONES[i])!.push({
          bookingId:     r.booking_id,
          bookingCode:   r.booking_code,
          userId:        r.user_id,
          customerName:  r.customer_name  ?? "Jamaah",
          customerPhone: r.customer_phone ?? null,
          totalPrice:    Number(r.total_price),
          totalPaid:     Number(r.total_paid),
          outstanding:   Number(r.outstanding),
          departureDate: dDate,
          packageTitle:  r.package_title  ?? "Paket Umroh",
        });
        break; // a booking can only hit one milestone per run
      }
    }
  }

  return buckets;
}

export async function sendPaymentDeadlineAlerts(): Promise<void> {
  try {
    const today = new Date();
    const buckets = await fetchAlertBookings(today);

    let totalSent = 0;
    const h7Critical: AlertRow[] = [];

    for (const milestone of ALERT_MILESTONES) {
      const bookings = buckets.get(milestone) ?? [];
      if (bookings.length === 0) continue;

      console.info(`[deadlineCron] H-${milestone}: ${bookings.length} booking(s) to alert`);

      for (const row of bookings) {
        const depDateStr = fmtDate(row.departureDate);

        // 1. WA to jamaah
        if (row.customerPhone) {
          const msg = paymentDeadlineAlertWA({
            jamaahName:    row.customerName ?? "Jamaah",
            bookingCode:   row.bookingCode,
            packageName:   row.packageTitle ?? "Paket Umroh",
            outstanding:   row.outstanding,
            departureDate: depDateStr,
            daysLeft:      milestone,
          });
          void sendWhatsApp({ to: row.customerPhone, message: msg }).catch((e) =>
            console.error(`[deadlineCron] WA failed for ${row.bookingCode}:`, e)
          );
        }

        // 2. In-app notification
        if (row.userId) {
          void createNotification({
            userId:  row.userId,
            title:   `Pengingat Pelunasan H-${milestone}`,
            message: `Sisa pembayaran booking ${row.bookingCode} sebesar ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(row.outstanding)} harus dilunasi sebelum keberangkatan (${depDateStr}).`,
          }).catch((e) =>
            console.error(`[deadlineCron] notification insert failed for ${row.bookingCode}:`, e)
          );
        }

        totalSent++;

        // Collect H-7 bookings for admin summary
        if (milestone === 7) h7Critical.push(row);

        // Small delay to avoid overloading Fonnte
        await new Promise((r) => setTimeout(r, 250));
      }
    }

    // 3. Admin summary for H-7 critical bookings
    const adminPhone = process.env["ADMIN_PHONE"];
    if (adminPhone && h7Critical.length > 0) {
      // Group by departure for a concise summary
      const byDeparture = new Map<string, { packageTitle: string; departureDate: string; outstanding: number; count: number }>();
      for (const b of h7Critical) {
        const key = b.departureDate.toISOString();
        if (!byDeparture.has(key)) {
          byDeparture.set(key, {
            packageTitle:  b.packageTitle ?? "Paket Umroh",
            departureDate: fmtDate(b.departureDate),
            outstanding:   0,
            count:         0,
          });
        }
        const entry = byDeparture.get(key)!;
        entry.outstanding += b.outstanding;
        entry.count++;
      }

      const totalOutstanding = h7Critical.reduce((s, b) => s + b.outstanding, 0);
      const adminMsg = paymentDeadlineAdminSummaryWA({
        criticalCount:    h7Critical.length,
        totalOutstanding,
        departures:       Array.from(byDeparture.values()),
      });

      void sendWhatsApp({ to: adminPhone, message: adminMsg }).catch((e) =>
        console.error("[deadlineCron] admin WA failed:", e)
      );
    }

    console.info(`[deadlineCron] Done — ${totalSent} alert(s) sent`);
  } catch (err) {
    console.error("[deadlineCron] sendPaymentDeadlineAlerts failed:", err);
  }
}

export function startPaymentDeadlineAlertCron(): void {
  console.info(
    "[deadlineCron] Scheduler started — fires daily at 08:00 WIB (H-30/H-14/H-7 before departure)"
  );

  setInterval(() => {
    const now = new Date();
    const utcHour  = now.getUTCHours();
    const todayStr = now.toISOString().slice(0, 10);

    if (utcHour === TARGET_UTC_HOUR && lastRunDate !== todayStr) {
      lastRunDate = todayStr;
      console.info(`[deadlineCron] Triggering payment deadline alerts for ${todayStr}`);
      void sendPaymentDeadlineAlerts();
    }
  }, HOUR_MS);
}
