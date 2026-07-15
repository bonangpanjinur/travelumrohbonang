/**
 * Fonnte WhatsApp REST client configuration.
 *
 * Returns null when env vars are absent — callers degrade gracefully
 * instead of crashing. WhatsApp delivery must never break a booking/payment flow.
 *
 * Env vars required:
 *   FONNTE_API_TOKEN   — API token from fonnte.com dashboard
 *   WA_SENDER_NUMBER  — Sender number (format: 628xxxxxxxxx)
 */

export function getFonnteToken(): string | null {
  return process.env["FONNTE_API_TOKEN"] ?? null;
}

export function getSenderNumber(): string | null {
  return process.env["WA_SENDER_NUMBER"] ?? null;
}

/** Whether the WhatsApp system is configured and able to send. */
export function isWhatsAppConfigured(): boolean {
  return !!(getFonnteToken() && getSenderNumber());
}
