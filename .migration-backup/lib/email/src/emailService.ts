import { getResendClient, getEmailFrom, isEmailConfigured } from "./client";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  sent: boolean;
  /** Present when sent=false — reason it did not send (never throws). */
  reason?: string;
}

const MAX_ATTEMPTS = 2;

/**
 * Sends a single transactional email via Resend.
 *
 * Design decision: this NEVER throws. Email is a side effect of business
 * events (booking created, payment verified, ...) and must never be able to
 * fail the request that triggered it. Failures are logged and returned as
 * `{ sent: false, reason }` so callers can decide whether to surface a
 * warning, but the primary flow (booking/payment) always completes.
 *
 * Retries once on transient failure (at-least-once best effort); Resend
 * itself is not called if RESEND_API_KEY is missing — this is treated as
 * "email disabled" rather than an error, which keeps local/dev environments
 * usable without the key configured.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    console.warn(`[email] RESEND_API_KEY not set — skipping email to ${input.to} (${input.subject})`);
    return { sent: false, reason: "not_configured" };
  }

  const client = getResendClient();
  if (!client) return { sent: false, reason: "not_configured" };

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { error } = await client.emails.send({
        from: getEmailFrom(),
        to: input.to,
        subject: input.subject,
        html: input.html,
      });
      if (error) throw error;
      return { sent: true };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }

  console.error(`[email] Failed to send "${input.subject}" to ${input.to} after ${MAX_ATTEMPTS} attempts:`, lastError);
  return { sent: false, reason: "send_failed" };
}
