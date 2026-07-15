---
name: Payment gateway architecture
description: How the payment gateway (Midtrans/Xendit) is structured in the Express API
---

## Admin routes (auth-gated)
Mounted at `/api/admin/payment-gateway/*` behind `requireAdmin`:
- `GET /transactions` — list with bookings join
- `POST /transactions` — create VA/QRIS charge
- `POST /transactions/:id/check` — poll gateway for status update

## Webhook routes (PUBLIC — no auth)
`src/routes/payment-gateway-webhooks.ts` → mounted at `/api/payments/webhook/*`:
- `POST /midtrans` — Midtrans payment notification
- `POST /xendit` — Xendit VA paid callback

**Why separate:** Midtrans/Xendit call webhooks server-to-server with no JWT. Putting them behind requireAdmin causes permanent 401.

## Webhook security
- Midtrans: SHA512( orderId + statusCode + grossAmount + MIDTRANS_SERVER_KEY ) vs `req.body.signature_key`
- Xendit: `X-CALLBACK-TOKEN` header vs `XENDIT_WEBHOOK_TOKEN` env var
- When env var is absent (dev/sandbox): warns to console, allows through

## Credentials (env vars only — never in DB)
- `MIDTRANS_SERVER_KEY` — server key (sandbox: `SB-Mid-server-…`)
- `MIDTRANS_IS_PRODUCTION` — "true" for prod, else sandbox
- `XENDIT_API_KEY` — secret key
- `XENDIT_WEBHOOK_TOKEN` — callback token from Xendit dashboard

## DB table
`payment_gateway_transactions` in `lib/db/src/schema/payments.ts`
Fields: id, bookingId, gateway, orderId, gatewayTransactionId, amount, paymentMethod, bankCode, vaNumber, status, customerName, customerEmail, expiryTime, paidAt, rawResponse, createdAt, updatedAt
