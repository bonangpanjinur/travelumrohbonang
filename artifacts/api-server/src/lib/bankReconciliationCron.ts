/**
 * F3-03: Auto-Rekonsiliasi Bank — daily cron job.
 *
 * Runs once per day at ~02:00 WIB (19:00 UTC previous day).
 * Matches unmatched bank mutations against booking_payments by:
 *   - Amount (exact match, positif = kredit masuk)
 *   - Date (±2 hari dari mutation_date, konsisten dengan endpoint /auto-match)
 *
 * Hasil:
 *   - HIGH confidence (1 kandidat cocok) → auto-match: update matched_to + is_matched
 *   - MEDIUM confidence (>1 kandidat) → flag: tulis candidate IDs ke notes
 *   - Tidak ada kandidat → lewati
 *
 * Semua auto-match dicatat dalam logs untuk audit.
 * Sumber kebenaran: booking_payments (sama dengan PATCH /auto-match endpoint).
 */

import { db, bankMutations, bookingPayments, sql, and, eq, isNull, gte, lte } from "@workspace/db";

const TARGET_UTC_HOUR = 19; // 19:00 UTC = 02:00 WIB
const HOUR_MS = 60 * 60 * 1_000;

let lastRunDate: string | null = null;

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1_000;

/**
 * Cari booking_payments yang cocok dengan sebuah bank mutation.
 * Cocok berdasarkan: amount (exact) + paidAt dalam ±2 hari dari mutation date.
 * Konsisten dengan logika endpoint POST /auto-match.
 */
async function findCandidates(
  mutationDate: string, // "YYYY-MM-DD"
  amount: number,       // positif = kredit masuk
): Promise<Array<{ id: string; amount: number; paidAt: Date | null }>> {
  const dateObj = new Date(mutationDate);
  const lower = new Date(dateObj.getTime() - TWO_DAYS_MS);
  const upper = new Date(dateObj.getTime() + TWO_DAYS_MS);

  try {
    return await db
      .select({
        id: bookingPayments.id,
        amount: bookingPayments.amount,
        paidAt: bookingPayments.paidAt,
      })
      .from(bookingPayments)
      .where(
        and(
          eq(bookingPayments.amount, amount),
          gte(bookingPayments.paidAt, lower),
          lte(bookingPayments.paidAt, upper),
          eq(bookingPayments.isVoided, false),
        ),
      )
      .limit(10);
  } catch {
    return [];
  }
}

/**
 * Eksekusi auto-rekonsiliasi untuk semua bank mutations yang belum cocok.
 * Never throws.
 */
export async function runAutoReconciliation(): Promise<void> {
  try {
    // Ambil semua bank mutations yang belum dicocokkan (is_matched = false, matched_to IS NULL)
    const unmatched = await db
      .select({
        id: bankMutations.id,
        mutationDate: bankMutations.mutationDate,
        amount: bankMutations.amount,
        description: bankMutations.description,
        refNumber: bankMutations.refNumber,
      })
      .from(bankMutations)
      .where(
        and(
          eq(bankMutations.isMatched, false),
          isNull(bankMutations.matchedTo),
          sql`${bankMutations.amount} > 0`,
        ),
      );

    if (unmatched.length === 0) {
      console.info("[bankReconciliationCron] No unmatched mutations found");
      return;
    }

    console.info(`[bankReconciliationCron] Processing ${unmatched.length} unmatched mutations`);

    let autoMatchCount = 0;
    let flaggedCount = 0;
    let noMatchCount = 0;

    for (const mutation of unmatched) {
      const candidates = await findCandidates(mutation.mutationDate, mutation.amount);

      if (candidates.length === 0) {
        noMatchCount++;
        continue;
      }

      if (candidates.length === 1) {
        // HIGH confidence — auto-match ke booking_payments.id
        const match = candidates[0];
        try {
          await db
            .update(bankMutations)
            .set({
              matchedTo: match.id,
              isMatched: true,
              notes: `[AUTO-MATCH] Matched to booking_payment ${match.id} (Rp${match.amount.toLocaleString("id-ID")}) on ${new Date().toISOString()}`,
            })
            .where(eq(bankMutations.id, mutation.id));

          console.info(
            `[bankReconciliationCron] AUTO-MATCH mutation ${mutation.id} (Rp${mutation.amount.toLocaleString("id-ID")}) → bp ${match.id}`,
          );
          autoMatchCount++;
        } catch (err) {
          console.error(`[bankReconciliationCron] Failed to auto-match mutation ${mutation.id}:`, err);
        }
      } else {
        // MEDIUM confidence — flag untuk konfirmasi admin
        const candidateIds = candidates.map((c) => c.id).join(", ");
        try {
          await db
            .update(bankMutations)
            .set({
              notes: `[AUTO-CANDIDATE] ${candidates.length} kandidat cocok: ${candidateIds}. Perlu konfirmasi admin. (${new Date().toISOString()})`,
            })
            .where(eq(bankMutations.id, mutation.id));

          console.info(
            `[bankReconciliationCron] FLAGGED mutation ${mutation.id} — ${candidates.length} candidates`,
          );
          flaggedCount++;
        } catch (err) {
          console.error(`[bankReconciliationCron] Failed to flag mutation ${mutation.id}:`, err);
        }
      }
    }

    console.info(
      `[bankReconciliationCron] Done — auto-matched: ${autoMatchCount}, flagged: ${flaggedCount}, no match: ${noMatchCount}`,
    );
  } catch (err) {
    console.error("[bankReconciliationCron] runAutoReconciliation failed:", err);
  }
}

/**
 * Start the daily auto-reconciliation scheduler.
 * Call once at server startup.
 */
export function startBankReconciliationCron(): void {
  console.info("[bankReconciliationCron] Scheduler started — fires daily at 02:00 WIB (19:00 UTC)");

  setInterval(() => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const todayDate = now.toISOString().slice(0, 10);

    if (utcHour === TARGET_UTC_HOUR && lastRunDate !== todayDate) {
      lastRunDate = todayDate;
      console.info(`[bankReconciliationCron] Triggering auto-reconciliation for ${todayDate}`);
      void runAutoReconciliation();
    }
  }, HOUR_MS);
}
