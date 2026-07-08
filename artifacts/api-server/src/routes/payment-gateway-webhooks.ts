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
 * If the env vars are absent the endpoints still accept the webhooks
 * (development/sandbox mode) but log a warning.
 */
import { Router } from "express";
import { createHash } from "crypto";
import { db, paymentGatewayTransactions, eq } from "@workspace/db";

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
  } else {
    console.warn("[webhook/midtrans] MIDTRANS_SERVER_KEY not set — skipping signature check (dev mode)");
  }

  // ── Status mapping ─────────────────────────────────────────────────────────
  let newStatus = "pending";
  if (transaction_status === "settlement" || transaction_status === "capture") newStatus = "paid";
  else if (transaction_status === "expire") newStatus = "expired";
  else if (transaction_status === "cancel" || transaction_status === "deny") newStatus = "cancelled";

  try {
    await db
      .update(paymentGatewayTransactions)
      .set({
        status: newStatus,
        updatedAt: new Date(),
        ...(newStatus === "paid" ? { paidAt: new Date() } : {}),
      })
      .where(eq(paymentGatewayTransactions.orderId, order_id));

    res.json({ ok: true });
  } catch (err) {
    console.error("[webhook/midtrans] DB error:", err);
    // Return 200 anyway — Midtrans will retry on non-2xx
    res.json({ ok: false, error: "DB error" });
  }
});

// ── Xendit Callback ───────────────────────────────────────────────────────────

router.post("/xendit", async (req, res) => {
  const callbackToken = process.env["XENDIT_WEBHOOK_TOKEN"];
  const receivedToken = req.headers["x-callback-token"] as string | undefined;

  if (callbackToken) {
    if (receivedToken !== callbackToken) {
      console.warn("[webhook/xendit] Invalid callback token");
      return res.status(401).json({ error: "Invalid callback token" });
    }
  } else {
    console.warn("[webhook/xendit] XENDIT_WEBHOOK_TOKEN not set — skipping token check (dev mode)");
  }

  const { external_id, status } = req.body as {
    external_id?: string;
    status?: string;
  };

  if (!external_id) {
    return res.status(400).json({ error: "Missing external_id" });
  }

  const newStatus = status === "PAID" ? "paid" : status === "EXPIRED" ? "expired" : "pending";

  try {
    await db
      .update(paymentGatewayTransactions)
      .set({
        status: newStatus,
        updatedAt: new Date(),
        ...(newStatus === "paid" ? { paidAt: new Date() } : {}),
      })
      .where(eq(paymentGatewayTransactions.orderId, external_id));

    res.json({ ok: true });
  } catch (err) {
    console.error("[webhook/xendit] DB error:", err);
    res.json({ ok: false, error: "DB error" });
  }
});

export default router;
