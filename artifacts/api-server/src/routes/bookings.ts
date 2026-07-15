import { Router } from "express";
import {
  db,
  bookings,
  packages,
  packageDepartures,
  bookingRooms,
  bookingPilgrims,
  payments,
  paymentProofAccessLogs,
  paymentGatewayTransactions,
  installmentSchedules,
  refundRequests,
  eq,
  and,
  desc,
  asc,
} from "@workspace/db";
import { emailNotifications } from "../lib/notifications/emailNotifications";
import { waNotifications } from "../lib/notifications/waNotifications";
import { redeemLoyaltyPointsForBooking } from "../lib/loyalty";
import {
  generateInstallmentSchedule,
  requiresInstallmentSchedule,
  syncOverdueStatus,
} from "../lib/installments";
import { generateBookingConfirmationPdf } from "../lib/pdf/bookingConfirmation";
import { branches } from "@workspace/db";
import {
  BookingListResponse,
  BookingWithDetailsSchema,
  BookingSchema,
  CreateBookingRequest,
  CreateBookingRoomsRequest,
  CreateBookingPilgrimsRequest,
  BookingRoomSchema,
  BookingPilgrimSchema,
  type CreateBookingInput,
  type BookingRoom,
  type BookingPilgrim,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validate";

const router = Router();

router.use(requireAuth);

function generateBookingCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const random = Array.from(
    { length: 8 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
  return `BNG-${random}`;
}

router.get("/", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const userId = req.user.id;

    const data = await db
      .select({
        id: bookings.id,
        bookingCode: bookings.bookingCode,
        userId: bookings.userId,
        packageId: bookings.packageId,
        departureId: bookings.departureId,
        branchId: bookings.branchId,
        status: bookings.status,
        totalPrice: bookings.totalPrice,
        currency: bookings.currency,
        paymentScheme: bookings.paymentScheme,
        notes: bookings.notes,
        createdAt: bookings.createdAt,
        packageTitle: packages.title,
        packageSlug: packages.slug,
        departureDate: packageDepartures.departureDate,
      })
      .from(bookings)
      .leftJoin(packages, eq(bookings.packageId, packages.id))
      .leftJoin(
        packageDepartures,
        eq(bookings.departureId, packageDepartures.id),
      )
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));

    res.json(BookingListResponse.parse({ data, total: data.length }));
  } catch {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// --- Refunds (must be before /:id to avoid /:id swallowing "refunds" as an id) ---

router.get("/refunds", async (req, res) => {
  try {
    const userId = req.user!.id;
    const data = await db
      .select({
        id: refundRequests.id,
        userId: refundRequests.userId,
        bookingId: refundRequests.bookingId,
        reason: refundRequests.reason,
        amount: refundRequests.amount,
        bankName: refundRequests.bankName,
        bankAccount: refundRequests.bankAccount,
        accountHolder: refundRequests.accountHolder,
        status: refundRequests.status,
        adminNotes: refundRequests.adminNotes,
        createdAt: refundRequests.createdAt,
        bookingCode: bookings.bookingCode,
      })
      .from(refundRequests)
      .leftJoin(bookings, eq(refundRequests.bookingId, bookings.id))
      .where(eq(refundRequests.userId, userId))
      .orderBy(desc(refundRequests.createdAt));

    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to fetch refunds" });
  }
});

router.post("/refunds", async (req, res) => {
  try {
    const userId = req.user!.id;
    const {
      bookingId,
      reason,
      amount,
      bankName,
      bankAccount,
      accountHolder,
    } = req.body;

    const [created] = await db
      .insert(refundRequests)
      .values({
        id: crypto.randomUUID(),
        userId,
        bookingId,
        reason,
        amount,
        bankName,
        bankAccount,
        accountHolder,
        status: "pending",
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json(created);
  } catch {
    res.status(500).json({ error: "Failed to create refund request" });
  }
});

// --- Single booking (after static sub-routes) ---

router.get("/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const id = req.params.id as string;

    const [row] = await db
      .select({
        id: bookings.id,
        bookingCode: bookings.bookingCode,
        userId: bookings.userId,
        packageId: bookings.packageId,
        departureId: bookings.departureId,
        branchId: bookings.branchId,
        status: bookings.status,
        totalPrice: bookings.totalPrice,
        currency: bookings.currency,
        paymentScheme: bookings.paymentScheme,
        notes: bookings.notes,
        createdAt: bookings.createdAt,
        packageTitle: packages.title,
        packageSlug: packages.slug,
        departureDate: packageDepartures.departureDate,
        returnDate: packageDepartures.returnDate,
        minimumDp: packages.minimumDp,
        dpDeadlineDays: packages.dpDeadlineDays,
        fullDeadlineDays: packages.fullDeadlineDays,
      })
      .from(bookings)
      .leftJoin(packages, eq(bookings.packageId, packages.id))
      .leftJoin(
        packageDepartures,
        eq(bookings.departureId, packageDepartures.id),
      )
      .where(and(eq(bookings.id, id), eq(bookings.userId, req.user.id)))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    const rooms = await db
      .select()
      .from(bookingRooms)
      .where(eq(bookingRooms.bookingId, id));

    const pilgrims = await db
      .select()
      .from(bookingPilgrims)
      .where(eq(bookingPilgrims.bookingId, id));

    res.json({
      ...BookingWithDetailsSchema.parse(row),
      rooms,
      pilgrims,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

// --- PDF confirmation (F-06) — must come before generic /:id ---

router.get("/:id/confirmation.pdf", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const id = req.params.id as string;

    const [row] = await db
      .select({
        bookingCode: bookings.bookingCode,
        status: bookings.status,
        totalPrice: bookings.totalPrice,
        currency: bookings.currency,
        paymentScheme: bookings.paymentScheme,
        createdAt: bookings.createdAt,
        packageTitle: packages.title,
        departureDate: packageDepartures.departureDate,
        returnDate: packageDepartures.returnDate,
        branchName: branches.name,
      })
      .from(bookings)
      .leftJoin(packages, eq(bookings.packageId, packages.id))
      .leftJoin(packageDepartures, eq(bookings.departureId, packageDepartures.id))
      .leftJoin(branches, eq(bookings.branchId, branches.id))
      .where(and(eq(bookings.id, id), eq(bookings.userId, req.user.id)))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    const rooms = await db.select().from(bookingRooms).where(eq(bookingRooms.bookingId, id));
    const pilgrims = await db.select().from(bookingPilgrims).where(eq(bookingPilgrims.bookingId, id));

    const pdfBuffer = await generateBookingConfirmationPdf({
      ...row,
      rooms: rooms.map((r) => ({ roomType: r.roomType, quantity: r.quantity, subtotal: r.subtotal })),
      pilgrims: pilgrims.map((p) => ({ name: p.name, gender: p.gender, nik: p.nik })),
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="konfirmasi-${row.bookingCode}.pdf"`,
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.error("[bookings] Failed to generate confirmation PDF:", err);
    res.status(500).json({ error: "Failed to generate confirmation PDF" });
  }
});

router.post("/", validate(CreateBookingRequest), async (req, res) => {
  try {
    const {
      packageId,
      departureId,
      totalPrice,
      currency,
      paymentScheme,
      notes,
      picType,
      picId,
      agentId,
      redeemPoints,
    } = req.body as CreateBookingInput;

    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const userId = req.user.id;
    const bookingCode = generateBookingCode();
    const bookingId = crypto.randomUUID();

    // Optional loyalty point redemption — discount applied before insert.
    let finalPrice = totalPrice;
    if (redeemPoints) {
      try {
        const { discount } = await redeemLoyaltyPointsForBooking(
          userId,
          redeemPoints,
          bookingId,
        );
        finalPrice = Math.max(0, totalPrice - discount);
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : "Gagal menukar poin",
        });
        return;
      }
    }

    const [created] = await db
      .insert(bookings)
      .values({
        id: bookingId,
        bookingCode,
        userId,
        packageId,
        departureId,
        totalPrice: finalPrice,
        currency,
        paymentScheme: paymentScheme ?? null,
        notes: notes ?? null,
        status: "draft",
        picType: picType ?? null,
        picId: picId ?? null,
        agentId: agentId ?? null,
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json(BookingSchema.parse(created));

    // Fire-and-forget: never let email/WA failure affect the booking response.
    void emailNotifications.bookingCreated(created.id);
    void waNotifications.bookingCreated(created.id);
    // F-05: auto-generate installment schedule for dp/cicilan bookings
    if (requiresInstallmentSchedule(paymentScheme)) {
      void generateInstallmentSchedule(created.id, packageId);
    }
  } catch {
    res.status(500).json({ error: "Failed to create booking" });
  }
});

router.post(
  "/:id/rooms",
  validate(CreateBookingRoomsRequest),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      if (!req.isAuthenticated()) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const userId = req.user.id;

      const [booking] = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(eq(bookings.id, id), eq(bookings.userId, userId)))
        .limit(1);

      if (!booking) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }

      const { rooms } = req.body as { rooms: BookingRoom[] };

      const rows = rooms.map((r) => ({
        id: crypto.randomUUID(),
        bookingId: id,
        roomType: r.roomType,
        price: String(r.price),
        quantity: r.quantity,
        subtotal: String(r.subtotal),
        createdAt: new Date(),
      }));

      const created = await db.insert(bookingRooms).values(rows).returning();

      res
        .status(201)
        .json({ data: created.map((r) => BookingRoomSchema.parse(r)) });
    } catch {
      res.status(500).json({ error: "Failed to create booking rooms" });
    }
  },
);

router.post(
  "/:id/pilgrims",
  validate(CreateBookingPilgrimsRequest),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      if (!req.isAuthenticated()) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const userId = req.user.id;

      const [booking] = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(eq(bookings.id, id), eq(bookings.userId, userId)))
        .limit(1);

      if (!booking) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }

      const { pilgrims } = req.body as { pilgrims: BookingPilgrim[] };

      const rows = pilgrims.map((p) => ({
        id: crypto.randomUUID(),
        bookingId: id,
        name: p.name,
        phone: p.phone ?? null,
        email: p.email ?? null,
        gender: p.gender,
        nik: p.nik ?? null,
        createdAt: new Date(),
      }));

      const created = await db.insert(bookingPilgrims).values(rows).returning();

      res
        .status(201)
        .json({ data: created.map((p) => BookingPilgrimSchema.parse(p)) });
    } catch {
      res.status(500).json({ error: "Failed to create booking pilgrims" });
    }
  },
);

// --- Payments ---

router.get("/:id/payments", async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user!.id;

    // Verify ownership before fetching any data
    const [booking] = await db
      .select({ userId: bookings.userId })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking || booking.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const data = await db
      .select()
      .from(payments)
      .where(and(eq(payments.bookingId, id)))
      .orderBy(desc(payments.createdAt));

    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

router.post("/:id/payments", async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user!.id;
    const { amount, paymentMethod, paymentType, proofUrl } = req.body;

    const [booking] = await db
      .select({ userId: bookings.userId })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking || booking.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [created] = await db
      .insert(payments)
      .values({
        id: crypto.randomUUID(),
        bookingId: id,
        amount,
        paymentMethod,
        paymentType,
        proofUrl,
        status: "pending",
        createdAt: new Date(),
      })
      .returning();

    await db
      .update(bookings)
      .set({ status: "waiting_payment" })
      .where(eq(bookings.id, id));

    res.status(201).json(created);
  } catch {
    res.status(500).json({ error: "Failed to create payment" });
  }
});

router.post("/payments/proof-access-log", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookingId, paymentId, context } = req.body;

    await db.insert(paymentProofAccessLogs).values({
      id: crypto.randomUUID(),
      userId,
      bookingId,
      paymentId,
      context,
      createdAt: new Date(),
    });

    res.status(204).end();
  } catch {
    res.status(500).json({ error: "Failed to log access" });
  }
});

// ── F-05: Installment Schedule Endpoints ─────────────────────────────────────

/**
 * GET /api/bookings/:id/installments
 * Returns the installment schedule for a booking (owner only).
 * Lazily updates overdue status before responding.
 */
router.get("/:id/installments", async (req, res) => {
  try {
    const bookingId = req.params.id as string;
    const userId = req.user!.id;

    // Verify ownership
    const [booking] = await db
      .select({ userId: bookings.userId })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking || booking.userId !== userId) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    // Lazily sync overdue status before returning
    await syncOverdueStatus(bookingId);

    const rows = await db
      .select()
      .from(installmentSchedules)
      .where(eq(installmentSchedules.bookingId, bookingId))
      .orderBy(asc(installmentSchedules.installmentNumber));

    res.json(rows);
  } catch (err) {
    console.error("[bookings] GET installments:", err);
    res.status(500).json({ error: "Failed to fetch installment schedule" });
  }
});

/**
 * POST /api/bookings/:id/installments/:n/pay
 * Create a payment gateway transaction (VA/QRIS) for installment n.
 * Body: { gateway, bankCode?, paymentMethod?, customerName, customerEmail }
 */
router.post("/:id/installments/:n/pay", async (req, res) => {
  try {
    const bookingId = req.params.id as string;
    const installmentNumber = parseInt(req.params.n as string, 10);
    const userId = req.user!.id;

    if (Number.isNaN(installmentNumber)) {
      res.status(400).json({ error: "Invalid installment number" });
      return;
    }

    // Verify ownership
    const [booking] = await db
      .select({ userId: bookings.userId, bookingCode: bookings.bookingCode })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking || booking.userId !== userId) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    // Fetch the specific installment
    const [installment] = await db
      .select()
      .from(installmentSchedules)
      .where(
        and(
          eq(installmentSchedules.bookingId, bookingId),
          eq(installmentSchedules.installmentNumber, installmentNumber),
        ),
      )
      .limit(1);

    if (!installment) {
      res.status(404).json({ error: "Installment not found" });
      return;
    }

    if (installment.status === "paid") {
      res.status(409).json({ error: "Installment already paid" });
      return;
    }

    const {
      gateway = "midtrans",
      bankCode,
      paymentMethod = "bank_transfer",
      customerName,
      customerEmail,
    } = req.body as {
      gateway?: "midtrans" | "xendit";
      bankCode?: string;
      paymentMethod?: string;
      customerName?: string;
      customerEmail?: string;
    };

    const label =
      installmentNumber === 0 ? "DP" : `Cicilan-${installmentNumber}`;
    const orderId = `INST-${installment.id}-${Date.now()}`;

    // Call the existing payment gateway logic (same as admin/payment-gateway.ts)
    let vaNumber: string | undefined;
    let gatewayTransactionId: string | undefined;
    let expiryTime: Date | undefined;
    let rawResponse: string | undefined;

    if (gateway === "midtrans") {
      const serverKey = process.env["MIDTRANS_SERVER_KEY"];
      if (!serverKey) {
        res.status(503).json({ error: "Payment gateway not configured" });
        return;
      }
      const isProd = process.env["MIDTRANS_IS_PRODUCTION"] === "true";
      const base = isProd
        ? "https://api.midtrans.com/v2"
        : "https://api.sandbox.midtrans.com/v2";
      const headers = {
        Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      const body = {
        payment_type: "bank_transfer",
        transaction_details: { order_id: orderId, gross_amount: installment.amount },
        bank_transfer: { bank: (bankCode ?? "bca").toLowerCase() },
        customer_details: { first_name: customerName, email: customerEmail },
        custom_field1: `installment:${installment.id}`,
      };
      const resp = await fetch(`${base}/charge`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
      const data = (await resp.json()) as Record<string, unknown>;
      rawResponse = JSON.stringify(data);
      if (!resp.ok) {
        res.status(502).json({ error: "Midtrans error", detail: data });
        return;
      }
      const vaInfo = (data["va_numbers"] as Array<{ bank: string; va_number: string }> | undefined)?.[0];
      vaNumber = vaInfo?.va_number;
      gatewayTransactionId = data["transaction_id"] as string | undefined;
      const expStr = data["expiry_time"] as string | undefined;
      if (expStr) expiryTime = new Date(expStr);
    } else {
      // Xendit
      const apiKey = process.env["XENDIT_API_KEY"];
      if (!apiKey) {
        res.status(503).json({ error: "Payment gateway not configured" });
        return;
      }
      const headers = {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
      };
      const body = {
        external_id: orderId,
        bank_code: bankCode ?? "BCA",
        name: customerName ?? "Jamaah UmrohPlus",
        expected_amount: installment.amount,
      };
      const resp = await fetch("https://api.xendit.co/callback_virtual_accounts", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
      const data = (await resp.json()) as Record<string, unknown>;
      rawResponse = JSON.stringify(data);
      if (!resp.ok) {
        res.status(502).json({ error: "Xendit error", detail: data });
        return;
      }
      vaNumber = data["account_number"] as string | undefined;
      gatewayTransactionId = data["id"] as string | undefined;
    }

    // Record in payment_gateway_transactions, linking to the installment
    const [tx] = await db
      .insert(paymentGatewayTransactions)
      .values({
        id: crypto.randomUUID(),
        bookingId,
        gateway,
        orderId,
        gatewayTransactionId: gatewayTransactionId ?? null,
        amount: installment.amount,
        paymentMethod,
        bankCode: bankCode ?? null,
        vaNumber: vaNumber ?? null,
        status: "pending",
        customerName: customerName ?? null,
        customerEmail: customerEmail ?? null,
        expiryTime: expiryTime ?? null,
        rawResponse: rawResponse ?? null,
        installmentScheduleId: installment.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json({
      gateway,
      orderId,
      vaNumber,
      bankCode,
      paymentMethod,
      expiryTime: tx.expiryTime,
      amount: installment.amount,
      installmentNumber,
      label,
    });
  } catch (err) {
    console.error("[bookings] POST installments/:n/pay:", err);
    res.status(500).json({ error: "Failed to create installment payment" });
  }
});

export default router;
