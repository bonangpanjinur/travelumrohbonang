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
  auditLogs,
  savingsAccounts,
  savingsTransactions,
  eq,
  and,
  desc,
  sql,
} from "@workspace/db";
import { createNotification } from "../../lib/paymentSync";
import { resolveUserScope } from "../../lib/scopeGuard";

const router = Router();

async function getSavingsScopeFilter(req: any, profileAlias = "p") {
  const scope = await resolveUserScope(req);
  if (scope.type === "global") return sql`TRUE`;
  if (scope.type === "branch" && scope.branchId) return sql`${sql.raw(profileAlias)}.branch_id = ${scope.branchId}`;
  return sql`FALSE`;
}

async function assertSavingsAccountScope(req: any, accountId: string) {
  const scope = await resolveUserScope(req);
  if (scope.type === "global") return true;
  if (scope.type !== "branch" || !scope.branchId) return false;
  const rows = await db.execute(sql`
    SELECT sa.id
    FROM savings_accounts sa
    LEFT JOIN profiles p ON p.id::text = sa.user_id
    WHERE sa.id = ${accountId} AND p.branch_id = ${scope.branchId}
    LIMIT 1
  `);
  return ((rows as any).rows ?? rows).length > 0;
}

// ── GET /stats ────────────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const scopeFilter = await getSavingsScopeFilter(req, "p");
    const totals = await db.execute(sql`
      SELECT count(sa.*)::int AS "totalAccounts",
             coalesce(sum(sa.current_balance), 0)::int AS "totalBalance",
             count(*) FILTER (WHERE sa.status = 'active')::int AS "activeAccounts"
      FROM savings_accounts sa
      LEFT JOIN profiles p ON p.id::text = sa.user_id
      WHERE ${scopeFilter}
    `).then((r: any) => ((r as any).rows ?? r)[0] ?? {});

    const pendingRows = await db.execute(sql`
      SELECT
        count(*) FILTER (WHERE st.type = 'deposit')::int AS "pendingDeposits",
        count(*) FILTER (WHERE st.type = 'withdrawal')::int AS "pendingWithdrawals"
      FROM savings_transactions st
      JOIN savings_accounts sa ON sa.id = st.account_id
      LEFT JOIN profiles p ON p.id::text = sa.user_id
      WHERE st.status = 'pending' AND ${scopeFilter}
    `);
    const pending = ((pendingRows as any).rows ?? pendingRows)[0] ?? {};

    res.json({ ...totals, pendingDeposits: pending.pendingDeposits ?? 0, pendingWithdrawals: pending.pendingWithdrawals ?? 0 });
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
        COALESCE(pd.pending_count, 0)::int AS pending_deposits,
        COALESCE(pw.pending_count, 0)::int AS pending_withdrawals
      FROM savings_accounts sa
      LEFT JOIN profiles p ON p.id::text = sa.user_id
      LEFT JOIN (
        SELECT account_id, COUNT(*)::int AS pending_count
        FROM savings_transactions
        WHERE status = 'pending' AND type = 'deposit'
        GROUP BY account_id
      ) pd ON pd.account_id = sa.id
      LEFT JOIN (
        SELECT account_id, COUNT(*)::int AS pending_count
        FROM savings_transactions
        WHERE status = 'pending' AND type = 'withdrawal'
        GROUP BY account_id
      ) pw ON pw.account_id = sa.id
      WHERE
        (${status ? sql`sa.status = ${status}` : sql`TRUE`})
        AND (${search ? sql`(p.name ILIKE ${"%" + search + "%"} OR p.email ILIKE ${"%" + search + "%"})` : sql`TRUE`})
        AND (${await getSavingsScopeFilter(req, "p")})
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
    if (!(await assertSavingsAccountScope(req, id))) return res.status(403).json({ error: "Akses rekening tabungan ditolak untuk scope Anda" });

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
    `).then((r: any) => r.rows ?? r);

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
    if (!(await assertSavingsAccountScope(req, id))) return res.status(403).json({ error: "Akses rekening tabungan ditolak untuk scope Anda" });
    const adminId = (req as any).user?.id as string | undefined;

    const result = await db.transaction(async (txDb: any) => {
      const lockedAccount = await txDb.execute(sql`
        SELECT * FROM savings_accounts WHERE id = ${id} FOR UPDATE
      `);
      const account = ((lockedAccount as any).rows ?? lockedAccount)[0] as any;
      if (!account) throw Object.assign(new Error("Account not found"), { status: 404 });

      const [pendingTx] = await txDb
        .select()
        .from(savingsTransactions)
        .where(and(eq(savingsTransactions.id, txId), eq(savingsTransactions.accountId, id)))
        .for("update")
        .limit(1);
      if (!pendingTx) throw Object.assign(new Error("Transaction not found"), { status: 404 });
      if (pendingTx.status !== "pending") throw Object.assign(new Error("Transaction already processed"), { status: 409 });
      if (pendingTx.type !== "deposit") throw Object.assign(new Error("Only deposits can be verified this way"), { status: 400 });

      const now = new Date();
      await txDb.update(savingsTransactions).set({
        branchId: account.branch_id ?? account.branchId ?? "hq",
        status: "verified",
        recordedBy: adminId ?? null,
        verifiedAt: now,
      }).where(eq(savingsTransactions.id, txId));

      const [updated] = await txDb.update(savingsAccounts).set({
        currentBalance: sql`current_balance + ${pendingTx.amount}`,
        updatedAt: now,
      }).where(eq(savingsAccounts.id, id)).returning();
      return { updated, amount: pendingTx.amount };
    });

    await createNotification({
      userId: result.updated.userId,
      title: "Setoran Tabungan Dikonfirmasi ✓",
      message: `Setoran sebesar Rp${result.amount.toLocaleString("id-ID")} telah dikonfirmasi. Saldo tabungan Anda: Rp${result.updated.currentBalance.toLocaleString("id-ID")}.`,
    });

    res.json({ account: result.updated });
  } catch (e: any) {
    console.error("[admin/savings] verify error:", e);
    if (e?.status) return res.status(e.status).json({ error: e.message });
    res.status(500).json({ error: "Failed to verify deposit" });
  }
});

// ── POST /:id/reject/:txId ────────────────────────────────────────────────────
router.post("/:id/reject/:txId", async (req, res) => {
  try {
    const { id, txId } = req.params;
    if (!(await assertSavingsAccountScope(req, id))) return res.status(403).json({ error: "Akses rekening tabungan ditolak untuk scope Anda" });
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

// ── POST /:id/approve-withdrawal/:txId — approve customer withdrawal ───────────
router.post("/:id/approve-withdrawal/:txId", async (req, res) => {
  try {
    const { id, txId } = req.params;
    if (!(await assertSavingsAccountScope(req, id))) return res.status(403).json({ error: "Akses rekening tabungan ditolak untuk scope Anda" });
    const adminId = (req as any).user?.id as string | undefined;
    const result = await db.transaction(async (txDb: any) => {
      const locked = await txDb.execute(sql`SELECT * FROM savings_accounts WHERE id = ${id} FOR UPDATE`);
      const account = ((locked as any).rows ?? locked)[0] as any;
      if (!account) throw Object.assign(new Error("Account not found"), { status: 404 });
      const [txRow] = await txDb.select().from(savingsTransactions)
        .where(and(eq(savingsTransactions.id, txId), eq(savingsTransactions.accountId, id))).for("update").limit(1);
      if (!txRow) throw Object.assign(new Error("Transaction not found"), { status: 404 });
      if (txRow.type !== "withdrawal" || txRow.status !== "pending") throw Object.assign(new Error("Withdrawal sudah diproses atau tidak valid"), { status: 409 });
      const amount = Math.abs(txRow.amount);
      if (Number(account.current_balance) < amount) throw Object.assign(new Error("Saldo tidak mencukupi"), { status: 400 });
      const now = new Date();
      await txDb.update(savingsTransactions).set({ status: "verified", recordedBy: adminId ?? null, verifiedAt: now }).where(eq(savingsTransactions.id, txId));
      const [updated] = await txDb.update(savingsAccounts).set({ currentBalance: sql`current_balance - ${amount}`, status: "withdrawn", updatedAt: now }).where(eq(savingsAccounts.id, id)).returning();
      await txDb.insert(auditLogs).values({
        id: crypto.randomUUID(),
        userId: adminId ?? null,
        action: "savings.withdrawal.approved",
        entityType: "savings_transaction",
        entityId: txId,
        metadata: { accountId: id, amount },
        createdAt: now,
      });
      return { updated, amount };
    });
    await createNotification({ userId: result.updated.userId, title: "Pencairan Tabungan Disetujui", message: `Pencairan Rp${result.amount.toLocaleString("id-ID")} telah disetujui.` });
    res.json({ account: result.updated });
  } catch (e: any) {
    console.error("[admin/savings] approve withdrawal error:", e);
    if (e?.status) return res.status(e.status).json({ error: e.message });
    res.status(500).json({ error: "Failed to approve withdrawal" });
  }
});

// ── POST /:id/reject-withdrawal/:txId — reject customer withdrawal ────────────
router.post("/:id/reject-withdrawal/:txId", async (req, res) => {
  try {
    const { id, txId } = req.params;
    if (!(await assertSavingsAccountScope(req, id))) return res.status(403).json({ error: "Akses rekening tabungan ditolak untuk scope Anda" });
    const adminId = (req as any).user?.id as string | undefined;
    const reason = String((req.body as any)?.reason ?? "").trim() || null;
    const result = await db.transaction(async (txDb: any) => {
      const [account] = await txDb.select().from(savingsAccounts).where(eq(savingsAccounts.id, id)).for("update").limit(1);
      if (!account) throw Object.assign(new Error("Account not found"), { status: 404 });
      const [txRow] = await txDb.select().from(savingsTransactions)
        .where(and(eq(savingsTransactions.id, txId), eq(savingsTransactions.accountId, id))).for("update").limit(1);
      if (!txRow) throw Object.assign(new Error("Transaction not found"), { status: 404 });
      if (txRow.type !== "withdrawal" || txRow.status !== "pending") throw Object.assign(new Error("Withdrawal sudah diproses atau tidak valid"), { status: 409 });
      const [updatedTx] = await txDb.update(savingsTransactions)
        .set({ status: "rejected", rejectionReason: reason, recordedBy: adminId ?? null, verifiedAt: new Date() })
        .where(and(eq(savingsTransactions.id, txId), eq(savingsTransactions.status, "pending")))
        .returning();
      if (!updatedTx) throw Object.assign(new Error("Withdrawal sudah diproses oleh admin lain"), { status: 409 });
      const [updatedAccount] = await txDb.update(savingsAccounts)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(savingsAccounts.id, id)).returning();
      await txDb.insert(auditLogs).values({
        id: crypto.randomUUID(),
        userId: adminId ?? null,
        action: "savings.withdrawal.rejected",
        entityType: "savings_transaction",
        entityId: txId,
        metadata: { accountId: id, reason },
        createdAt: new Date(),
      });
      return { account: updatedAccount ?? account };
    });
    await createNotification({ userId: result.account.userId, title: "Pencairan Tabungan Ditolak", message: reason ? `Permintaan pencairan ditolak: ${reason}` : "Permintaan pencairan tabungan ditolak." });
    res.json({ ok: true, account: result.account });
  } catch (e: any) {
    console.error("[admin/savings] reject withdrawal error:", e);
    if (e?.status) return res.status(e.status).json({ error: e.message });
    res.status(500).json({ error: "Failed to reject withdrawal" });
  }
});

// ── POST /:id/refund — admin-initiated withdrawal ────────────────────────────
router.post("/:id/refund", async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await assertSavingsAccountScope(req, id))) return res.status(403).json({ error: "Akses rekening tabungan ditolak untuk scope Anda" });
    const adminId = (req as any).user?.id as string | undefined;
    const { amount, notes } = req.body as { amount: number; notes?: string };
    if (!Number.isSafeInteger(amount) || amount <= 0) return res.status(400).json({ error: "amount harus berupa bilangan bulat positif" });

    const result = await db.transaction(async (txDb: any) => {
      const [account] = await txDb.select().from(savingsAccounts).where(eq(savingsAccounts.id, id)).for("update").limit(1);
      if (!account) throw Object.assign(new Error("Account not found"), { status: 404 });
      if (account.currentBalance < amount) throw Object.assign(new Error("Saldo tidak mencukupi"), { status: 400 });
      const now = new Date();
      const txId = crypto.randomUUID();
      await txDb.insert(savingsTransactions).values({
        id: txId,
        accountId: id,
        branchId: account.branch_id ?? account.branchId ?? "hq",
        amount: -Math.abs(amount),
        type: "refund",
        status: "verified",
        notes: notes ?? "Pencairan tabungan oleh admin",
        recordedBy: adminId ?? null,
        verifiedAt: now,
        createdAt: now,
      });
      const [updated] = await txDb.update(savingsAccounts)
        .set({
          currentBalance: sql`current_balance - ${Math.abs(amount)}`,
          status: account.currentBalance - Math.abs(amount) <= 0 ? "withdrawn" : account.status,
          updatedAt: now,
        })
        .where(eq(savingsAccounts.id, id)).returning();
      await txDb.insert(auditLogs).values({
        id: crypto.randomUUID(),
        userId: adminId ?? null,
        action: "savings.refund.processed",
        entityType: "savings_account",
        entityId: id,
        metadata: { amount: Math.abs(amount), transactionId: txId },
        createdAt: now,
      });
      return { account, updated };
    });

    await createNotification({
      userId: result.account.userId,
      title: "Tabungan Dicairkan",
      message: `Penarikan sebesar Rp${Math.abs(amount).toLocaleString("id-ID")} telah diproses. Sisa saldo: Rp${result.updated.currentBalance.toLocaleString("id-ID")}.`,
    });

    res.json({ account: result.updated });
  } catch (e: any) {
    console.error("[admin/savings] refund error:", e);
    if (e?.status) return res.status(e.status).json({ error: e.message });
    res.status(500).json({ error: "Failed to process refund" });
  }
});

export default router;
