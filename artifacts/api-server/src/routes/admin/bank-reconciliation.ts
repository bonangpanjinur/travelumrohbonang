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
import { resolveUserScope } from "../../lib/scopeGuard";

const router = Router();

async function bankMutationScopeCondition(req: any) {
  const scope = await resolveUserScope(req);
  if (scope.type === "global") return sql`TRUE`;
  if (scope.type === "branch" && scope.branchId) {
    return sql`EXISTS (
      SELECT 1 FROM booking_payments bp
      JOIN bookings b ON b.id = bp.booking_id
      WHERE bp.id = bank_mutations.matched_to AND b.branch_id = ${scope.branchId}
    )`;
  }
  if (scope.type === "agent" && scope.agentId) {
    return sql`EXISTS (
      SELECT 1 FROM booking_payments bp
      JOIN bookings b ON b.id = bp.booking_id
      WHERE bp.id = bank_mutations.matched_to
        AND (b.agent_id = ${scope.agentId}
          OR (b.pic_type = 'agen' AND b.pic_id = ${scope.agentId}))
    )`;
  }
  return sql`FALSE`;
}

async function canAccessBankMutation(req: any, mutationId: string) {
  const scope = await resolveUserScope(req);
  if (scope.type === "global") return true;
  const condition = await bankMutationScopeCondition(req);
  const rows = await db.execute(sql`
    SELECT 1 FROM bank_mutations
    WHERE id = ${mutationId} AND ${condition}
    LIMIT 1
  `);
  return ((rows as any).rows ?? rows).length > 0;
}

async function canAccessPayment(req: any, paymentId: string) {
  const scope = await resolveUserScope(req);
  if (scope.type === "global") return true;
  const rows = await db.execute(sql`
    SELECT 1 FROM booking_payments bp
    JOIN bookings b ON b.id = bp.booking_id
    WHERE bp.id = ${paymentId}
      AND ${scope.type === "branch"
        ? sql`b.branch_id = ${scope.branchId ?? ""}`
        : sql`b.agent_id = ${scope.agentId ?? ""} OR (b.pic_type = 'agen' AND b.pic_id = ${scope.agentId ?? ""})`}
    LIMIT 1
  `);
  return ((rows as any).rows ?? rows).length > 0;
}

// ── GET / — list mutasi bank ──────────────────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const { bankAccount, matched, from, to } = req.query as {
      bankAccount?: string;
      matched?: string; // "true" | "false" | "all"
      from?: string;
      to?: string;
    };

    const conditions: Parameters<typeof and>[0][] = [await bankMutationScopeCondition(req)];
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

    const typedRows = rows as Array<{ amount: number; isMatched: boolean }>;
    const totalKredit = typedRows.filter((r) => r.amount > 0).reduce((s: number, r) => s + r.amount, 0);
    const totalDebit = typedRows.filter((r) => r.amount < 0).reduce((s: number, r) => s + Math.abs(r.amount), 0);
    const matched_count = typedRows.filter((r) => r.isMatched).length;

    res.json({
      data: rows,
      stats: {
        total: typedRows.length,
        matched: matched_count,
        unmatched: typedRows.length - matched_count,
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
    const scope = await resolveUserScope(req);
    if (scope.type !== "global") {
      return res.status(403).json({ error: "Import mutasi bank hanya dapat dilakukan oleh admin global" });
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

// ── GET /exceptions — pusat pengecualian lintas domain ─────────────────────────
router.get("/exceptions", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const branchFilter = scope.type === "branch" && scope.branchId ? sql`and b.branch_id = ${scope.branchId}` : sql``;
    const [bank, receivables, orphanPayments, refunds, commissions] = await Promise.all([
      db.execute(sql`select count(*)::int as count, coalesce(sum(amount), 0)::bigint as amount from bank_mutations where is_matched = false`),
      db.execute(sql`
        with paid as (select booking_id, coalesce(sum(amount), 0) as amount from booking_payments where is_voided = false group by booking_id)
        select count(*)::int as count, coalesce(sum(b.total_price - coalesce(p.amount, 0)), 0)::bigint as amount
        from bookings b left join paid p on p.booking_id = b.id
        where b.status = 'confirmed' and b.total_price > coalesce(p.amount, 0) ${branchFilter}
      `),
      db.execute(sql`select count(*)::int as count, coalesce(sum(bp.amount), 0)::bigint as amount from booking_payments bp left join bookings b on b.id = bp.booking_id where b.id is null and bp.is_voided = false`),
      db.execute(sql`select count(*)::int as count, coalesce(sum(amount), 0)::bigint as amount from refund_requests where status in ('pending', 'requested')`),
      db.execute(sql`select count(*)::int as count, coalesce(sum(amount), 0)::bigint as amount from agent_commissions where status = 'pending'`),
    ]);
    const first = (result: any) => ((result as any).rows ?? result)[0] ?? {};
    res.json({
      generatedAt: new Date().toISOString(),
      exceptions: [
        { code: "unmatched_bank", label: "Mutasi bank belum match", count: Number(first(bank).count ?? 0), amount: Number(first(bank).amount ?? 0) },
        { code: "confirmed_unpaid", label: "Booking confirmed belum lunas", count: Number(first(receivables).count ?? 0), amount: Number(first(receivables).amount ?? 0) },
        { code: "orphan_payment", label: "Pembayaran tanpa booking", count: Number(first(orphanPayments).count ?? 0), amount: Number(first(orphanPayments).amount ?? 0) },
        { code: "pending_refund", label: "Refund menunggu proses", count: Number(first(refunds).count ?? 0), amount: Number(first(refunds).amount ?? 0) },
        { code: "pending_commission", label: "Komisi menunggu settlement", count: Number(first(commissions).count ?? 0), amount: Number(first(commissions).amount ?? 0) },
      ],
    });
  } catch (err) {
    sendAdminError(res, "GET /api/admin/bank-reconciliation/exceptions", err);
  }
});

// ── PATCH /:id — manual match / update ───────────────────────────────────────

router.patch("/:id", async (req, res) => {
  try {
    const { matchedTo, notes, isMatched } = req.body;
    if (!(await canAccessBankMutation(req, req.params.id))) {
      return res.status(403).json({ error: "Mutasi bank berada di luar scope Anda" });
    }
    if (matchedTo && !(await canAccessPayment(req, matchedTo))) {
      return res.status(403).json({ error: "Pembayaran tujuan berada di luar scope Anda" });
    }

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
    if (!(await canAccessBankMutation(req, req.params.id))) {
      return res.status(403).json({ error: "Mutasi bank berada di luar scope Anda" });
    }
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
    const scope = await resolveUserScope(req);
    if (scope.type !== "global") {
      return res.status(403).json({ error: "Auto-match mutasi bank hanya dapat dilakukan oleh admin global" });
    }
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
