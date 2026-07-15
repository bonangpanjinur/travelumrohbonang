/**
 * Email dispatch — wires business events to the @workspace/email templates.
 *
 * Design contract: every exported function NEVER rejects/throws. They catch
 * ALL errors internally (both the DB context lookup and the send) so a
 * `void emailNotifications.x()` call-site can never produce an unhandled
 * promise rejection that could crash or poison the Node process.
 */

import { db, bookings, profiles, packages, eq } from "@workspace/db";
import {
  sendEmail,
  bookingCreatedTemplate,
  paymentReceivedTemplate,
  installmentReminderTemplate,
  departureReminderTemplate,
  documentsCompleteTemplate,
  type InstallmentReminderData,
  type DepartureReminderData,
} from "@workspace/email";

interface BookingEmailContext {
  email: string;
  jamaahName: string;
  bookingCode: string;
  packageName: string;
  totalPrice: number;
}

/** Joins bookings → profiles → packages. Returns null (never throws). */
async function getBookingEmailContext(bookingId: string): Promise<BookingEmailContext | null> {
  try {
    const [row] = await db
      .select({
        email: profiles.email,
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

    if (!row || !row.email) {
      console.warn(`[emailNotifications] bookingId=${bookingId} has no resolvable jamaah email — skipping`);
      return null;
    }

    return {
      email: row.email,
      jamaahName: row.jamaahName ?? "Jamaah",
      bookingCode: row.bookingCode,
      packageName: row.packageName ?? "Paket Umroh",
      totalPrice: row.totalPrice,
    };
  } catch (err) {
    console.error(`[emailNotifications] getBookingEmailContext(${bookingId}) failed:`, err);
    return null;
  }
}

export const emailNotifications = {
  /** F-03: sent right after a booking row is inserted. */
  async bookingCreated(bookingId: string): Promise<void> {
    try {
      const ctx = await getBookingEmailContext(bookingId);
      if (!ctx) return;
      const { subject, html } = bookingCreatedTemplate({
        jamaahName: ctx.jamaahName,
        bookingCode: ctx.bookingCode,
        packageName: ctx.packageName,
        totalAmount: ctx.totalPrice,
      });
      await sendEmail({ to: ctx.email, subject, html });
    } catch (err) {
      console.error("[emailNotifications] bookingCreated failed:", err);
    }
  },

  /** F-03: sent after a webhook or admin verification confirms a payment. */
  async paymentReceived(bookingId: string, amountPaid: number): Promise<void> {
    try {
      const ctx = await getBookingEmailContext(bookingId);
      if (!ctx) return;
      const { subject, html } = paymentReceivedTemplate({
        jamaahName: ctx.jamaahName,
        bookingCode: ctx.bookingCode,
        packageName: ctx.packageName,
        amountPaid,
      });
      await sendEmail({ to: ctx.email, subject, html });
    } catch (err) {
      console.error("[emailNotifications] paymentReceived failed:", err);
    }
  },

  /** F-03: sent once every required document for the booking is verified. */
  async documentsComplete(bookingId: string): Promise<void> {
    try {
      const ctx = await getBookingEmailContext(bookingId);
      if (!ctx) return;
      const { subject, html } = documentsCompleteTemplate({
        jamaahName: ctx.jamaahName,
        bookingCode: ctx.bookingCode,
      });
      await sendEmail({ to: ctx.email, subject, html });
    } catch (err) {
      console.error("[emailNotifications] documentsComplete failed:", err);
    }
  },

  /**
   * F-03 template ready; called by F-05 installment cron job when built.
   * Also non-throwing.
   */
  async installmentReminder(email: string, data: InstallmentReminderData): Promise<void> {
    try {
      const { subject, html } = installmentReminderTemplate(data);
      await sendEmail({ to: email, subject, html });
    } catch (err) {
      console.error("[emailNotifications] installmentReminder failed:", err);
    }
  },

  /**
   * F-03 template ready; called by H-14 departure cron when built.
   */
  async departureReminder(email: string, data: DepartureReminderData): Promise<void> {
    try {
      const { subject, html } = departureReminderTemplate(data);
      await sendEmail({ to: email, subject, html });
    } catch (err) {
      console.error("[emailNotifications] departureReminder failed:", err);
    }
  },
};
