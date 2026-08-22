import { db, sql } from "@workspace/db";

/**
 * Aturan kursi (seat) keberangkatan:
 * - Kursi berkurang ketika booking sudah di-approve (status confirmed) atau
 *   sudah selesai (completed), walaupun pembayaran belum lunas.
 * - Booking baru/draft/pending/waiting_payment belum mengurangi kursi.
 * - Booking dibatalkan / dihapus otomatis mengembalikan kursi (karena dihitung ulang).
 *
 * Semua perhitungan sisa kursi harus memakai helper ini agar konsisten
 * antara halaman paket, jadwal keberangkatan, dan admin.
 */
/** Booking yang sudah di-approve memegang seat, meskipun belum ada pembayaran. */
export const SEAT_RESERVED_STATUSES = ["confirmed", "completed"] as const;
export function isSeatReservedStatus(status?: string | null): boolean {
  return status === "confirmed" || status === "completed";
}
export const SEAT_RESERVED_CONDITION = sql`
  b.status IN ('confirmed', 'completed')
`;

/** Jumlah kursi terpakai (booking approved/completed) per departure. */
export async function getFilledSeatsMap(depIds: string[]): Promise<Map<string, number>> {
  if (!depIds.length) return new Map();
  // NOTE: interpolating a JS array in drizzle's `sql` expands it into a tuple
  // ($1, $2, ...) which is NOT a valid array for `= ANY(...)` (Postgres 42846).
  // Pass a single comma-separated text param and split it server-side instead.
  const idsCsv = depIds.join(",");
  const result = await db.execute(sql`
    SELECT b.departure_id AS departure_id,
           COALESCE(SUM(b.pax_count), 0)::int AS filled
    FROM bookings b
    WHERE b.departure_id::text = ANY(string_to_array(${idsCsv}, ','))
      AND ${SEAT_RESERVED_CONDITION}
    GROUP BY b.departure_id
  `);
  const rows = ((result as any).rows ?? result) as Array<{ departure_id: string; filled: number }>;
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.departure_id) map.set(r.departure_id, Number(r.filled ?? 0));
  }
  return map;
}


/** Sisa kursi per departure = quota - kursi terpakai (terbayar). */
export async function getRemainingSeatsMap(
  depIds: string[],
  quotaByDep: Map<any, any>,
): Promise<Map<string, number>> {
  const filledMap = await getFilledSeatsMap(depIds);
  const result = new Map<string, number>();
  for (const id of depIds) {
    const quota = quotaByDep.get(id) ?? 0;
    result.set(id, Math.max(0, quota - (filledMap.get(id) ?? 0)));
  }
  return result;
}

/**
 * Sinkronkan kolom remaining_quota (dan status penuh/active) di DB
 * berdasarkan booking yang sudah di-approve/selesai. Aman dipanggil setelah
 * create/approve/cancel/delete/payment.
 */
export async function syncDepartureQuota(
  departureId?: string | null,
  executor: { execute: (q: any) => Promise<any> } = db as any,
): Promise<void> {
  if (!departureId) return;
  await executor.execute(sql`
    UPDATE package_departures pd
    SET
      remaining_quota = GREATEST(0, pd.quota - COALESCE((
        SELECT SUM(b.pax_count) FROM bookings b
        WHERE b.departure_id = pd.id AND ${SEAT_RESERVED_CONDITION}
      ), 0)),
      status = CASE
        WHEN GREATEST(0, pd.quota - COALESCE((
          SELECT SUM(b.pax_count) FROM bookings b
          WHERE b.departure_id = pd.id AND ${SEAT_RESERVED_CONDITION}
        ), 0)) <= 0 THEN 'penuh'
        WHEN pd.status = 'penuh' THEN 'active'
        ELSE pd.status
      END
    WHERE pd.id = ${departureId}
  `);
}
