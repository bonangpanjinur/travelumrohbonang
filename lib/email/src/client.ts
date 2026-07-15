import { Resend } from "resend";

/**
 * Singleton Resend client.
 *
 * Returns `null` (instead of throwing) when RESEND_API_KEY is not configured
 * so callers can degrade gracefully (log + skip) instead of crashing the
 * request that triggered the email — sending email must never be able to
 * break a booking/payment flow.
 */
let cachedClient: Resend | null | undefined;

export function getResendClient(): Resend | null {
  if (cachedClient !== undefined) return cachedClient;

  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = new Resend(apiKey);
  return cachedClient;
}

export function getEmailFrom(): string {
  const address = process.env["EMAIL_FROM"] || "onboarding@resend.dev";
  const name = process.env["EMAIL_FROM_NAME"] || "UmrohPlus";
  return `${name} <${address}>`;
}

/** Whether the email system is actually configured and able to send. */
export function isEmailConfigured(): boolean {
  return getResendClient() !== null;
}
