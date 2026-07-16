/**
 * Cron job HTTP endpoints for Vercel Cron.
 * Each path in vercel.json "crons" calls one of these endpoints.
 * Protected by a secret header to prevent public access.
 */
import { Router } from "express";
import { sendDocumentReminders } from "../../lib/documentReminderCron";
import { sendFollowUpReminders } from "../../lib/followUpCron";
import { sendInstallmentReminders } from "../../lib/installmentReminderCron";

const router = Router();

/**
 * Vercel Cron calls include an Authorization: Bearer <CRON_SECRET> header
 * when CRON_SECRET env var is set. In development we skip the check.
 */
function verifyCronSecret(req: import("express").Request, res: import("express").Response): boolean {
  const cronSecret = process.env["CRON_SECRET"];
  if (!cronSecret) return true; // not configured → allow (dev/local)
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

router.get("/document-reminder", async (req, res) => {
  if (!verifyCronSecret(req, res)) return;
  try {
    await sendDocumentReminders();
    res.json({ ok: true, job: "document-reminder" });
  } catch (err) {
    console.error("[cron] document-reminder failed:", err);
    res.status(500).json({ error: "Cron job failed" });
  }
});

router.get("/follow-up", async (req, res) => {
  if (!verifyCronSecret(req, res)) return;
  try {
    await sendFollowUpReminders();
    res.json({ ok: true, job: "follow-up" });
  } catch (err) {
    console.error("[cron] follow-up failed:", err);
    res.status(500).json({ error: "Cron job failed" });
  }
});

router.get("/installment-reminder", async (req, res) => {
  if (!verifyCronSecret(req, res)) return;
  try {
    await sendInstallmentReminders();
    res.json({ ok: true, job: "installment-reminder" });
  } catch (err) {
    console.error("[cron] installment-reminder failed:", err);
    res.status(500).json({ error: "Cron job failed" });
  }
});

export default router;
