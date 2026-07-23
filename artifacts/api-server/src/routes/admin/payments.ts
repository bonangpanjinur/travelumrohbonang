import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import {
  db,
  bookings,
  bookingPayments,
  payments,
  profiles,
  eq,
  and,
  sql,
  desc,
} from "@workspace/db";
import { sbGetBooking, sbGetPayments } from "../../lib/supabaseFallback";
import {
  AdminRecordPaymentRequest,
  AdminUpdatePaymentRequest,
  BookingPaymentSchema,
  BookingPaymentSummarySchema,
  type AdminRecordPaymentInput,
  type AdminUpdatePaymentInput,
} from "@workspace/api-zod";
import { validate } from "../../middlewares/validate";
import {
  computePaymentStatus,
  syncBookingStatus,
  recordFinancialTransaction,
  createNotification,
} from "../../lib/paymentSync";
import { journalPaymentVerified } from "../../lib/autoJournal";
import { emailNotifications } from "../../lib/notifications/emailNotifications";
import { waNotifications } from "../../lib/notifications/waNotifications";

// ── Multer setup for payment proof uploads ────────────────────────────────────
function getProofUploadDir(): string {
  const dir =
    process.env.VERCEL === "1" || process.cwd().startsWith("/var/task")
      ? "/tmp/uploads/payment-proofs"
      : path.join(process.cwd(), "uploads", "payment-proofs");
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  return dir;
}

const proofStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, getProofUploadDir()),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".bin";
    cb(null, `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`);
  },
});

const proofUpload = multer({
  storage: proofStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router({ mergeParams: true });

// ── POST /upload-proof — upload bukti pembayaran ──────────────────────────────
router.post("/upload-proof", proofUpload.single("file"), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "File tidak diterima atau format tidak didukung (JPG/PNG/PDF)" });
    }
    const url = `/api/admin/payments/proof-files/${req.file.filename}`;
    return res.json({ url, filename: req.file.filename, size: req.file.size });
  } catch (err) {
    console.error("[admin/payments] upload-proof error:", err);
    return res.status(500).json({ error: "Gagal upload bukti pembayaran" });
  }
});

// ── GET /proof-files/:filename — serve uploaded proof files ──────────────────
router.get("/proof-files/:filename", (req: any, res) => {
  const { filename } = req.params;
  if (!filename || filename.includes("..") || filename.includes("/")) {
    return res.status(400).json({ error: "Invalid filename" });
  }
  const filePath = path.join(getProofUploadDir(), filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
  return res.sendFile(filePath);
});

router.get("/all", async (req, res) => {
  try {
    const data = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        status: payments.status,
        proofUrl: payments.proofUrl,
        paymentMethod: payments.paymentMethod,
        paymentType: payments.paymentType,
        paidAt: payments.paidAt,
        createdAt: payments.createdAt,
        jamaahName: profiles.name,
        booking: {
          id: bookings.id,
          bookingCode: bookings.bookingCode,
          status: bookings.status,
          totalPrice: bookings.totalPrice,
          userId: bookings.userId,
        },
      })
      .from(payments)
      .leftJoin(bookings, eq(payments.bookingId, bookings.id))
      .leftJoin(profiles, eq(profiles.id, bookings.userId))
      .orderBy(desc(payments.createdAt));
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch all payments" });
  }
});

router.get("/recent-pending", async (req, res) => {
  try {
    const data = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        status: payments.status,
        createdAt: payments.createdAt,
        bookingCode: bookings.bookingCode,
      })
      .from(payments)
      .leftJoin(bookings, eq(payments.bookingId, bookings.id))
      .where(eq(payments.status, "pending"))
      .orderBy(desc(payments.createdAt))
      .limit(20);
    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to fetch recent pending payments" });
  }
});

// ── POST /bulk-verify — batch approve multiple pending payments ───────────────
router.post("/bulk-verify", async (req, res) => {
  try {
    const { ids } = req.body as { ids?: string[] };
    const adminId = (req as any).user?.id as string | undefined;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array is required" });
    }
    if (ids.length > 50) {
      return res.status(400).json({ error: "Maximum 50 payments per batch" });
    }

    const results: { id: string; ok: boolean; error?: string }[] = [];

    for (const id of ids) {
      try {
        const [payment] = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
        if (!payment || payment.status !== "pending") {
          results.push({ id, ok: false, error: "Not found or not pending" });
          continue;
        }

        const now = new Date();
        await db.update(payments).set({
          status: "verified",
          verifiedBy: adminId ?? null,
          verifiedAt: now,
          paidAt: payment.paidAt ?? now,
        }).where(eq(payments.id, id));

        // Idempotent bookingPayments record
        const ref = `manual-${id}`;
        const already = await db.select({ id: bookingPayments.id }).from(bookingPayments)
          .where(and(eq(bookingPayments.bookingId, payment.bookingId), eq(bookingPayments.referenceNumber, ref), eq(bookingPayments.isVoided, false)))
          .limit(1);
        if (already.length === 0) {
          await db.insert(bookingPayments).values({
            id: crypto.randomUUID(),
            bookingId: payment.bookingId,
            type: payment.paymentType ?? "manual",
            amount: payment.amount,
            paidAt: payment.paidAt ?? now,
            method: payment.paymentMethod ?? "transfer",
            referenceNumber: ref,
            notes: `Bulk verified by admin`,
            recordedBy: adminId ?? null,
            isVoided: false,
            createdAt: now,
          });
        }

        const { paymentStatus } = await computePaymentStatus(payment.bookingId);
        await syncBookingStatus(payment.bookingId, paymentStatus);
        // F-6: idempotent via journalPaymentVerified
        await journalPaymentVerified({
          bookingId: payment.bookingId,
          amount:    payment.amount,
          paymentId: id,
          adminId,
        });

        results.push({ id, ok: true });
      } catch (err: any) {
        results.push({ id, ok: false, error: err?.message ?? "Unknown error" });
      }
    }

    const ok = results.filter(r => r.ok).length;
    res.json({ ok, failed: results.length - ok, results });
  } catch (e) {
    console.error("[admin/payments] bulk-verify error:", e);
    res.status(500).json({ error: "Failed to bulk verify payments" });
  }
});

// ── PATCH /verify/:id ─────────────────────────────────────────────────────────
// Admin confirms a manual payment proof (bank transfer upload).
// Flow:
//   1. Update payments.status → 'verified'
//   2. Create bookingPayments record so computePaymentStatus sees it
//   3. Sync bookings.status via paymentSync helpers
//   4. Record financial_transactions entry
//   5. Send in-app notification to jamaah

router.patch("/verify/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const adminId = (req as any).user?.id as string | undefined;

    // Fetch the payment to get bookingId and amount.
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.status === "verified") {
      return res.status(409).json({ error: "Payment already verified" });
    }

    // 1. Update the payments record.
    const now = new Date();
    const [updated] = await db
      .update(payments)
      .set({
        status: "verified",
        verifiedBy: adminId ?? null,
        verifiedAt: now,
        paidAt: payment.paidAt ?? now,
      })
      .where(eq(payments.id, id))
      .returning();

    // 2. Create a bookingPayments record so payment status computation is accurate.
    // Idempotency: check if a record for this payment already exists before inserting.
    const alreadyRecorded = await db
      .select({ id: bookingPayments.id })
      .from(bookingPayments)
      .where(
        and(
          eq(bookingPayments.bookingId, payment.bookingId),
          eq(bookingPayments.referenceNumber, `manual-${payment.id}`),
          eq(bookingPayments.isVoided, false),
        ),
      )
      .limit(1);

    if (alreadyRecorded.length === 0) {
      await db.insert(bookingPayments).values({
        id: crypto.randomUUID(),
        bookingId: payment.bookingId,
        type: payment.paymentType ?? "manual",
        amount: payment.amount,
        paidAt: payment.paidAt ?? now,
        method: payment.paymentMethod ?? "transfer",
        referenceNumber: `manual-${payment.id}`,
        notes: `Verified by admin (payment proof: ${payment.proofUrl ?? "n/a"})`,
        recordedBy: adminId ?? null,
        isVoided: false,
        createdAt: now,
      });
    }

    // 3. Sync booking status.
    const { paymentStatus, totalPrice, totalPaid, remaining } =
      await computePaymentStatus(payment.bookingId);
    await syncBookingStatus(payment.bookingId, paymentStatus);

    // 4. Record financial transaction (via autoJournal — idempotent).
    await journalPaymentVerified({
      bookingId: payment.bookingId,
      amount:    payment.amount,
      paymentId: id,
      adminId,
    });

    // 5. In-app notification — fetch userId from booking.
    const [booking] = await db
      .select({ userId: bookings.userId })
      .from(bookings)
      .where(eq(bookings.id, payment.bookingId))
      .limit(1);

    if (booking?.userId) {
      const isFullyPaid = paymentStatus === "paid";
      await createNotification({
        userId: booking.userId,
        title: isFullyPaid ? "Pembayaran Lunas ✓" : "Pembayaran Dikonfirmasi",
        message: isFullyPaid
          ? "Selamat! Pembayaran Anda telah diverifikasi dan booking sudah dikonfirmasi."
          : `Pembayaran sebesar Rp${payment.amount.toLocaleString("id-ID")} telah diverifikasi. Sisa pembayaran: Rp${remaining.toLocaleString("id-ID")}.`,
      });
    }

    res.json({
      payment: updated,
      summary: { totalPrice, totalPaid, remaining, paymentStatus },
    });

    // Fire-and-forget: email/WA failure must never affect the verify response.
    void emailNotifications.paymentReceived(payment.bookingId, payment.amount);
    void waNotifications.paymentReceived(payment.bookingId, payment.amount);
  } catch (e) {
    console.error("[admin/payments] verify error:", e);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

// ── PATCH /reject/:id ─────────────────────────────────────────────────────────
// Admin rejects a manual payment proof (e.g. blurry image, wrong amount).
// Booking status is NOT changed — jamaah should re-upload.

router.patch("/reject/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const adminId = (req as any).user?.id as string | undefined;
    const { reason } = req.body as { reason?: string };

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.status === "verified") {
      return res.status(409).json({ error: "Cannot reject an already-verified payment" });
    }

    const now = new Date();
    const [updated] = await db
      .update(payments)
      .set({
        status: "rejected",
        verifiedBy: adminId ?? null,
        verifiedAt: now,
        rejectionReason: reason ?? null,
      })
      .where(eq(payments.id, id))
      .returning();

    // In-app notification to jamaah.
    const [booking] = await db
      .select({ userId: bookings.userId })
      .from(bookings)
      .where(eq(bookings.id, payment.bookingId))
      .limit(1);

    if (booking?.userId) {
      await createNotification({
        userId: booking.userId,
        title: "Bukti Pembayaran Ditolak",
        message: reason
          ? `Bukti pembayaran Anda ditolak: ${reason}. Silakan upload ulang.`
          : "Bukti pembayaran Anda ditolak. Silakan upload ulang bukti yang valid.",
      });
    }

    res.json({ payment: updated });
  } catch (e) {
    console.error("[admin/payments] reject error:", e);
    res.status(500).json({ error: "Failed to reject payment" });
  }
});

router.get("/", async (req, res) => {
  try {
    const bookingId = (req.params as Record<string, string>).bookingId;

    const [booking] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      // Fallback: cek Supabase jika booking tidak ada di local DB
      const userToken = (req.headers.authorization || "").replace("Bearer ", "");
      const sbBooking = await sbGetBooking(bookingId, userToken);
      if (sbBooking) {
        const sbPayRows = await sbGetPayments(bookingId, userToken);
        const activeRows = sbPayRows.filter((p: any) => !p.is_voided);
        const totalPrice = Number(sbBooking.total_price || 0);
        const totalPaid = activeRows.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
        const remaining = Math.max(0, totalPrice - totalPaid);
        const paymentStatus =
          totalPrice > 0 && totalPaid >= totalPrice ? "paid"
          : totalPaid > 0 ? "partial"
          : "unpaid";
        return res.json({
          totalPrice,
          totalPaid,
          remaining,
          paymentStatus,
          payments: sbPayRows.map((p: any) => ({
            id: p.id,
            bookingId: p.booking_id,
            type: p.type ?? "cash",
            amount: Number(p.amount),
            method: p.method ?? null,
            paidAt: p.paid_at,
            referenceNumber: p.reference_number ?? null,
            notes: p.notes ?? null,
            isVoided: p.is_voided ?? false,
            voidedAt: p.voided_at ?? null,
            voidedBy: p.voided_by ?? null,
            voidReason: p.void_reason ?? null,
            proofUrl: p.proof_url ?? null,
            recordedBy: p.recorded_by ?? null,
          })),
        });
      }
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    const paymentRows = await db
      .select({
        id: bookingPayments.id,
        bookingId: bookingPayments.bookingId,
        type: bookingPayments.type,
        amount: bookingPayments.amount,
        paidAt: bookingPayments.paidAt,
        method: bookingPayments.method,
        notes: bookingPayments.notes,
        isVoided: bookingPayments.isVoided,
        createdAt: bookingPayments.createdAt,
      })
      .from(bookingPayments)
      .where(eq(bookingPayments.bookingId, bookingId))
      .orderBy(sql`${bookingPayments.paidAt} asc`);

    const { totalPrice, totalPaid, remaining, paymentStatus } =
      await computePaymentStatus(bookingId);

    const payments = paymentRows.flatMap((p) => {
      try { return [BookingPaymentSchema.parse(p)]; } catch { return []; }
    });

    res.json(
      BookingPaymentSummarySchema.parse({
        totalPrice,
        totalPaid,
        remaining,
        paymentStatus,
        payments,
      }),
    );
  } catch (e) {
    console.error("[admin/payments GET /]", e);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

router.post("/", validate(AdminRecordPaymentRequest), async (req, res) => {
  try {
    const bookingId = (req.params as Record<string, string>).bookingId;
    const body = req.body as AdminRecordPaymentInput;
    const adminId = req.user?.id;

    const [booking] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    const [created] = await db
      .insert(bookingPayments)
      .values({
        id: crypto.randomUUID(),
        bookingId,
        type: body.type,
        amount: body.amount,
        paidAt: new Date(body.paidAt),
        method: body.method ?? null,
        referenceNumber: body.referenceNumber ?? null,
        notes: body.notes ?? null,
        proofUrl: body.proofUrl ?? null,
        recordedBy: adminId ?? null,
        isVoided: false,
        createdAt: new Date(),
      })
      .returning();

    const { totalPrice, totalPaid, remaining, paymentStatus } =
      await computePaymentStatus(bookingId);
    await syncBookingStatus(bookingId, paymentStatus);

    res.status(201).json({
      payment: BookingPaymentSchema.parse(created),
      summary: { totalPrice, totalPaid, remaining, paymentStatus },
    });
  } catch (err) {
    console.error("[admin/payments] POST /:bookingId/payments error:", err);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

router.get("/:paymentId", async (req, res) => {
  try {
    const bookingId = (req.params as Record<string, string>).bookingId;
    const paymentId = req.params.paymentId as string;

    const [payment] = await db
      .select()
      .from(bookingPayments)
      .where(
        and(
          eq(bookingPayments.id, paymentId),
          eq(bookingPayments.bookingId, bookingId),
        ),
      )
      .limit(1);

    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    res.json(BookingPaymentSchema.parse(payment));
  } catch {
    res.status(500).json({ error: "Failed to fetch payment" });
  }
});

router.patch(
  "/:paymentId",
  validate(AdminUpdatePaymentRequest),
  async (req, res) => {
    try {
      const bookingId = (req.params as Record<string, string>).bookingId;
      const paymentId = req.params.paymentId as string;
      const updates = req.body as AdminUpdatePaymentInput;

      const setValues: Record<string, unknown> = {};
      if (updates.type !== undefined) setValues.type = updates.type;
      if (updates.amount !== undefined) setValues.amount = updates.amount;
      if (updates.paidAt !== undefined)
        setValues.paidAt = new Date(updates.paidAt);
      if (updates.method !== undefined) setValues.method = updates.method;
      if (updates.referenceNumber !== undefined)
        setValues.referenceNumber = updates.referenceNumber;
      if (updates.notes !== undefined) setValues.notes = updates.notes;

      const [updated] = await db
        .update(bookingPayments)
        .set(setValues)
        .where(
          and(
            eq(bookingPayments.id, paymentId),
            eq(bookingPayments.bookingId, bookingId),
          ),
        )
        .returning();

      if (!updated) {
        res.status(404).json({ error: "Payment not found" });
        return;
      }

      const { totalPrice, totalPaid, remaining, paymentStatus } =
        await computePaymentStatus(bookingId);
      await syncBookingStatus(bookingId, paymentStatus);

      res.json({
        payment: BookingPaymentSchema.parse(updated),
        summary: { totalPrice, totalPaid, remaining, paymentStatus },
      });
    } catch {
      res.status(500).json({ error: "Failed to update payment" });
    }
  },
);

router.delete("/:paymentId", async (req, res) => {
  try {
    const bookingId = (req.params as Record<string, string>).bookingId;
    const paymentId = req.params.paymentId as string;

    const [voided] = await db
      .update(bookingPayments)
      .set({ isVoided: true })
      .where(
        and(
          eq(bookingPayments.id, paymentId),
          eq(bookingPayments.bookingId, bookingId),
        ),
      )
      .returning();

    if (!voided) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const { totalPrice, totalPaid, remaining, paymentStatus } =
      await computePaymentStatus(bookingId);
    await syncBookingStatus(bookingId, paymentStatus);

    res.json({
      message: "Payment voided successfully",
      summary: { totalPrice, totalPaid, remaining, paymentStatus },
    });
  } catch {
    res.status(500).json({ error: "Failed to void payment" });
  }
});

export default router;
