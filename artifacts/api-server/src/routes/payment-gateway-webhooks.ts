/**
 * Public payment gateway webhook handlers.
 * MUST be mounted WITHOUT auth middleware — Midtrans/Xendit call these
 * server-to-server with no JWT token.
 *
 * Each handler verifies the request authenticity BEFORE touching the DB:
 *   Midtrans  — SHA512( orderId + statusCode + grossAmount + serverKey )
 *               compared against req.body.signature_key
 *   Xendit    — X-CALLBACK-TOKEN header compared against XENDIT_WEBHOOK_TOKEN
 *               env var (set in Xendit Dashboard → Settings → Callbacks)
 *
 * After verifying, both handlers:
 *   1. Update paymentGatewayTransactions status
 *   2. (if paid) Create bookingPayments record + sync bookings.status
 *   3. (if paid) Record financial_transactions entry
 *   4. (if paid) Insert in-app notification for the jamaah
 */
import { Router } from "express";
import { createHash } from "crypto";
import { db, paymentGatewayTransactions, eq } from "@workspace/db";
import { syncFromGatewayTransaction } from "../lib/paymentSync";
import { waNotifications } from "../lib/notifications/waNotifications";
import { markInstallmentPaid } from "../lib/installments";

const router = Router();

// ── Midtrans Notification ─────────────────────────────────────────────────────

router.post("/midtrans", async (req, res) => {
  const {
    order_id,
    transaction_status,
    status_code,
    gross_amount,
    signature_key: receivedSig,
  } = req.body as {
    order_id?: string;
    transaction_status?: string;
    status_code?: string;
    gross_amount?: string;
    signature_key?: string;
  };

  if (!order_id || !transaction_status) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // ── Signature verification ────────────────────────────────────────────────
  const serverKey = process.env["MIDTRANS_SERVER_KEY"];
  const isProduction = process.env["NODE_ENV"] === "production";
  if (serverKey) {
    if (!receivedSig || !status_code || !gross_amount) {
      return res.status(400).json({ error: "Missing signature fields" });
    }
    const expected = createHash("sha512")
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest("hex");
    if (receivedSig !== expected) {
      console.warn("[webhook/midtrans] Invalid signature for order", order_id);
      return res.status(401).json({ error: "Invalid signature" });
    }
  } else if (isProduction) {
    console.error("[webhook/midtrans] MIDTRANS_SERVER_KEY not set in production — rejecting request");
    return res.status(500).json({ error: "Webhook not configured" });
  } else {
    console.warn("[webhook/midtrans] MIDTRANS_SERVER_KEY not set — skipping signature check (dev mode)");
  }

  // ── Status mapping ─────────────────────────────────────────────────────────
  let newStatus = "pending";
  if (transaction_status === "settlement" || transaction_status === "capture") newStatus = "paid";
  else if (transaction_status === "expire") newStatus = "expired";
  else if (transaction_status === "cancel" || transaction_status === "deny") newStatus = "cancelled";

  try {
    // 1. Update gateway transaction record.
    const [updated] = await db
      .update(paymentGatewayTransactions)
      .set({
        status: newStatus,
        updatedAt: new Date(),
        ...(newStatus === "paid" ? { paidAt: new Date() } : {}),
      })
      .where(eq(paymentGatewayTransactions.orderId, order_id))
      .returning();

    // 2-4. Sync booking status + financials + notification (paid only).
    if (newStatus === "paid" && updated?.bookingId) {
      const amountInt = Math.round(parseFloat(gross_amount ?? "0"));
      await syncFromGatewayTransaction({
        bookingId: updated.bookingId,
        amount: amountInt,
        gateway: "midtrans",
        orderId: order_id,
        newStatus,
      });
      // F-04: WA notification on gateway-confirmed payment
      void waNotifications.paymentReceived(updated.bookingId, amountInt);
      // F-05: if this transaction was for a specific installment, mark it paid
      if (updated.installmentScheduleId) {
        void markInstallmentPaid(updated.installmentScheduleId, order_id);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[webhook/midtrans] DB error:", err);
    // Return 500 so Midtrans retries the notification later.
    res.status(500).json({ error: "DB error" });
  }
});

// ── Xendit Callback ───────────────────────────────────────────────────────────

router.post("/xendit", async (req, res) => {
  const callbackToken = process.env["XENDIT_WEBHOOK_TOKEN"];
  const receivedToken = req.headers["x-callback-token"] as string | undefined;
  const isProduction = process.env["NODE_ENV"] === "production";

  if (callbackToken) {
    if (receivedToken !== callbackToken) {
      console.warn("[webhook/xendit] Invalid callback token");
      return res.status(401).json({ error: "Invalid callback token" });
    }
  } else if (isProduction) {
    console.error("[webhook/xendit] XENDIT_WEBHOOK_TOKEN not set in production — rejecting request");
    return res.status(500).json({ error: "Webhook not configured" });
  } else {
    console.warn("[webhook/xendit] XENDIT_WEBHOOK_TOKEN not set — skipping token check (dev mode)");
  }

  const { external_id, status, amount } = req.body as {
    external_id?: string;
    status?: string;
    amount?: number;
  };

  if (!external_id) {
    return res.status(400).json({ error: "Missing external_id" });
  }

  const newStatus = status === "PAID" ? "paid" : status === "EXPIRED" ? "expired" : "pending";

  try {
    // 1. Update gateway transaction record.
    const [updated] = await db
      .update(paymentGatewayTransactions)
      .set({
        status: newStatus,
        updatedAt: new Date(),
        ...(newStatus === "paid" ? { paidAt: new Date() } : {}),
      })
      .where(eq(paymentGatewayTransactions.orderId, external_id))
      .returning();

    // 2-4. Sync booking status + financials + notification (paid only).
    if (newStatus === "paid" && updated?.bookingId) {
      const amountInt = Math.round(amount ?? updated.amount ?? 0);
      await syncFromGatewayTransaction({
        bookingId: updated.bookingId,
        amount: amountInt,
        gateway: "xendit",
        orderId: external_id,
        newStatus,
      });
      // F-04: WA notification on gateway-confirmed payment
      void waNotifications.paymentReceived(updated.bookingId, amountInt);
      // F-05: mark specific installment as paid if this was an installment payment
      if (updated.installmentScheduleId) {
        void markInstallmentPaid(updated.installmentScheduleId, external_id);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[webhook/xendit] DB error:", err);
    // Return 500 so Xendit retries the callback later.
    res.status(500).json({ error: "DB error" });
  }
});

export default router;
