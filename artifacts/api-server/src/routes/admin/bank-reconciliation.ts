/**
 * F-10: Rekonsiliasi Bank — import mutasi bank & matching ke booking_payments
 *
 * GET    /api/admin/bank-reconciliation            — list mutasi (filter: bankAccount, matched)
 * POST   /api/admin/bank-reconciliation/import     — import mutasi dari CSV data
 * PATCH  /api/admin/bank-reconciliation/:id        — update / manual match
 * DELETE /api/admin/bank-reconciliation/:id        — hapus mutasi
 * POST   /api/admin/bank-reconciliation/auto-match — auto-match berdasarkan amount & tanggal
 */

import { Router } from "express";
import {
  db, bankMutations, bookingPayments, bookings,
  eq, and, or, gte, lte, isNull, sql, desc, asc, ne,
} from "@workspace/db";
import { sendAdminError } from "../../lib/adminApiError";

const router = Router();

// ── GET / — list mutasi bank ──────────────────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const { bankAccount, matched, from, to } = req.query as {
      bankAccount?: string;
      matched?: string; // "true" | "false" | "all"
      from?: string;
      to?: string;
    };

    const conditions: Parameters<typeof and>[0][] = [];
    if (bankAccount) conditions.push(eq(bankMutations.bankAccount, bankAccount));
    if (matched === "true") conditions.push(eq(bankMutations.isMatched, true));
    if (matched === "false") conditions.push(eq(bankMutations.isMatched, false));
    if (from) conditions.push(gte(bankMutations.mutationDate, from));
    if (to) conditions.push(lte(bankMutations.mutationDate, to));

    const rows = await db
      .select()
      .from(bankMutations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(bankMutations.mutationDate));

    const totalKredit = rows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
    const totalDebit = rows.filter((r) => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0);
    const matched_count = rows.filter((r) => r.isMatched).length;

    res.json({
      data: rows,
      stats: {
        total: rows.length,
        matched: matched_count,
        unmatched: rows.length - matched_count,
        totalKredit,
        totalDebit,
      },
    });
  } catch (err) {
    sendAdminError(res, "GET /api/admin/bank-reconciliation", err);
  }
});

// ── POST /import — import mutasi dari array CSV rows ─────────────────────────

router.post("/import", async (req, res) => {
  try {
    const { rows, bankAccount, bankName } = req.body as {
      rows: Array<{
        date: string;           // YYYY-MM-DD
        description: string;
        amount: number;         // positif=kredit, negatif=debit
        balance?: number;
        refNumber?: string;
      }>;
      bankAccount: string;
      bankName?: string;
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "rows array required" });
    }
    if (!bankAccount) return res.status(400).json({ error: "bankAccount required" });

    let inserted = 0;
    let skipped = 0;

    for (const r of rows) {
      // Skip duplicates (same date+amount+refNumber)
      if (r.refNumber) {
        const existing = await db
          .select({ id: bankMutations.id })
          .from(bankMutations)
          .where(
            and(
              eq(bankMutations.bankAccount, bankAccount),
              eq(bankMutations.refNumber, r.refNumber),
            ),
          );
        if (existing.length > 0) { skipped++; continue; }
      }

      await db.insert(bankMutations).values({
        id: crypto.randomUUID(),
        mutationDate: r.date,
        description: r.description ?? null,
        amount: r.amount,
        balance: r.balance ?? null,
        refNumber: r.refNumber ?? null,
        bankAccount,
        bankName: bankName ?? null,
        isMatched: false,
        createdAt: new Date(),
      });
      inserted++;
    }

    res.json({ ok: true, inserted, skipped, total: rows.length });
  } catch (err) {
    sendAdminError(res, "POST /api/admin/bank-reconciliation/import", err);
  }
});

// ── PATCH /:id — manual match / update ───────────────────────────────────────

router.patch("/:id", async (req, res) => {
  try {
    const { matchedTo, notes, isMatched } = req.body;

    const patch: Record<string, unknown> = {};
    if (matchedTo !== undefined) {
      patch.matchedTo = matchedTo ?? null;
      patch.isMatched = matchedTo ? true : false;
    }
    if (isMatched !== undefined) patch.isMatched = isMatched;
    if (notes !== undefined) patch.notes = notes;

    if (!Object.keys(patch).length) return res.status(400).json({ error: "No fields to update" });

    const [updated] = await db
      .update(bankMutations)
      .set(patch)
      .where(eq(bankMutations.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Mutation not found" });
    res.json(updated);
  } catch (err) {
    sendAdminError(res, "PATCH /api/admin/bank-reconciliation/:id", err);
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────

router.delete("/:id", async (req, res) => {
  try {
    const [deleted] = await db
      .delete(bankMutations)
      .where(eq(bankMutations.id, req.params.id))
      .returning({ id: bankMutations.id });

    if (!deleted) return res.status(404).json({ error: "Mutation not found" });
    res.json({ ok: true });
  } catch (err) {
    sendAdminError(res, "DELETE /api/admin/bank-reconciliation/:id", err);
  }
});

// ── POST /auto-match — cocokkan mutasi ke booking_payments otomatis ───────────

router.post("/auto-match", async (req, res) => {
  try {
    // Fetch semua mutasi belum di-match yang berjumlah positif (kredit = uang masuk)
    const unmatched = await db
      .select()
      .from(bankMutations)
      .where(and(eq(bankMutations.isMatched, false), sql`${bankMutations.amount} > 0`));

    let matched = 0;
    const errors: string[] = [];

    for (const mut of unmatched) {
      // Cari booking_payment dengan amount sama dalam ±2 hari
      const dateObj = new Date(mut.mutationDate);
      const dayBefore = new Date(dateObj);
      dayBefore.setDate(dayBefore.getDate() - 2);
      const dayAfter = new Date(dateObj);
      dayAfter.setDate(dayAfter.getDate() + 2);

      const candidates = await db
        .select({
          id: bookingPayments.id,
          amount: bookingPayments.amount,
          paidAt: bookingPayments.paidAt,
        })
        .from(bookingPayments)
        .where(
          and(
            eq(bookingPayments.amount, mut.amount),
            gte(bookingPayments.paidAt, dayBefore),
            lte(bookingPayments.paidAt, dayAfter),
          ),
        );

      if (candidates.length === 1) {
        // Unique match — auto-assign
        await db
          .update(bankMutations)
          .set({ matchedTo: candidates[0].id, isMatched: true })
          .where(eq(bankMutations.id, mut.id));
        matched++;
      }
      // If 0 or >1 candidates, skip (ambiguous)
    }

    res.json({ ok: true, matched, skipped: unmatched.length - matched });
  } catch (err) {
    sendAdminError(res, "POST /api/admin/bank-reconciliation/auto-match", err);
  }
});

export default router;
