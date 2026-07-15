import { getFonnteToken, getSenderNumber, isWhatsAppConfigured } from "./client";

export interface SendWAInput {
  /** Recipient phone number — will be normalized automatically. */
  to: string;
  message: string;
}

export interface SendWAResult {
  sent: boolean;
  /** Present when sent=false. */
  reason?: string;
}

const MAX_ATTEMPTS = 2;

/**
 * Sends a single WhatsApp message via Fonnte REST API.
 *
 * Design: NEVER throws. WA is a side-effect of business events and must
 * never break the primary booking/payment flow if Fonnte is down or
 * misconfigured. Failures are logged and returned as { sent: false }.
 *
 * Retries once on transient failure (at-least-once best-effort).
 */
export async function sendWhatsApp(input: SendWAInput): Promise<SendWAResult> {
  if (!isWhatsAppConfigured()) {
    console.warn(`[whatsapp] Not configured — skipping WA to ${input.to}`);
    return { sent: false, reason: "not_configured" };
  }

  const phone = normalizePhone(input.to);
  if (!phone) {
    console.warn(`[whatsapp] Invalid phone number "${input.to}" — skipping`);
    return { sent: false, reason: "invalid_phone" };
  }

  const token = getFonnteToken()!;
  const sender = getSenderNumber()!;

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: phone,
          message: input.message,
          sender,
          // delay in seconds between messages (only relevant for bulk sends)
          delay: "1",
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "(unreadable)");
        throw new Error(`Fonnte ${response.status}: ${body}`);
      }

      const json = (await response.json()) as { status: boolean; detail?: string };
      if (!json.status) {
        throw new Error(`Fonnte rejected: ${json.detail ?? "unknown reason"}`);
      }

      return { sent: true };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }

  console.error(
    `[whatsapp] Failed to send to ${phone} after ${MAX_ATTEMPTS} attempts:`,
    lastError,
  );
  return { sent: false, reason: "send_failed" };
}

/**
 * Normalises a phone number to the Fonnte format (digits only, Indonesian
 * country code). Returns null if the number is clearly invalid.
 *
 * Examples:
 *   "08123456789"   → "628123456789"
 *   "+628123456789" → "628123456789"
 *   "628123456789"  → "628123456789"
 */
export function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  let n = phone.replace(/[\s\-\(\)\.]/g, "");
  if (n.startsWith("+")) n = n.slice(1);
  if (n.startsWith("0")) n = "62" + n.slice(1);
  // Must be 10–15 digits after normalisation
  if (!/^\d{10,15}$/.test(n)) return null;
  return n;
}
