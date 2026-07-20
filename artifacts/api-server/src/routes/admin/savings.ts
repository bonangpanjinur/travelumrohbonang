/**
 * Admin Savings (Tabungan) Routes
 *
 * GET  /api/admin/savings                 — daftar semua rekening tabungan
 * GET  /api/admin/savings/stats           — ringkasan statistik
 * GET  /api/admin/savings/:id             — detail satu rekening + transaksi
 * POST /api/admin/savings/:id/verify/:txId — verifikasi setoran
 * POST /api/admin/savings/:id/reject/:txId — tolak setoran
 * POST /api/admin/savings/:id/refund       — proses penarikan/refund manual
 */

import { Router } from "express";
import {
  db,
  savingsAccounts,
  savingsTransactions,
  eq,
  and,
  desc,
  sql,
} from "@workspace/db";
import { createNotification } from "../../lib/paymentSync";

const router = Router();

// ── GET /stats ────────────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const [totals] = await db
      .select({
        totalAccounts: sql<number>`count(*)::int`,
        totalBalance: sql<number>`coalesce(sum(current_balance),0)::int`,
        activeAccounts: sql<number>`count(*) filter (where status = 'active')::int`,
      })
      .from(savingsAccounts);

    const [pendingDeposits] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(savingsTransactions)
      .where(and(eq(savingsTransactions.status, "pending"), eq(savingsTransactions.type, "deposit")));

    res.json({ ...totals, pendingDeposits: pendingDeposits?.count ?? 0 });
  } catch (e) {
    console.error("[admin/savings] stats error:", e);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ── GET / — list all savings accounts ────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { status, search } = req.query as Record<string, string>;

    // We JOIN with a subquery to get pending deposit count per account
    const rows = await db.execute(sql`
      SELECT
        sa.id,
        sa.user_id,
        sa.target_package_id,
        sa.target_package_name,
        sa.target_amount,
        sa.current_balance,
        sa.status,
        sa.notes,
        sa.created_at,
        sa.updated_at,
        p.name   AS jamaah_name,
        p.email  AS jamaah_email,
        p.phone  AS jamaah_phone,
        COALESCE(pd.pending_count, 0)::int AS pending_deposits
      FROM savings_accounts sa
      LEFT JOIN profiles p ON p.id::text = sa.user_id
      LEFT JOIN (
        SELECT account_id, COUNT(*)::int AS pending_count
        FROM savings_transactions
        WHERE status = 'pending' AND type = 'deposit'
        GROUP BY account_id
      ) pd ON pd.account_id = sa.id
      WHERE
        (${status ? sql`sa.status = ${status}` : sql`TRUE`})
        AND (${search ? sql`(p.name ILIKE ${"%" + search + "%"} OR p.email ILIKE ${"%" + search + "%"})` : sql`TRUE`})
      ORDER BY sa.created_at DESC
    `);

    res.json({ data: rows.rows ?? rows });
  } catch (e) {
    console.error("[admin/savings] list error:", e);
    res.status(500).json({ error: "Failed to fetch savings accounts" });
  }
});

// ── GET /:id — detail + transactions ─────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [account] = await db.execute(sql`
      SELECT
        sa.*,
        p.name AS jamaah_name,
        p.email AS jamaah_email,
        p.phone AS jamaah_phone
      FROM savings_accounts sa
      LEFT JOIN profiles p ON p.id::text = sa.user_id
      WHERE sa.id = ${id}
      LIMIT 1
    `).then(r => r.rows ?? r);

    if (!account) return res.status(404).json({ error: "Account not found" });

    const transactions = await db
      .select()
      .from(savingsTransactions)
      .where(eq(savingsTransactions.accountId, id))
      .orderBy(desc(savingsTransactions.createdAt));

    res.json({ account, transactions });
  } catch (e) {
    console.error("[admin/savings] detail error:", e);
    res.status(500).json({ error: "Failed to fetch account detail" });
  }
});

// ── POST /:id/verify/:txId ────────────────────────────────────────────────────
router.post("/:id/verify/:txId", async (req, res) => {
  try {
    const { id, txId } = req.params;
    const adminId = (req as any).user?.id as string | undefined;

    const [tx] = await db
      .select()
      .from(savingsTransactions)
      .where(and(eq(savingsTransactions.id, txId), eq(savingsTransactions.accountId, id)))
      .limit(1);

    if (!tx) return res.status(404).json({ error: "Transaction not found" });
    if (tx.status !== "pending") return res.status(409).json({ error: "Transaction already processed" });
    if (tx.type !== "deposit") return res.status(400).json({ error: "Only deposits can be verified this way" });

    const now = new Date();

    // 1. Mark transaction verified
    await db.update(savingsTransactions).set({
      status: "verified",
      recordedBy: adminId ?? null,
      verifiedAt: now,
    }).where(eq(savingsTransactions.id, txId));

    // 2. Add to account balance
    const [updated] = await db
      .update(savingsAccounts)
      .set({
        currentBalance: sql`current_balance + ${tx.amount}`,
        updatedAt: now,
      })
      .where(eq(savingsAccounts.id, id))
      .returning();

    // 3. In-app notification
    await createNotification({
      userId: updated.userId,
      title: "Setoran Tabungan Dikonfirmasi ✓",
      message: `Setoran sebesar Rp${tx.amount.toLocaleString("id-ID")} telah dikonfirmasi. Saldo tabungan Anda: Rp${updated.currentBalance.toLocaleString("id-ID")}.`,
    });

    res.json({ account: updated });
  } catch (e) {
    console.error("[admin/savings] verify error:", e);
    res.status(500).json({ error: "Failed to verify deposit" });
  }
});

// ── POST /:id/reject/:txId ────────────────────────────────────────────────────
router.post("/:id/reject/:txId", async (req, res) => {
  try {
    const { id, txId } = req.params;
    const adminId = (req as any).user?.id as string | undefined;
    const { reason } = req.body as { reason?: string };

    const [tx] = await db
      .select()
      .from(savingsTransactions)
      .where(and(eq(savingsTransactions.id, txId), eq(savingsTransactions.accountId, id)))
      .limit(1);

    if (!tx) return res.status(404).json({ error: "Transaction not found" });
    if (tx.status !== "pending") return res.status(409).json({ error: "Transaction already processed" });

    const now = new Date();
    await db.update(savingsTransactions).set({
      status: "rejected",
      rejectionReason: reason ?? null,
      recordedBy: adminId ?? null,
      verifiedAt: now,
    }).where(eq(savingsTransactions.id, txId));

    const [account] = await db.select().from(savingsAccounts).where(eq(savingsAccounts.id, id)).limit(1);
    if (account) {
      await createNotification({
        userId: account.userId,
        title: "Bukti Setoran Ditolak",
        message: reason
          ? `Bukti setoran Anda ditolak: ${reason}. Silakan upload ulang.`
          : "Bukti setoran Anda ditolak. Silakan upload bukti yang valid.",
      });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("[admin/savings] reject error:", e);
    res.status(500).json({ error: "Failed to reject deposit" });
  }
});

// ── POST /:id/refund — admin-initiated withdrawal ────────────────────────────
router.post("/:id/refund", async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = (req as any).user?.id as string | undefined;
    const { amount, notes } = req.body as { amount: number; notes?: string };

    const [account] = await db.select().from(savingsAccounts).where(eq(savingsAccounts.id, id)).limit(1);
    if (!account) return res.status(404).json({ error: "Account not found" });
    if (account.currentBalance < amount) return res.status(400).json({ error: "Saldo tidak mencukupi" });

    const now = new Date();
    const txId = crypto.randomUUID();

    await db.insert(savingsTransactions).values({
      id: txId,
      accountId: id,
      amount: -Math.abs(amount),
      type: "refund",
      status: "verified",
      notes: notes ?? "Pencairan tabungan oleh admin",
      recordedBy: adminId ?? null,
      verifiedAt: now,
      createdAt: now,
    });

    const [updated] = await db
      .update(savingsAccounts)
      .set({
        currentBalance: sql`current_balance - ${Math.abs(amount)}`,
        status: account.currentBalance - Math.abs(amount) <= 0 ? "withdrawn" : account.status,
        updatedAt: now,
      })
      .where(eq(savingsAccounts.id, id))
      .returning();

    await createNotification({
      userId: account.userId,
      title: "Tabungan Dicairkan",
      message: `Penarikan sebesar Rp${Math.abs(amount).toLocaleString("id-ID")} telah diproses. Sisa saldo: Rp${updated.currentBalance.toLocaleString("id-ID")}.`,
    });

    res.json({ account: updated });
  } catch (e) {
    console.error("[admin/savings] refund error:", e);
    res.status(500).json({ error: "Failed to process refund" });
  }
});

export default router;
