/**
 * User Savings (Tabungan Umroh) Routes
 * Semua endpoint memerlukan authenticated user (requireAuth di-apply di routes/index.ts).
 *
 * GET  /api/savings             — daftar rekening tabungan milik user
 * POST /api/savings             — buka rekening baru
 * GET  /api/savings/simulate    — simulasi berapa bulan untuk mencapai target
 * GET  /api/savings/:id         — detail rekening + transaksi
 * POST /api/savings/:id/deposit — kirim setoran (upload bukti)
 * POST /api/savings/:id/use     — gunakan saldo untuk membayar booking
 * POST /api/savings/:id/close   — tutup rekening (request penarikan)
 */

import { Router } from "express";
import {
  db,
  savingsAccounts,
  savingsTransactions,
  packages,
  bookings,
  eq,
  and,
  desc,
  sql,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { createNotification, recordFinancialTransaction } from "../lib/paymentSync";

const router = Router();
router.use(requireAuth);

const getUserId = (req: any): string => req.user?.id as string;

// ── GET /simulate — hitung berapa bulan ──────────────────────────────────────
router.get("/simulate", (req, res) => {
  const { target, monthly } = req.query as Record<string, string>;
  const t = Number(target) || 0;
  const m = Number(monthly) || 1;
  if (t <= 0 || m <= 0) return res.status(400).json({ error: "target dan monthly harus > 0" });
  const months = Math.ceil(t / m);
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + months);
  res.json({ months, targetDate, total: t, monthly: m });
});

// ── GET / — daftar rekening milik user ───────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    const accounts = await db
      .select()
      .from(savingsAccounts)
      .where(eq(savingsAccounts.userId, userId))
      .orderBy(desc(savingsAccounts.createdAt));
    res.json({ data: accounts });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch savings" });
  }
});

// ── POST / — buka rekening baru ───────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { targetPackageId, targetAmount, notes } = req.body as {
      targetPackageId?: string;
      targetAmount?: number;
      notes?: string;
    };

    // Satu user hanya boleh punya 1 rekening aktif per paket (atau 1 umum jika tidak ada paket)
    const existing = await db
      .select({ id: savingsAccounts.id })
      .from(savingsAccounts)
      .where(
        and(
          eq(savingsAccounts.userId, userId),
          eq(savingsAccounts.status, "active"),
          targetPackageId
            ? eq(savingsAccounts.targetPackageId, targetPackageId)
            : sql`target_package_id IS NULL`,
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: "Rekening tabungan aktif sudah ada untuk target ini" });
    }

    // Fetch package info if provided
    let targetPackageName: string | null = null;
    let resolvedTarget = targetAmount ?? 0;
    if (targetPackageId) {
      const [pkg] = await db
        .select({ title: packages.title, basePrice: packages.basePrice })
        .from(packages)
        .where(eq(packages.id, targetPackageId))
        .limit(1);
      if (pkg) {
        targetPackageName = pkg.title;
        if (!targetAmount && pkg.basePrice) resolvedTarget = Number(pkg.basePrice);
      }
    }

    const now = new Date();
    const id = crypto.randomUUID();
    const [account] = await db.insert(savingsAccounts).values({
      id,
      userId,
      targetPackageId: targetPackageId ?? null,
      targetPackageName,
      targetAmount: resolvedTarget,
      currentBalance: 0,
      status: "active",
      notes: notes ?? null,
      createdAt: now,
      updatedAt: now,
    }).returning();

    res.status(201).json({ account });
  } catch (e) {
    console.error("[savings] create error:", e);
    res.status(500).json({ error: "Failed to create savings account" });
  }
});

// ── GET /:id — detail + transaksi ─────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const [account] = await db
      .select()
      .from(savingsAccounts)
      .where(and(eq(savingsAccounts.id, req.params.id), eq(savingsAccounts.userId, userId)))
      .limit(1);
    if (!account) return res.status(404).json({ error: "Account not found" });

    const transactions = await db
      .select()
      .from(savingsTransactions)
      .where(eq(savingsTransactions.accountId, account.id))
      .orderBy(desc(savingsTransactions.createdAt));

    res.json({ account, transactions });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch account" });
  }
});

// ── POST /:id/deposit — submit bukti setoran ──────────────────────────────────
router.post("/:id/deposit", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { amount, proofUrl, notes } = req.body as {
      amount: number;
      proofUrl?: string;
      notes?: string;
    };

    if (!amount || amount <= 0) return res.status(400).json({ error: "amount harus > 0" });

    const [account] = await db
      .select()
      .from(savingsAccounts)
      .where(and(eq(savingsAccounts.id, req.params.id), eq(savingsAccounts.userId, userId)))
      .limit(1);
    if (!account) return res.status(404).json({ error: "Account not found" });
    if (account.status !== "active") return res.status(409).json({ error: "Rekening tidak aktif" });

    const txId = crypto.randomUUID();
    const [tx] = await db.insert(savingsTransactions).values({
      id: txId,
      accountId: account.id,
      amount,
      type: "deposit",
      status: "pending",
      proofUrl: proofUrl ?? null,
      notes: notes ?? null,
      createdAt: new Date(),
    }).returning();

    res.status(201).json({ transaction: tx });
  } catch (e) {
    console.error("[savings] deposit error:", e);
    res.status(500).json({ error: "Failed to submit deposit" });
  }
});

// ── POST /:id/use — gunakan saldo untuk booking ────────────────────────────────
router.post("/:id/use", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { bookingId, amount } = req.body as { bookingId: string; amount: number };

    if (!bookingId || !amount || amount <= 0) {
      return res.status(400).json({ error: "bookingId dan amount diperlukan" });
    }

    const [account] = await db
      .select()
      .from(savingsAccounts)
      .where(and(eq(savingsAccounts.id, req.params.id), eq(savingsAccounts.userId, userId)))
      .limit(1);
    if (!account) return res.status(404).json({ error: "Account not found" });
    if (account.status !== "active") return res.status(409).json({ error: "Rekening tidak aktif" });
    if (account.currentBalance < amount) return res.status(400).json({ error: "Saldo tabungan tidak mencukupi" });

    // Verify booking belongs to this user
    const [booking] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId)))
      .limit(1);
    if (!booking) return res.status(404).json({ error: "Booking tidak ditemukan" });

    const now = new Date();
    const txId = crypto.randomUUID();

    await db.insert(savingsTransactions).values({
      id: txId,
      accountId: account.id,
      amount: -Math.abs(amount),
      type: "booking_payment",
      status: "verified",
      bookingId,
      notes: `Digunakan untuk booking ${bookingId}`,
      verifiedAt: now,
      createdAt: now,
    });

    const [updated] = await db
      .update(savingsAccounts)
      .set({
        currentBalance: sql`current_balance - ${Math.abs(amount)}`,
        updatedAt: now,
      })
      .where(eq(savingsAccounts.id, account.id))
      .returning();

    // Record as a financial transaction so it appears in accounting
    await recordFinancialTransaction({
      bookingId,
      amount: Math.abs(amount),
      type: "income",
      category: "booking_payment",
      description: `Pembayaran dari tabungan umroh (${account.id})`,
      referenceNumber: `savings-${txId}`,
      recordedBy: userId,
    });

    res.json({ account: updated, transaction: { id: txId } });
  } catch (e) {
    console.error("[savings] use error:", e);
    res.status(500).json({ error: "Failed to use savings" });
  }
});

// ── POST /:id/close — tutup rekening / minta pencairan ───────────────────────
router.post("/:id/close", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { notes } = req.body as { notes?: string };

    const [account] = await db
      .select()
      .from(savingsAccounts)
      .where(and(eq(savingsAccounts.id, req.params.id), eq(savingsAccounts.userId, userId)))
      .limit(1);
    if (!account) return res.status(404).json({ error: "Account not found" });
    if (account.status !== "active") return res.status(409).json({ error: "Rekening sudah ditutup" });

    // If there is balance, create a pending withdrawal request
    if (account.currentBalance > 0) {
      await db.insert(savingsTransactions).values({
        id: crypto.randomUUID(),
        accountId: account.id,
        amount: -account.currentBalance,
        type: "withdrawal",
        status: "pending",
        notes: notes ?? "Permintaan penutupan rekening dan pencairan saldo",
        createdAt: new Date(),
      });
    }

    const [updated] = await db
      .update(savingsAccounts)
      .set({ status: "closed", updatedAt: new Date() })
      .where(eq(savingsAccounts.id, account.id))
      .returning();

    res.json({ account: updated });
  } catch (e) {
    res.status(500).json({ error: "Failed to close account" });
  }
});

export default router;
