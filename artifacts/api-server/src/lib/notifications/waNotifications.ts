/**
 * WhatsApp dispatch — wires business events to the @workspace/whatsapp templates.
 *
 * Design contract: every exported function NEVER rejects/throws. They catch
 * ALL errors internally so `void waNotifications.x()` call-sites can never
 * produce an unhandled promise rejection that crashes/poisons the Node process.
 */

import { db, bookings, profiles, packages, eq, and, inArray } from "@workspace/db";
import {
  sendWhatsApp,
  bookingCreatedWA,
  paymentReceivedWA,
  documentsCompleteWA,
  departureReminderWA,
} from "@workspace/whatsapp";

interface BookingWAContext {
  phone: string;
  jamaahName: string;
  bookingCode: string;
  packageName: string;
  totalPrice: number;
}

/** Resolves booking → profile phone. Returns null (never throws). */
async function getBookingWAContext(bookingId: string): Promise<BookingWAContext | null> {
  try {
    const [row] = await db
      .select({
        phone: profiles.phone,
        jamaahName: profiles.name,
        bookingCode: bookings.bookingCode,
        packageName: packages.title,
        totalPrice: bookings.totalPrice,
      })
      .from(bookings)
      .leftJoin(profiles, eq(profiles.id, bookings.userId))
      .leftJoin(packages, eq(packages.id, bookings.packageId))
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!row || !row.phone) {
      console.warn(`[waNotifications] bookingId=${bookingId} has no phone — skipping WA`);
      return null;
    }

    return {
      phone: row.phone,
      jamaahName: row.jamaahName ?? "Jamaah",
      bookingCode: row.bookingCode,
      packageName: row.packageName ?? "Paket Umroh",
      totalPrice: row.totalPrice,
    };
  } catch (err) {
    console.error(`[waNotifications] getBookingWAContext(${bookingId}) failed:`, err);
    return null;
  }
}

export const waNotifications = {
  /** F-04: sent right after a booking row is inserted. */
  async bookingCreated(bookingId: string): Promise<void> {
    try {
      const ctx = await getBookingWAContext(bookingId);
      if (!ctx) return;
      const message = bookingCreatedWA({
        jamaahName: ctx.jamaahName,
        bookingCode: ctx.bookingCode,
        packageName: ctx.packageName,
        totalAmount: ctx.totalPrice,
      });
      await sendWhatsApp({ to: ctx.phone, message });
    } catch (err) {
      console.error("[waNotifications] bookingCreated failed:", err);
    }
  },

  /** F-04: sent after webhook or admin verification confirms a payment. */
  async paymentReceived(bookingId: string, amountPaid: number): Promise<void> {
    try {
      const ctx = await getBookingWAContext(bookingId);
      if (!ctx) return;
      const message = paymentReceivedWA({
        jamaahName: ctx.jamaahName,
        bookingCode: ctx.bookingCode,
        packageName: ctx.packageName,
        amountPaid,
      });
      await sendWhatsApp({ to: ctx.phone, message });
    } catch (err) {
      console.error("[waNotifications] paymentReceived failed:", err);
    }
  },

  /** F-04: sent once every required document is verified. */
  async documentsComplete(bookingId: string): Promise<void> {
    try {
      const ctx = await getBookingWAContext(bookingId);
      if (!ctx) return;
      const message = documentsCompleteWA({
        jamaahName: ctx.jamaahName,
        bookingCode: ctx.bookingCode,
      });
      await sendWhatsApp({ to: ctx.phone, message });
    } catch (err) {
      console.error("[waNotifications] documentsComplete failed:", err);
    }
  },

  /** F-04 template ready; wire up when H-14 cron is built (F-05). */
  async departureReminder(
    phone: string,
    data: { jamaahName: string; bookingCode: string; packageName: string; departureDate: string },
  ): Promise<void> {
    try {
      const message = departureReminderWA(data);
      await sendWhatsApp({ to: phone, message });
    } catch (err) {
      console.error("[waNotifications] departureReminder failed:", err);
    }
  },

  /**
   * F-04 WA Blast — sends a custom message to ALL jamaah in a departure.
   * Returns { sent, skipped } counts for admin feedback.
   * Never throws — skips rows on error.
   */
  async blast(
    departureId: string,
    message: string,
  ): Promise<{ sent: number; skipped: number }> {
    let rows: { phone: string | null; jamaahName: string | null; bookingCode: string }[] = [];
    try {
      rows = await db
        .select({
          phone: profiles.phone,
          jamaahName: profiles.name,
          bookingCode: bookings.bookingCode,
        })
        .from(bookings)
        .leftJoin(profiles, eq(profiles.id, bookings.userId))
        .where(
          and(
            eq(bookings.departureId, departureId),
            inArray(bookings.status, ["confirmed", "pending", "dp_paid"]),
          ),
        );
    } catch (err) {
      console.error("[waNotifications] blast: failed to fetch recipients:", err);
      return { sent: 0, skipped: 0 };
    }

    let sent = 0;
    let skipped = 0;

    for (const row of rows) {
      if (!row.phone) { skipped++; continue; }
      try {
        const result = await sendWhatsApp({ to: row.phone, message });
        if (result.sent) sent++;
        else skipped++;
      } catch {
        skipped++;
      }
      // Small delay between messages to avoid Fonnte rate limiting
      await new Promise((r) => setTimeout(r, 300));
    }

    return { sent, skipped };
  },
};
