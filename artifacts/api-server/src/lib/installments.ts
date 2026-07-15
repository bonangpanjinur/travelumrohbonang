/**
 * F-05: Installment Schedule Business Logic
 *
 * Generates a cicilan (installment) schedule when a booking is created with
 * paymentScheme = 'dp' | 'installment' | 'cicilan'.
 *
 * Schedule layout:
 *   installmentNumber = 0  → DP (down payment)
 *   installmentNumber = 1..n → monthly installments
 *
 * Due date rules:
 *   DP due  = booking.createdAt + dpDeadlineDays (fallback: 7 days)
 *   Full due = booking.createdAt + fullDeadlineDays (fallback: 90 days)
 *   Cicilan = split remaining evenly across months between DP and full due date
 */

import {
  db,
  bookings,
  packages,
  installmentSchedules,
  eq,
  and,
} from "@workspace/db";

const INSTALLMENT_SCHEMES = new Set(["dp", "installment", "cicilan"]);

/** Returns true if this paymentScheme should generate a cicilan schedule. */
export function requiresInstallmentSchedule(paymentScheme: string | null | undefined): boolean {
  if (!paymentScheme) return false;
  return INSTALLMENT_SCHEMES.has(paymentScheme.toLowerCase());
}

export interface InstallmentRow {
  installmentNumber: number;
  dueDate: Date;
  amount: number;
}

/**
 * Computes the installment rows for a booking.
 * Does NOT insert into DB — call generateInstallmentSchedule() for that.
 */
export function computeInstallmentRows(opts: {
  totalPrice: number;
  minimumDp: number | null;
  dpDeadlineDays: number | null;
  fullDeadlineDays: number | null;
  createdAt: Date;
}): InstallmentRow[] {
  const { totalPrice, createdAt } = opts;

  const dpDeadlineDays = opts.dpDeadlineDays ?? 7;
  const fullDeadlineDays = opts.fullDeadlineDays ?? 90;
  const dpAmount = opts.minimumDp && opts.minimumDp > 0
    ? Math.min(opts.minimumDp, totalPrice)
    : Math.round(totalPrice * 0.3); // default: 30%

  const dpDueDate = new Date(createdAt);
  dpDueDate.setDate(dpDueDate.getDate() + dpDeadlineDays);

  const rows: InstallmentRow[] = [
    { installmentNumber: 0, dueDate: dpDueDate, amount: dpAmount },
  ];

  const remaining = totalPrice - dpAmount;
  if (remaining <= 0) return rows;

  // Number of monthly installments between DP deadline and full deadline
  const daySpan = fullDeadlineDays - dpDeadlineDays;
  const numInstallments = Math.max(1, Math.floor(daySpan / 30));
  const installmentAmount = Math.round(remaining / numInstallments);

  for (let i = 1; i <= numInstallments; i++) {
    const dueDate = new Date(dpDueDate);
    dueDate.setDate(dueDate.getDate() + i * 30);
    // Last installment absorbs rounding diff
    const amount =
      i === numInstallments
        ? remaining - installmentAmount * (numInstallments - 1)
        : installmentAmount;
    rows.push({ installmentNumber: i, dueDate, amount });
  }

  return rows;
}

/**
 * F-05: Generate and persist installment schedule for a booking.
 * Safe to call multiple times — skips if schedule already exists.
 * Never throws — logs errors and returns gracefully.
 */
export async function generateInstallmentSchedule(
  bookingId: string,
  packageId: string | null | undefined,
): Promise<void> {
  try {
    // Check if schedule already exists (idempotent)
    const existing = await db
      .select({ id: installmentSchedules.id })
      .from(installmentSchedules)
      .where(eq(installmentSchedules.bookingId, bookingId))
      .limit(1);

    if (existing.length > 0) {
      console.info(`[installments] schedule already exists for bookingId=${bookingId} — skipping`);
      return;
    }

    // Fetch booking + package info
    const [row] = await db
      .select({
        totalPrice: bookings.totalPrice,
        paymentScheme: bookings.paymentScheme,
        createdAt: bookings.createdAt,
        minimumDp: packages.minimumDp,
        dpDeadlineDays: packages.dpDeadlineDays,
        fullDeadlineDays: packages.fullDeadlineDays,
      })
      .from(bookings)
      .leftJoin(packages, eq(packages.id, bookings.packageId))
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!row) {
      console.warn(`[installments] bookingId=${bookingId} not found`);
      return;
    }

    if (!requiresInstallmentSchedule(row.paymentScheme)) {
      return; // Not a cicilan booking
    }

    const installmentRows = computeInstallmentRows({
      totalPrice: row.totalPrice,
      minimumDp: row.minimumDp ?? null,
      dpDeadlineDays: row.dpDeadlineDays ?? null,
      fullDeadlineDays: row.fullDeadlineDays ?? null,
      createdAt: row.createdAt ?? new Date(),
    });

    await db.insert(installmentSchedules).values(
      installmentRows.map((r) => ({
        id: crypto.randomUUID(),
        bookingId,
        installmentNumber: r.installmentNumber,
        dueDate: r.dueDate,
        amount: r.amount,
        status: "pending" as const,
        createdAt: new Date(),
      })),
    );

    console.info(
      `[installments] generated ${installmentRows.length} installments for bookingId=${bookingId}`,
    );
  } catch (err) {
    console.error(`[installments] generateInstallmentSchedule(${bookingId}) failed:`, err);
  }
}

/**
 * Mark an installment as paid and link it to a gateway order.
 */
export async function markInstallmentPaid(
  installmentScheduleId: string,
  gatewayOrderId: string,
): Promise<void> {
  try {
    await db
      .update(installmentSchedules)
      .set({
        status: "paid",
        paidAt: new Date(),
        paymentGatewayOrderId: gatewayOrderId,
      })
      .where(
        and(
          eq(installmentSchedules.id, installmentScheduleId),
          eq(installmentSchedules.status, "pending"),
        ),
      );
  } catch (err) {
    console.error(`[installments] markInstallmentPaid(${installmentScheduleId}) failed:`, err);
  }
}

/**
 * Lazily sync overdue status for pending installments of a booking.
 * Fetches all pending rows, marks past-due ones as 'overdue' in JS.
 * Called when a user views their installments to keep status fresh.
 */
export async function syncOverdueStatus(bookingId: string): Promise<void> {
  try {
    const { inArray } = await import("@workspace/db");
    const rows = await db
      .select({ id: installmentSchedules.id, dueDate: installmentSchedules.dueDate, status: installmentSchedules.status })
      .from(installmentSchedules)
      .where(and(eq(installmentSchedules.bookingId, bookingId), eq(installmentSchedules.status, "pending")));

    const now = new Date();
    const overdueIds = rows.filter((r) => r.dueDate && r.dueDate < now).map((r) => r.id);
    if (overdueIds.length === 0) return;

    await db
      .update(installmentSchedules)
      .set({ status: "overdue" })
      .where(inArray(installmentSchedules.id, overdueIds));
  } catch (err) {
    console.error(`[installments] syncOverdueStatus(${bookingId}) failed:`, err);
  }
}
