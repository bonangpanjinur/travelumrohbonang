/**
 * Email dispatch — wires business events to the @workspace/email templates.
 *
 * Mirrors the existing in-app notification pattern (see `createNotification`
 * in ../paymentSync.ts): callers fire-and-log, never fire-and-throw. Every
 * function here swallows its own errors (via sendEmail's internal try/catch)
 * so a Resend outage can never break a booking/payment/document request.
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

/** Joins bookings → profiles (jamaah) → packages to gather everything a template needs. */
async function getBookingEmailContext(bookingId: string): Promise<BookingEmailContext | null> {
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
}

export const emailNotifications = {
  /** F-03: sent right after a booking row is inserted. */
  async bookingCreated(bookingId: string): Promise<void> {
    const ctx = await getBookingEmailContext(bookingId);
    if (!ctx) return;
    const { subject, html } = bookingCreatedTemplate({
      jamaahName: ctx.jamaahName,
      bookingCode: ctx.bookingCode,
      packageName: ctx.packageName,
      totalAmount: ctx.totalPrice,
    });
    await sendEmail({ to: ctx.email, subject, html });
  },

  /** F-03: sent after a webhook or admin verification confirms a payment. */
  async paymentReceived(bookingId: string, amountPaid: number): Promise<void> {
    const ctx = await getBookingEmailContext(bookingId);
    if (!ctx) return;
    const { subject, html } = paymentReceivedTemplate({
      jamaahName: ctx.jamaahName,
      bookingCode: ctx.bookingCode,
      packageName: ctx.packageName,
      amountPaid,
    });
    await sendEmail({ to: ctx.email, subject, html });
  },

  /** F-03: sent once every required document for the booking is verified. */
  async documentsComplete(bookingId: string): Promise<void> {
    const ctx = await getBookingEmailContext(bookingId);
    if (!ctx) return;
    const { subject, html } = documentsCompleteTemplate({
      jamaahName: ctx.jamaahName,
      bookingCode: ctx.bookingCode,
    });
    await sendEmail({ to: ctx.email, subject, html });
  },

  /**
   * F-03 template is ready; F-05 (installment system) does not exist yet, so
   * nothing calls this today. Once F-05's cron job exists, it can call this
   * directly with the per-installment data it already computes.
   */
  async installmentReminder(email: string, data: InstallmentReminderData): Promise<void> {
    const { subject, html } = installmentReminderTemplate(data);
    await sendEmail({ to: email, subject, html });
  },

  /**
   * F-03 template is ready; no departure-reminder cron exists yet. Wire this
   * up when a scheduled job for H-14 departure reminders is built.
   */
  async departureReminder(email: string, data: DepartureReminderData): Promise<void> {
    const { subject, html } = departureReminderTemplate(data);
    await sendEmail({ to: email, subject, html });
  },
};
