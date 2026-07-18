/**
 * Vercel serverless function entry point.
 *
 * Exports the Express app WITHOUT calling app.listen() — Vercel wraps it as
 * a serverless handler automatically.
 *
 * ⚠️  Cron jobs (installment/document reminders, follow-up scheduler) do NOT
 *     run in serverless. Set up Vercel Cron jobs (vercel.json "crons") or an
 *     external scheduler (e.g. Supabase pg_cron) to replace them.
 */

// Log env status + Supabase key diagnostics on every cold start so Vercel
// Function Logs immediately show what is configured (presence only, no values).
import { logEnvStatus } from "./lib/envValidation";
import { logSupabaseKeyDiagnostics } from "./lib/startupLogger";

logEnvStatus();
logSupabaseKeyDiagnostics();

export { default } from "./app";
