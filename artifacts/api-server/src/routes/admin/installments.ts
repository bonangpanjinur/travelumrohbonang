/**
 * F-05: Admin Installment Schedule Routes
 *
 * GET  /api/admin/installments          — all installments (filterable by status/bookingId)
 * GET  /api/admin/installments/overdue  — overdue installments only
 * POST /api/admin/installments/send-reminders — manually trigger H-7 reminders
 */

import { Router } from "express";
import {
  db,
  installmentSchedules,
  bookings,
  packages,
  profiles,
  eq,
  and,
  desc,
  asc,
} from "@workspace/db";
import { sendInstallmentReminders } from "../../lib/installmentReminderCron";

const router = Router();

// ── GET /overdue — must be before /:id to avoid route shadowing ───────────────
router.get("/overdue", async (req, res) => {
  try {
    const now = new Date();

    const rows = await db
      .select({
        id: installmentSchedules.id,
        bookingId: installmentSchedules.bookingId,
        installmentNumber: installmentSchedules.installmentNumber,
        dueDate: installmentSchedules.dueDate,
        amount: installmentSchedules.amount,
        status: installmentSchedules.status,
        paidAt: installmentSchedules.paidAt,
        bookingCode: bookings.bookingCode,
        packageName: packages.title,
        jamaahName: profiles.name,
        jamaahEmail: profiles.email,
        jamaahPhone: profiles.phone,
      })
      .from(installmentSchedules)
      .leftJoin(bookings, eq(bookings.id, installmentSchedules.bookingId))
      .leftJoin(packages, eq(packages.id, bookings.packageId))
      .leftJoin(profiles, eq(profiles.id, bookings.userId))
      .where(eq(installmentSchedules.status, "pending"))
      .orderBy(asc(installmentSchedules.dueDate));

    // Filter past due in JS (avoids raw sql)
    const overdue = rows.filter((r) => r.dueDate && r.dueDate < now);

    res.json({ data: overdue, total: overdue.length });
  } catch (err) {
    console.error("[admin/installments] overdue:", err);
    res.status(500).json({ error: "Failed to fetch overdue installments" });
  }
});

// ── POST /send-reminders — manual trigger ─────────────────────────────────────
router.post("/send-reminders", async (_req, res) => {
  try {
    await sendInstallmentReminders();
    res.json({ ok: true, message: "Reminder job triggered" });
  } catch (err) {
    console.error("[admin/installments] send-reminders:", err);
    res.status(500).json({ error: "Failed to trigger reminders" });
  }
});

// ── GET / — all installments with optional filters ───────────────────────────
router.get("/", async (req, res) => {
  try {
    const { status, bookingId } = req.query as {
      status?: string;
      bookingId?: string;
    };

    const conditions: Parameters<typeof and>[0][] = [];
    if (status) conditions.push(eq(installmentSchedules.status, status));
    if (bookingId) conditions.push(eq(installmentSchedules.bookingId, bookingId));

    const rows = await db
      .select({
        id: installmentSchedules.id,
        bookingId: installmentSchedules.bookingId,
        installmentNumber: installmentSchedules.installmentNumber,
        dueDate: installmentSchedules.dueDate,
        amount: installmentSchedules.amount,
        status: installmentSchedules.status,
        paidAt: installmentSchedules.paidAt,
        paymentGatewayOrderId: installmentSchedules.paymentGatewayOrderId,
        createdAt: installmentSchedules.createdAt,
        bookingCode: bookings.bookingCode,
        packageName: packages.title,
        jamaahName: profiles.name,
        jamaahEmail: profiles.email,
        jamaahPhone: profiles.phone,
      })
      .from(installmentSchedules)
      .leftJoin(bookings, eq(bookings.id, installmentSchedules.bookingId))
      .leftJoin(packages, eq(packages.id, bookings.packageId))
      .leftJoin(profiles, eq(profiles.id, bookings.userId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(installmentSchedules.dueDate));

    res.json({ data: rows, total: rows.length });
  } catch (err) {
    console.error("[admin/installments] list:", err);
    res.status(500).json({ error: "Failed to fetch installments" });
  }
});

export default router;
