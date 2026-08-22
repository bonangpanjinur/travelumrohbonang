import { db, bookingStatusLogs, notifications, sql } from "@workspace/db";
import { syncDepartureQuota } from "./seatQuota";

export interface ExpireApprovedBookingsResult {
  expired: number;
  departureIds: string[];
}

/**
 * Expires approved bookings whose approval window elapsed without any payment.
 * The database query is idempotent and locks candidates to avoid duplicate work
 * when more than one cron invocation overlaps.
 */
export async function expireApprovedBookings(): Promise<ExpireApprovedBookingsResult> {
  return db.transaction(async (tx) => {
    const result = await tx.execute(sql`
      WITH candidates AS (
        SELECT b.id, b.departure_id, b.user_id
        FROM bookings b
        WHERE b.status = 'confirmed'
          AND b.approval_expires_at IS NOT NULL
          AND b.approval_expires_at <= NOW()
          AND NOT EXISTS (
            SELECT 1
            FROM booking_payments p
            WHERE p.booking_id = b.id
              AND p.is_voided = false
          )
        FOR UPDATE SKIP LOCKED
      )
      UPDATE bookings b
      SET status = 'expired', approval_expires_at = NULL
      FROM candidates c
      WHERE b.id = c.id
      RETURNING b.id, b.departure_id, b.user_id
    `);

    const rows = ((result as any).rows ?? result) as Array<{
      id: string;
      departure_id: string | null;
      user_id: string | null;
    }>;
    const departureIds = [...new Set(rows.flatMap((row) => row.departure_id ? [row.departure_id] : []))];

    for (const row of rows) {
      await tx.insert(bookingStatusLogs).values({
        id: crypto.randomUUID(),
        bookingId: row.id,
        fromStatus: "confirmed",
        toStatus: "expired",
        changedBy: "system",
        notes: "Booking otomatis expired karena belum ada pembayaran sampai batas waktu approval.",
      });
      if (row.user_id) {
        await tx.insert(notifications).values({
          id: crypto.randomUUID(),
          userId: row.user_id,
          title: "Booking Expired",
          message: "Booking Anda expired karena belum ada pembayaran sampai batas waktu. Silakan membuat booking baru jika masih ingin berangkat.",
          isRead: false,
          createdAt: new Date(),
        });
      }
    }

    for (const departureId of departureIds) {
      await syncDepartureQuota(departureId, tx);
    }

    return { expired: rows.length, departureIds };
  });
}

/** Start the five-minute fallback scheduler for long-running API instances. */
export function startBookingApprovalExpiryCron(): void {
  const run = () => {
    void expireApprovedBookings()
      .then((result) => {
        if (result.expired > 0) {
          console.info(`[bookingExpiryCron] Expired ${result.expired} booking(s)`);
        }
      })
      .catch((error) => {
        console.error("[bookingExpiryCron] Failed to expire bookings:", error);
      });
  };
  run();
  setInterval(run, 5 * 60 * 1000);
}
