/**
 * Admin Refund Routes
 *
 * F1-03: Validasi server-side lengkap + state-machine ketat
 *   - POST: cek amount ≤ total verified payments; tolak jika ada refund pending/approved
 *   - PATCH: state-machine (pending→approved|rejected, approved→refunded); update+jurnal dalam satu transaksi
 */

import { Router } from "express";
import {
  db,
  refundRequests,
  bookings,
  payments,
  eq,
  and,
  or,
  desc,
  sum,
  sql,
} from "@workspace/db";
import { sendAdminError, isTableMissing } from "../../lib/adminApiError";
import { journalRefundApproved, journalRefundProcessed } from "../../lib/autoJournal";

const router = Router();

// Transisi status yang diizinkan (state-machine)
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ["approved", "rejected"],
  approved: ["refunded"],
  // rejected & refunded adalah terminal — tidak ada transisi keluar
};

// ── POST / — admin membuat refund request untuk booking ──────────────────────
router.post("/", async (req, res) => {
  try {
    const { bookingId, reason, amount, bankName, bankAccount, accountHolder } = req.body;
    if (!bookingId || !reason || !amount) {
      return res.status(400).json({ error: "bookingId, reason, dan amount wajib diisi" });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "amount harus berupa angka positif" });
    }

    const [booking] = await db
      .select({ id: bookings.id, userId: bookings.userId })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (!booking) return res.status(404).json({ error: "Booking tidak ditemukan" });

    // F1-03a: Hitung total yang sudah diverifikasi; tolak jika refund melebihi jumlah tersebut
    const [{ totalVerified }] = await db
      .select({ totalVerified: sum(payments.amount) })
      .from(payments)
      .where(and(eq(payments.bookingId, bookingId), eq(payments.status, "verified")));

    const maxRefundable = Number(totalVerified ?? 0);
    if (parsedAmount > maxRefundable) {
      return res.status(400).json({
        error: `Jumlah refund (Rp ${parsedAmount.toLocaleString("id-ID")}) melebihi total pembayaran yang sudah diverifikasi (Rp ${maxRefundable.toLocaleString("id-ID")})`,
      });
    }

    // F1-03b: Tolak jika sudah ada refund pending/approved untuk booking yang sama
    const existing = await db
      .select({ id: refundRequests.id, status: refundRequests.status })
      .from(refundRequests)
      .where(
        and(
          eq(refundRequests.bookingId, bookingId),
          or(eq(refundRequests.status, "pending"), eq(refundRequests.status, "approved")),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({
        error: `Sudah ada refund dengan status '${existing[0].status}' untuk booking ini. Selesaikan refund tersebut terlebih dahulu.`,
      });
    }

    const [refund] = await db.insert(refundRequests).values({
      id: crypto.randomUUID(),
      bookingId,
      userId: booking.userId ?? null,
      reason,
      amount: parsedAmount,
      bankName: bankName ?? null,
      bankAccount: bankAccount ?? null,
      accountHolder: accountHolder ?? null,
      status: "pending",
      createdAt: new Date(),
    }).returning();

    res.status(201).json(refund);
  } catch (e) {
    sendAdminError(res, "POST /api/admin/refunds", e);
  }
});

// ── GET / — daftar semua refund request ──────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const data = await db
      .select({
        id: refundRequests.id,
        userId: refundRequests.userId,
        bookingId: refundRequests.bookingId,
        reason: refundRequests.reason,
        amount: refundRequests.amount,
        // F2-07: bankAccount di-mask di list endpoint (hanya 4 digit terakhir)
        bankName: refundRequests.bankName,
        bankAccount: sql<string>`CASE
          WHEN ${refundRequests.bankAccount} IS NULL THEN NULL
          ELSE CONCAT('****', RIGHT(${refundRequests.bankAccount}, 4))
        END`.as("bank_account"),
        accountHolder: refundRequests.accountHolder,
        status: refundRequests.status,
        adminNotes: refundRequests.adminNotes,
        processedBy: refundRequests.processedBy,
        processedAt: refundRequests.processedAt,
        approvedAt: refundRequests.approvedAt,
        refundedAt: refundRequests.refundedAt,
        createdAt: refundRequests.createdAt,
        bookingCode: bookings.bookingCode,
        totalPrice: bookings.totalPrice,
      })
      .from(refundRequests)
      .leftJoin(bookings, eq(refundRequests.bookingId, bookings.id))
      .orderBy(desc(refundRequests.createdAt));
    res.json(data);
  } catch (e) {
    if (isTableMissing(e)) { console.warn("[refunds] table missing — returning []"); return res.json([]); }
    sendAdminError(res, "GET /api/admin/refunds", e);
  }
});

// ── GET /:id — detail refund (tampilkan nomor rekening penuh, admin only) ────
router.get("/:id", async (req, res) => {
  try {
    const [refund] = await db
      .select()
      .from(refundRequests)
      .where(eq(refundRequests.id, req.params.id))
      .limit(1);
    if (!refund) return res.status(404).json({ error: "Refund tidak ditemukan" });
    res.json(refund);
  } catch (e) {
    sendAdminError(res, "GET /api/admin/refunds/:id", e);
  }
});

// ── PATCH /:id — update status refund dengan state-machine ketat ──────────────
router.patch("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { status, adminNotes, processedBy } = req.body;
    const adminId = (req as any).user?.id as string | undefined;
    const now = new Date();

    // Ambil data refund sebelum update
    const [before] = await db
      .select({
        bookingId: refundRequests.bookingId,
        amount:    refundRequests.amount,
        status:    refundRequests.status,
      })
      .from(refundRequests)
      .where(eq(refundRequests.id, id))
      .limit(1);

    if (!before) {
      return res.status(404).json({ error: "Refund tidak ditemukan" });
    }

    // F1-03c: State-machine — tolak transisi yang tidak diizinkan
    if (status && status !== before.status) {
      const allowedNext = ALLOWED_TRANSITIONS[before.status ?? ""] ?? [];
      if (!allowedNext.includes(status)) {
        return res.status(409).json({
          error: `Tidak dapat mengubah status refund dari '${before.status}' ke '${status}'. Transisi yang diizinkan: ${allowedNext.join(", ") || "tidak ada"}`,
        });
      }
    }

    // F1-03d: Update status + jurnal dalam satu transaksi DB
    const updated = await db.transaction(async (tx) => {
      const [result] = await tx
        .update(refundRequests)
        .set({
          status,
          adminNotes,
          processedBy,
          processedAt: now,
          ...(status === "approved" ? { approvedAt: now } : {}),
          ...(status === "refunded" ? { refundedAt: now } : {}),
        })
        .where(eq(refundRequests.id, id))
        .returning();

      // Auto-jurnal dalam transaksi yang sama — jika jurnal gagal, seluruh operasi rollback
      if (before.bookingId && before.amount != null) {
        if (status === "approved" && before.status !== "approved") {
          await journalRefundApproved({
            bookingId: before.bookingId,
            amount: Number(before.amount),
            refundId: id,
            adminId,
          }, tx);
        } else if (status === "refunded" && before.status !== "refunded") {
          await journalRefundProcessed({
            bookingId: before.bookingId,
            amount: Number(before.amount),
            refundId: id,
            adminId,
          }, tx);
        }
      }

      return result;
    });

    res.json(updated);
  } catch (e) {
    sendAdminError(res, "PATCH /api/admin/refunds/:id", e);
  }
});

export default router;
