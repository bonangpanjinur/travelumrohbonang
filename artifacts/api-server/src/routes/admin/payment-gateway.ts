/**
 * P1-2: Payment Gateway integration — Midtrans + Xendit.
 *
 * Replaces the supabase.functions.invoke("payment-gateway") call in the
 * frontend PaymentGateway.tsx page. All calls go through this Express route.
 *
 * Credentials are read from environment variables:
 *   MIDTRANS_SERVER_KEY      — Midtrans server key (sandbox: SB-Mid-server-…)
 *   MIDTRANS_IS_PRODUCTION   — "true" for production, anything else = sandbox
 *   XENDIT_API_KEY           — Xendit secret API key (starts with xnd_production_ or xnd_development_)
 *
 * If credentials are absent the endpoint returns 503 with a clear message.
 * No fallback to site_settings — secrets must be in env, not DB.
 */
import { Router } from "express";
import { db, paymentGatewayTransactions, bookings, eq, desc } from "@workspace/db";
import { syncFromGatewayTransaction } from "../../lib/paymentSync";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function midtransBase() {
  const isProd = process.env["MIDTRANS_IS_PRODUCTION"] === "true";
  return isProd
    ? "https://api.midtrans.com/v2"
    : "https://api.sandbox.midtrans.com/v2";
}

function midtransHeaders() {
  const key = process.env["MIDTRANS_SERVER_KEY"];
  if (!key) return null;
  return {
    Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function xenditHeaders() {
  const key = process.env["XENDIT_API_KEY"];
  if (!key) return null;
  return {
    Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
    "Content-Type": "application/json",
  };
}

// ── GET /transactions ─────────────────────────────────────────────────────────

router.get("/transactions", async (_req, res) => {
  try {
    const data = await db
      .select({
        id: paymentGatewayTransactions.id,
        bookingId: paymentGatewayTransactions.bookingId,
        gateway: paymentGatewayTransactions.gateway,
        orderId: paymentGatewayTransactions.orderId,
        gatewayTransactionId: paymentGatewayTransactions.gatewayTransactionId,
        amount: paymentGatewayTransactions.amount,
        paymentMethod: paymentGatewayTransactions.paymentMethod,
        bankCode: paymentGatewayTransactions.bankCode,
        vaNumber: paymentGatewayTransactions.vaNumber,
        status: paymentGatewayTransactions.status,
        customerName: paymentGatewayTransactions.customerName,
        customerEmail: paymentGatewayTransactions.customerEmail,
        expiryTime: paymentGatewayTransactions.expiryTime,
        paidAt: paymentGatewayTransactions.paidAt,
        createdAt: paymentGatewayTransactions.createdAt,
        bookingCode: bookings.bookingCode,
      })
      .from(paymentGatewayTransactions)
      .leftJoin(bookings, eq(paymentGatewayTransactions.bookingId, bookings.id))
      .orderBy(desc(paymentGatewayTransactions.createdAt));
    res.json(data);
  } catch (err) {
    console.error("[payment-gateway] list:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// ── POST /transactions — create a new payment ─────────────────────────────────

router.post("/transactions", async (req, res) => {
  const {
    gateway,
    bookingId,
    amount,
    bankCode,
    paymentMethod,
    customerName,
    customerEmail,
    orderId,
  } = req.body as {
    gateway: "midtrans" | "xendit";
    bookingId?: string;
    amount: number;
    bankCode?: string;
    paymentMethod?: string;
    customerName?: string;
    customerEmail?: string;
    orderId?: string;
  };

  const finalOrderId = orderId ?? `TRX-${Date.now()}`;

  try {
    let vaNumber: string | undefined;
    let gatewayTransactionId: string | undefined;
    let expiryTime: Date | undefined;
    let rawResponse: string | undefined;

    // ── Midtrans ───────────────────────────────────────────────────────────────
    if (gateway === "midtrans") {
      const headers = midtransHeaders();
      if (!headers) {
        return res.status(503).json({ error: "MIDTRANS_SERVER_KEY not configured" });
      }
      const isQris = paymentMethod === "qris";
      const body = isQris
        ? {
            payment_type: "qris",
            transaction_details: { order_id: finalOrderId, gross_amount: amount },
            customer_details: { first_name: customerName, email: customerEmail },
          }
        : {
            payment_type: "bank_transfer",
            bank_transfer: { bank: bankCode?.toLowerCase() ?? "bca" },
            transaction_details: { order_id: finalOrderId, gross_amount: amount },
            customer_details: { first_name: customerName, email: customerEmail },
          };

      const resp = await fetch(`${midtransBase()}/charge`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
      const data = (await resp.json()) as Record<string, unknown>;
      rawResponse = JSON.stringify(data);

      if (!resp.ok || (data["status_code"] && Number(data["status_code"]) >= 400)) {
        return res.status(502).json({ error: (data["status_message"] as string) ?? "Midtrans error" });
      }

      gatewayTransactionId = data["transaction_id"] as string | undefined;
      const vaArr = data["va_numbers"] as Array<{ bank: string; va_number: string }> | undefined;
      vaNumber = vaArr?.[0]?.va_number ?? (data["qr_string"] as string | undefined);
      if (data["expiry_time"]) {
        expiryTime = new Date(data["expiry_time"] as string);
      }

    // ── Xendit ─────────────────────────────────────────────────────────────────
    } else if (gateway === "xendit") {
      const headers = xenditHeaders();
      if (!headers) {
        return res.status(503).json({ error: "XENDIT_API_KEY not configured" });
      }
      const resp = await fetch("https://api.xendit.co/callback_virtual_accounts", {
        method: "POST",
        headers,
        body: JSON.stringify({
          external_id: finalOrderId,
          bank_code: bankCode ?? "BCA",
          name: customerName ?? "Customer",
          expected_amount: amount,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const data = (await resp.json()) as Record<string, unknown>;
      rawResponse = JSON.stringify(data);

      if (!resp.ok) {
        return res.status(502).json({ error: (data["message"] as string) ?? "Xendit error" });
      }

      gatewayTransactionId = data["id"] as string | undefined;
      vaNumber = data["account_number"] as string | undefined;
      if (data["expiration_date"]) {
        expiryTime = new Date(data["expiration_date"] as string);
      }

    } else {
      return res.status(400).json({ error: "Unsupported gateway. Use midtrans or xendit." });
    }

    // Persist transaction
    const id = crypto.randomUUID();
    const [saved] = await db
      .insert(paymentGatewayTransactions)
      .values({
        id,
        bookingId: bookingId ?? null,
        gateway,
        orderId: finalOrderId,
        gatewayTransactionId: gatewayTransactionId ?? null,
        amount,
        paymentMethod: paymentMethod ?? null,
        bankCode: bankCode ?? null,
        vaNumber: vaNumber ?? null,
        status: "pending",
        customerName: customerName ?? null,
        customerEmail: customerEmail ?? null,
        expiryTime: expiryTime ?? null,
        rawResponse: rawResponse ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    res.json(saved);
  } catch (err: any) {
    console.error("[payment-gateway] create:", err);
    res.status(500).json({ error: err?.message ?? "Internal error" });
  }
});

// ── POST /transactions/:id/check — poll gateway for latest status ─────────────

router.post("/transactions/:id/check", async (req, res) => {
  try {
    const [tx] = await db
      .select()
      .from(paymentGatewayTransactions)
      .where(eq(paymentGatewayTransactions.id, req.params.id))
      .limit(1);
    if (!tx) return res.status(404).json({ error: "Transaction not found" });

    let status = tx.status;

    if (tx.gateway === "midtrans") {
      const headers = midtransHeaders();
      if (!headers) return res.status(503).json({ error: "MIDTRANS_SERVER_KEY not configured" });
      const resp = await fetch(`${midtransBase()}/${tx.orderId}/status`, {
        headers,
        signal: AbortSignal.timeout(10_000),
      });
      if (resp.ok) {
        const data = (await resp.json()) as Record<string, unknown>;
        const txStatus = data["transaction_status"] as string | undefined;
        if (txStatus === "settlement" || txStatus === "capture") status = "paid";
        else if (txStatus === "expire") status = "expired";
        else if (txStatus === "cancel" || txStatus === "deny") status = "cancelled";
      }
    } else if (tx.gateway === "xendit") {
      const headers = xenditHeaders();
      if (!headers) return res.status(503).json({ error: "XENDIT_API_KEY not configured" });
      const resp = await fetch(`https://api.xendit.co/callback_virtual_accounts/${tx.gatewayTransactionId}`, {
        headers,
        signal: AbortSignal.timeout(10_000),
      });
      if (resp.ok) {
        const data = (await resp.json()) as Record<string, unknown>;
        if (data["status"] === "ACTIVE") status = "pending";
        else if (data["status"] === "INACTIVE") status = "expired";
      }
    }

    const [updated] = await db
      .update(paymentGatewayTransactions)
      .set({ status, updatedAt: new Date(), ...(status === "paid" ? { paidAt: new Date() } : {}) })
      .where(eq(paymentGatewayTransactions.id, req.params.id))
      .returning();

    // K-03 FIX: sync booking + ledger when manual check resolves to "paid".
    // Previously this was missing, causing bookings to stay "pending" even after payment.
    if (status === "paid" && updated?.bookingId) {
      try {
        await syncFromGatewayTransaction({
          bookingId: updated.bookingId,
          amount: Math.round(Number(updated.amount ?? 0)),
          gateway: updated.gateway ?? "unknown",
          orderId: updated.orderId ?? updated.id,
          newStatus: "paid",
        });
      } catch (syncErr) {
        // Log but don't fail the response — the status is already saved.
        console.error("[payment-gateway] check sync error:", syncErr);
      }
    }

    res.json(updated);
  } catch (err: any) {
    console.error("[payment-gateway] check:", err);
    res.status(500).json({ error: err?.message ?? "Internal error" });
  }
});

// NOTE: Webhook endpoints (Midtrans/Xendit server-to-server callbacks) are
// intentionally NOT in this file. They live in
// src/routes/payment-gateway-webhooks.ts and are mounted WITHOUT auth at
// /api/payments/webhook/* in routes/index.ts.

export default router;
