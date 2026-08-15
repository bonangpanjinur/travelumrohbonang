import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { objectStorageClient } from "../../lib/objectStorage";
import {
  db,
  bookings,
  bookingPilgrims,
  bookingPayments,
  bookingPaymentAllocations,
  payments,
  financialTransactions,
  paymentProofAccessLogs,
  profiles,
  eq,
  and,
  sql,
  desc,
  sum,
  inArray,
} from "@workspace/db";
import { sbGetBooking, sbGetPayments } from "../../lib/supabaseFallback";
import { resolveUserScope } from "../../lib/scopeGuard";
import {
  buildBookingScopeCondition,
  isBookingInScope,
  scopeDeniedMessage,
} from "../../lib/scopeConditions";
import {
  AdminRecordPaymentRequest,
  AdminUpdatePaymentRequest,
  BookingPaymentSchema,
  BookingPaymentSummarySchema,
  type AdminRecordPaymentInput,
  type AdminUpdatePaymentInput,
} from "@workspace/api-zod";
import { validate } from "../../middlewares/validate";
import { requireFinance } from "../../middlewares/requireAdmin";
import {
  computePaymentStatus,
  syncBookingStatus,
  recordFinancialTransaction,
  createNotification,
} from "../../lib/paymentSync";
import { journalPaymentVerified } from "../../lib/autoJournal";
import { emailNotifications } from "../../lib/notifications/emailNotifications";
import { waNotifications } from "../../lib/notifications/waNotifications";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "../../lib/supabaseEnv";

// ── F2-02: Object Storage untuk bukti pembayaran ─────────────────────────────
// File diunggah ke Replit App Storage (GCS) agar tidak hilang saat redeploy.
// URL format: /api/admin/payments/proof-files/{objectPath_base64url}
//
// Legacy fallback: file lama yang tersimpan di disk lokal tetap bisa diakses
// via endpoint yang sama menggunakan path tanpa prefix "/objects/".

/**
 * Upload buffer ke Replit Object Storage (GCS).
 * Returns path dalam format "/objects/{bucket}/{dir}/{uuid}{ext}".
 */
async function uploadProofToObjectStorage(
  buffer: Buffer,
  originalname: string,
  mimetype: string,
): Promise<string> {
  const privateDir = process.env.PRIVATE_OBJECT_DIR ?? "";
  if (!privateDir) {
    return uploadProofToSupabaseStorage(buffer, originalname, mimetype);
  }

  // Parse "/bucket-name/prefix" format
  const stripped = privateDir.replace(/^\/+/, "");
  const slashIdx = stripped.indexOf("/");
  const bucketName = slashIdx === -1 ? stripped : stripped.slice(0, slashIdx);
  const prefix = slashIdx === -1 ? "" : stripped.slice(slashIdx + 1);

  const ext = path.extname(originalname) || ".bin";
  const objectId = crypto.randomUUID();
  const objectName = prefix
    ? `${prefix}/payment-proofs/${objectId}${ext}`
    : `payment-proofs/${objectId}${ext}`;

  const bucket = objectStorageClient.bucket(bucketName);
  const gcsFile = bucket.file(objectName);
  await gcsFile.save(buffer, { contentType: mimetype, resumable: false });

  return `/objects/${bucketName}/${objectName}`;
}

/**
 * Serverless fallback for Vercel: upload to the private Supabase Storage bucket
 * instead of the Replit GCS sidecar, which is unavailable outside Replit.
 */
async function uploadProofToSupabaseStorage(
  buffer: Buffer,
  originalname: string,
  mimetype: string,
): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase Storage is not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  const bucketName = process.env.SUPABASE_PAYMENT_PROOF_BUCKET || "payment-proofs";
  const ext = path.extname(originalname) || ".bin";
  const objectName = `admin/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${ext}`;
  const encodedPath = objectName.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucketName)}/${encodedPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": mimetype,
      "x-upsert": "false",
    },
    body: buffer,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Supabase Storage upload failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  return `/supabase-objects/${bucketName}/${objectName}`;
}

// Use memory storage — file uploaded to GCS server-side instead of disk
const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    cb(null, allowed.includes(file.mimetype));
  },
});

// Keep legacy disk fallback for files uploaded before F2-02 migration
function getLegacyProofPath(filename: string): string | null {
  const dirs = [
    path.join(process.cwd(), "uploads", "payment-proofs"),
    "/tmp/uploads/payment-proofs",
  ];
  for (const dir of dirs) {
    const p = path.join(dir, filename);
    try { if (fs.existsSync(p)) return p; } catch {}
  }
  return null;
}

const router = Router({ mergeParams: true });

async function validatePaymentAllocations(
  bookingId: string,
  allocations: Array<{ pilgrimId: string; amount: number }> | undefined,
  paymentAmount: number,
): Promise<string | null> {
  if (!allocations) return null;
  const unique = new Map(allocations.map((item) => [item.pilgrimId, item]));
  if (unique.size !== allocations.length) return "Each pilgrim may appear only once in allocations";
  const allocatedTotal = allocations.reduce((total, item) => total + item.amount, 0);
  if (allocatedTotal !== paymentAmount) return "Allocation total must equal payment amount";
  const ids = [...unique.keys()];
  const pilgrims = await db
    .select({ id: bookingPilgrims.id })
    .from(bookingPilgrims)
    .where(and(eq(bookingPilgrims.bookingId, bookingId), inArray(bookingPilgrims.id, ids)));
  if (pilgrims.length !== ids.length) return "All allocated pilgrims must belong to this booking";
  return null;
}

async function paymentBookingInScope(req: any, bookingId: string): Promise<boolean> {
  const scope = await resolveUserScope(req);
  if (scope.type === "global") return true;
  const [booking] = await db
    .select({ branchId: bookings.branchId, agentId: bookings.agentId, picType: bookings.picType, picId: bookings.picId })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  return !!booking && isBookingInScope(booking, scope);
}

// ── POST /upload-proof — upload bukti pembayaran ke Object Storage (F2-02) ────
router.post("/upload-proof", proofUpload.single("file"), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "File tidak diterima atau format tidak didukung (JPG/PNG/PDF)" });
    }
    const objectPath = await uploadProofToObjectStorage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
    );
    // Encode objectPath as base64url so it can be embedded in a URL segment
    const encoded = Buffer.from(objectPath).toString("base64url");
    const url = `/api/admin/payments/proof-files/${encoded}`;
    return res.json({ url, size: req.file.size });
  } catch (err) {
    console.error("[admin/payments] upload-proof error:", err);
    return res.status(500).json({ error: "Gagal upload bukti pembayaran" });
  }
});

// ── GET /proof-files/:token — serve bukti pembayaran (F2-02) ─────────────────
// token = base64url(objectPath) untuk file baru, atau plain filename untuk legacy
//
// Akses kontrol (F2-02 security requirement):
//   - Global scope (super_admin, admin, finance, owner): akses penuh
//   - Branch / agent scope: hanya boleh akses jika booking milik branch/agen mereka
//   - Akses tanpa scope yang cocok: 403
//   - Akses dicatat di paymentProofAccessLogs
router.get("/proof-files/:token", async (req: any, res) => {
  const { token } = req.params;
  if (!token || token.includes("..")) {
    return res.status(400).json({ error: "Invalid token" });
  }

  // ── 1. Resolve scope & authorize ─────────────────────────────────────────
  const scope = await resolveUserScope(req);
  const userId = req.user?.id as string | undefined;

  // Non-global scopes must be validated against the booking that owns this proof
  if (scope.type !== "global") {
    // Look up which payment + booking owns this proof URL
    const proofUrl = `/api/admin/payments/proof-files/${token}`;
    const proofRows = await db
      .select({
        paymentId: payments.id,
        bookingId: payments.bookingId,
        branchId: bookings.branchId,
        agentId: bookings.agentId,
        picType: bookings.picType,
        picId: bookings.picId,
      })
      .from(payments)
      .leftJoin(bookings, eq(payments.bookingId, bookings.id))
      .where(eq(payments.proofUrl, proofUrl))
      .limit(1);

    if (proofRows.length === 0) {
      // Not found in DB — deny non-global users (don't leak file existence)
      return res.status(403).json({ error: scopeDeniedMessage(scope) });
    }

    const row = proofRows[0];
    const inScope = isBookingInScope(
      { branchId: row.branchId, agentId: row.agentId, picType: row.picType, picId: row.picId },
      scope,
    );
    if (!inScope) {
      return res.status(403).json({ error: scopeDeniedMessage(scope) });
    }

    // Log access for audit (best-effort, never block the response)
    void db.insert(paymentProofAccessLogs).values({
      id: crypto.randomUUID(),
      userId: userId ?? null,
      bookingId: row.bookingId ?? null,
      paymentId: row.paymentId ?? null,
      context: "admin-proof-serve",
      createdAt: new Date(),
    }).catch((e) => console.warn("[admin/payments] proof access log error:", e));
  }

  // ── 2. Try to decode as base64url (new object storage paths) ─────────────
  let objectPath: string | null = null;
  let supabaseObjectPath: string | null = null;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    if (decoded.startsWith("/objects/")) objectPath = decoded;
    if (decoded.startsWith("/supabase-objects/")) supabaseObjectPath = decoded;
  } catch {}

  if (supabaseObjectPath) {
    try {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase Storage is not configured");
      const stripped = supabaseObjectPath.replace(/^\/supabase-objects\//, "");
      const slashIdx = stripped.indexOf("/");
      if (slashIdx <= 0) throw new Error("Invalid Supabase object path");
      const bucketName = stripped.slice(0, slashIdx);
      const objectName = stripped.slice(slashIdx + 1);
      const response = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${encodeURIComponent(bucketName)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: 3600, paths: [objectName] }),
      });
      if (!response.ok) throw new Error(`Supabase signed URL failed (${response.status})`);
      const payload = await response.json() as { signedURLs?: Array<{ signedURL?: string }> };
      const signedPath = payload.signedURLs?.[0]?.signedURL;
      if (!signedPath) throw new Error("Supabase signed URL missing");
      return res.redirect(302, signedPath.startsWith("http") ? signedPath : `${SUPABASE_URL}/storage/v1${signedPath}`);
    } catch (err) {
      console.error("[admin/payments] proof serve (supabase) error:", err);
      return res.status(404).json({ error: "File not found" });
    }
  }

  if (objectPath) {
    // New path: stream from GCS via signed URL redirect (TTL 1 jam)
    try {
      const stripped = objectPath.replace(/^\/objects\//, "");
      const slashIdx = stripped.indexOf("/");
      const bucketName = slashIdx === -1 ? stripped : stripped.slice(0, slashIdx);
      const objectName = stripped.slice(slashIdx + 1);
      const bucket = objectStorageClient.bucket(bucketName);
      const gcsFile = bucket.file(objectName);
      const [signedUrl] = await gcsFile.getSignedUrl({
        action: "read",
        expires: Date.now() + 60 * 60 * 1000,
      });
      return res.redirect(302, signedUrl);
    } catch (err) {
      console.error("[admin/payments] proof serve (gcs) error:", err);
      return res.status(404).json({ error: "File not found" });
    }
  }

  // ── 3. Legacy fallback: serve from local disk (files before F2-02) ────────
  if (token.includes("/")) {
    return res.status(400).json({ error: "Invalid filename" });
  }
  const legacyPath = getLegacyProofPath(token);
  if (!legacyPath) return res.status(404).json({ error: "File not found" });
  return res.sendFile(legacyPath);
});

router.get("/all", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const scopeCondition = buildBookingScopeCondition(scope, "bookings");

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
      .where(scopeCondition)
      .orderBy(desc(payments.createdAt));
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch all payments" });
  }
});

router.get("/recent-pending", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const scopeCondition = buildBookingScopeCondition(scope, "bookings");

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
      .where(and(eq(payments.status, "pending"), scopeCondition))
      .orderBy(desc(payments.createdAt))
      .limit(20);
    res.json(data);
  } catch (e) {
    console.error("[GET /recent-pending]", e);
    res.status(500).json({ error: "Failed to fetch recent pending payments" });
  }
});

// ── POST /bulk-verify — batch approve multiple pending payments ───────────────
router.post("/bulk-verify", requireFinance, async (req, res) => {
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
        if (!(await paymentBookingInScope(req, payment.bookingId))) {
          results.push({ id, ok: false, error: "Payment operation is outside your scope" });
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

router.patch("/verify/:id", requireFinance, async (req, res) => {
  try {
    const id = req.params.id;
    const adminId = (req as any).user?.id as string | undefined;

    // F2-05: Seluruh verify (update status + bookingPayments + jurnal) dalam satu
    // transaksi DB dengan SELECT FOR UPDATE untuk mencegah verifikasi bersamaan oleh dua admin.
    const { updated, paymentData } = await db.transaction(async (tx) => {
      // Lock baris payment sebelum update — request bersamaan akan antre
      const locked = await tx.execute(
        sql`SELECT * FROM payments WHERE id = ${id} FOR UPDATE`,
      );
      const payment = locked.rows[0] as Record<string, unknown> | undefined;

      if (!payment) throw Object.assign(new Error("Payment not found"), { status: 404 });
      if (!(await paymentBookingInScope(req, String(payment["booking_id"])))) {
        throw Object.assign(new Error("Payment operation is outside your scope"), { status: 403 });
      }
      if (payment["status"] === "verified") throw Object.assign(new Error("Payment already verified"), { status: 409 });

      const now = new Date();

      // 1. Update status payment
      const [updatedRow] = await tx
        .update(payments)
        .set({
          status: "verified",
          verifiedBy: adminId ?? null,
          verifiedAt: now,
          paidAt: payment["paid_at"] != null ? new Date(payment["paid_at"] as string) : now,
        })
        .where(eq(payments.id, id))
        .returning();

      // 2. Buat bookingPayments (idempotent)
      const alreadyRecorded = await tx
        .select({ id: bookingPayments.id })
        .from(bookingPayments)
        .where(
          and(
            eq(bookingPayments.bookingId, String(payment["booking_id"])),
            eq(bookingPayments.referenceNumber, `manual-${id}`),
            eq(bookingPayments.isVoided, false),
          ),
        )
        .limit(1);

      if (alreadyRecorded.length === 0) {
        await tx.insert(bookingPayments).values({
          id: crypto.randomUUID(),
          bookingId: String(payment["booking_id"]),
          branchId: (payment["branch_id"] as string | null) ?? null,
          type: (payment["payment_type"] as string | null) ?? "manual",
          amount: Number(payment["amount"]),
          paidAt: now,
          method: (payment["payment_method"] as string | null) ?? "transfer",
          referenceNumber: `manual-${id}`,
          notes: `Verified by admin (payment proof: ${payment["proof_url"] ?? "n/a"})`,
          recordedBy: adminId ?? null,
          isVoided: false,
          createdAt: now,
        });
      }

      // 3. Auto-jurnal dalam transaksi yang sama (F2-03)
      await journalPaymentVerified({
        bookingId: String(payment["booking_id"]),
        amount: Number(payment["amount"]),
        paymentId: String(id),
        adminId,
      }, tx);

      return { updated: updatedRow, paymentData: payment };
    });

    // 4. Sync booking status (idempotent, bisa di luar transaksi utama)
    const bookingId = String(paymentData["booking_id"]);
    const { paymentStatus, totalPrice, totalPaid, remaining } =
      await computePaymentStatus(bookingId);
    await syncBookingStatus(bookingId, paymentStatus);

    // 5. In-app notification — fetch userId from booking.
    const paymentAmount = Number(paymentData["amount"]);
    const [bookingForNotif] = await db
      .select({ userId: bookings.userId })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (bookingForNotif?.userId) {
      const isFullyPaid = paymentStatus === "paid";
      await createNotification({
        userId: bookingForNotif.userId,
        title: isFullyPaid ? "Pembayaran Lunas ✓" : "Pembayaran Dikonfirmasi",
        message: isFullyPaid
          ? "Selamat! Pembayaran Anda telah diverifikasi dan booking sudah dikonfirmasi."
          : `Pembayaran sebesar Rp${paymentAmount.toLocaleString("id-ID")} telah diverifikasi. Sisa pembayaran: Rp${remaining.toLocaleString("id-ID")}.`,
      });
    }

    res.json({
      payment: updated,
      summary: { totalPrice, totalPaid, remaining, paymentStatus },
    });

    // Fire-and-forget: email/WA failure must never affect the verify response.
    void emailNotifications.paymentReceived(bookingId, paymentAmount);
    void waNotifications.paymentReceived(bookingId, paymentAmount);
  } catch (e: any) {
    console.error("[admin/payments] verify error:", e);
    const status = Number.isInteger(e?.status) && e.status >= 400 && e.status < 500 ? e.status : 500;
    res.status(status).json({ error: status === 500 ? "Failed to verify payment" : e?.message });
  }
});

// ── PATCH /reject/:id ─────────────────────────────────────────────────────────
// Admin rejects a manual payment proof (e.g. blurry image, wrong amount).
// Booking status is NOT changed — jamaah should re-upload.

router.patch("/reject/:id", requireFinance, async (req, res) => {
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
    if (!(await paymentBookingInScope(req, payment.bookingId))) {
      return res.status(403).json({ error: "Payment operation is outside your scope" });
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
    const scope = await resolveUserScope(req);

    const [booking] = await db
      .select({
        id: bookings.id,
        branchId: bookings.branchId,
        agentId: bookings.agentId,
        picType: bookings.picType,
        picId: bookings.picId,
      })
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

    // ── Scope guard: deny access to bookings outside this user's scope ────────
    if (!isBookingInScope(booking, scope)) {
      return res.status(403).json({ error: scopeDeniedMessage(scope) });
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

        const paymentIds = paymentRows.map((payment) => payment.id);
    const allocationRows = paymentIds.length
      ? await db
          .select({ paymentId: bookingPaymentAllocations.paymentId, pilgrimId: bookingPaymentAllocations.pilgrimId, amount: bookingPaymentAllocations.amount })
          .from(bookingPaymentAllocations)
          .where(inArray(bookingPaymentAllocations.paymentId, paymentIds))
      : [];
    const allocationsByPayment = new Map<string, Array<{ pilgrimId: string; amount: number }>>();
    for (const allocation of allocationRows) {
      const items = allocationsByPayment.get(allocation.paymentId) ?? [];
      items.push({ pilgrimId: allocation.pilgrimId, amount: allocation.amount });
      allocationsByPayment.set(allocation.paymentId, items);
    }
    const payments = paymentRows.flatMap((p) => {
      try { return [BookingPaymentSchema.parse({ ...p, allocations: allocationsByPayment.get(p.id) })]; } catch { return []; }
    });
    const pilgrimRows = await db
      .select({ id: bookingPilgrims.id, name: bookingPilgrims.name })
      .from(bookingPilgrims)
      .where(eq(bookingPilgrims.bookingId, bookingId));
    const paidByPilgrim = new Map<string, number>();
    for (const allocation of allocationRows) {
      paidByPilgrim.set(allocation.pilgrimId, (paidByPilgrim.get(allocation.pilgrimId) ?? 0) + allocation.amount);
    }
    const perPilgrim = pilgrimRows.map((pilgrim) => ({
      pilgrimId: pilgrim.id,
      name: pilgrim.name,
      allocatedPaid: paidByPilgrim.get(pilgrim.id) ?? 0,
    }));
    const { totalPrice, totalPaid, remaining, paymentStatus } =
      await computePaymentStatus(bookingId);

    res.json(
      BookingPaymentSummarySchema.parse({
        totalPrice,
        totalPaid,
        remaining,
        paymentStatus,
        payments,
        perPilgrim,
      }),
    );
  } catch (e) {
    console.error("[admin/payments GET /]", e);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

router.post("/", requireFinance, validate(AdminRecordPaymentRequest), async (req, res) => {
  try {
    const bookingId = (req.params as Record<string, string>).bookingId;
    const body = req.body as AdminRecordPaymentInput;
    const adminId = req.user?.id;

    const allocationError = await validatePaymentAllocations(bookingId, body.allocations, body.amount);
    if (allocationError) {
      res.status(400).json({ error: allocationError });
      return;
    }

    const paidAt = new Date(body.paidAt);
    if (Number.isNaN(paidAt.getTime())) {
      res.status(400).json({ error: "paidAt must be a valid date" });
      return;
    }

    const [booking] = await db
      .select({ id: bookings.id, totalPrice: bookings.totalPrice, branchId: bookings.branchId })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    const [paidRow] = await db
      .select({ total: sum(bookingPayments.amount) })
      .from(bookingPayments)
      .where(and(eq(bookingPayments.bookingId, bookingId), eq(bookingPayments.isVoided, false)));
    const totalPaidBefore = Number(paidRow?.total ?? 0);
    if (totalPaidBefore + body.amount > booking.totalPrice) {
      res.status(400).json({
        error: "Payment exceeds the remaining booking balance",
        remaining: Math.max(0, booking.totalPrice - totalPaidBefore),
      });
      return;
    }

    const created = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(bookingPayments)
        .values({
          id: crypto.randomUUID(),
          bookingId,
          branchId: booking.branchId ?? null,
          type: body.type,
          amount: body.amount,
          paidAt,
          method: body.method ?? null,
          referenceNumber: body.referenceNumber ?? null,
          notes: body.notes ?? null,
          proofUrl: body.proofUrl ?? null,
          recordedBy: adminId ?? null,
          isVoided: false,
          createdAt: new Date(),
        })
        .returning();

      if (body.allocations) {
        await tx.insert(bookingPaymentAllocations).values(
          body.allocations.map((allocation) => ({
            id: crypto.randomUUID(),
            paymentId: inserted.id,
            pilgrimId: allocation.pilgrimId,
            amount: allocation.amount,
            createdAt: new Date(),
          })),
        );
      }
      await journalPaymentVerified({
        bookingId,
        amount: body.amount,
        paymentId: inserted.id,
        adminId,
      }, tx);
      return inserted;
    });

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
  } catch (e) {
    console.error("[GET /:bookingId/payments/:paymentId]", e);
    res.status(500).json({ error: "Failed to fetch payment" });
  }
});

router.patch(
  "/:paymentId",
  requireFinance,
  validate(AdminUpdatePaymentRequest),
  async (req, res) => {
    try {
      const bookingId = (req.params as Record<string, string>).bookingId;
      const paymentId = req.params.paymentId as string;
      const updates = req.body as AdminUpdatePaymentInput;

      const [existingPayment] = await db
        .select({ id: bookingPayments.id, amount: bookingPayments.amount, isVoided: bookingPayments.isVoided })
        .from(bookingPayments)
        .where(and(eq(bookingPayments.id, paymentId), eq(bookingPayments.bookingId, bookingId)))
        .limit(1);
      if (!existingPayment) {
        res.status(404).json({ error: "Payment not found" });
        return;
      }
      if (!(await paymentBookingInScope(req, bookingId))) {
        res.status(403).json({ error: "Payment operation is outside your scope" });
        return;
      }
      if (existingPayment.isVoided) {
        res.status(409).json({ error: "Voided payment cannot be edited" });
        return;
      }
      if (updates.amount !== undefined && (!Number.isSafeInteger(updates.amount) || updates.amount <= 0)) {
        res.status(400).json({ error: "amount must be a positive integer" });
        return;
      }
      if (updates.allocations !== undefined) {
        const allocationError = await validatePaymentAllocations(
          bookingId,
          updates.allocations,
          updates.amount ?? existingPayment.amount,
        );
        if (allocationError) {
          res.status(400).json({ error: allocationError });
          return;
        }
      }
      const parsedPaidAt = updates.paidAt !== undefined ? new Date(updates.paidAt) : undefined;
      if (parsedPaidAt && Number.isNaN(parsedPaidAt.getTime())) {
        res.status(400).json({ error: "paidAt must be a valid date" });
        return;
      }
      if (updates.amount !== undefined || updates.paidAt !== undefined) {
        const [postedJournal] = await db
          .select({ id: financialTransactions.id })
          .from(financialTransactions)
          .where(eq(financialTransactions.referenceNumber, `auto:payment_verified:${paymentId}`))
          .limit(1);
        if (postedJournal) {
          res.status(409).json({ error: "Posted payment is immutable; use a reversal workflow" });
          return;
        }
      }

      const setValues: Record<string, unknown> = {};
      if (updates.type !== undefined) setValues.type = updates.type;
      if (updates.amount !== undefined) setValues.amount = updates.amount;
      if (parsedPaidAt !== undefined)
        setValues.paidAt = parsedPaidAt;
      if (updates.method !== undefined) setValues.method = updates.method;
      if (updates.referenceNumber !== undefined)
        setValues.referenceNumber = updates.referenceNumber;
      if (updates.notes !== undefined) setValues.notes = updates.notes;

            const updated = await db.transaction(async (tx) => {
        const [payment] = await tx
          .update(bookingPayments)
          .set(setValues)
          .where(
            and(
              eq(bookingPayments.id, paymentId),
              eq(bookingPayments.bookingId, bookingId),
            ),
          )
          .returning();
        if (updates.allocations !== undefined) {
          await tx.delete(bookingPaymentAllocations).where(eq(bookingPaymentAllocations.paymentId, paymentId));
          if (updates.allocations.length > 0) {
            await tx.insert(bookingPaymentAllocations).values(
              updates.allocations.map((allocation) => ({
                id: crypto.randomUUID(),
                paymentId,
                pilgrimId: allocation.pilgrimId,
                amount: allocation.amount,
                createdAt: new Date(),
              })),
            );
          }
        }
        return payment;
      });
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
    } catch (e) { console.error("[route error]", e);
      res.status(500).json({ error: "Failed to update payment" });
    }
  },
);

router.delete("/:paymentId", requireFinance, async (req, res) => {
  try {
    const bookingId = (req.params as Record<string, string>).bookingId;
    const paymentId = req.params.paymentId as string;
    if (!(await paymentBookingInScope(req, bookingId))) {
      return res.status(403).json({ error: "Payment operation is outside your scope" });
    }

    const [postedJournal] = await db
      .select({ id: financialTransactions.id })
      .from(financialTransactions)
      .where(eq(financialTransactions.referenceNumber, `auto:payment_verified:${paymentId}`))
      .limit(1);
    if (postedJournal) {
      return res.status(409).json({ error: "Posted payment cannot be voided without a reversal workflow" });
    }

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
  } catch (e) { console.error("[route error]", e);
    res.status(500).json({ error: "Failed to void payment" });
  }
});

export default router;
