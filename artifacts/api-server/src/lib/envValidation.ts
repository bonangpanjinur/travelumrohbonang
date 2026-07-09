/**
 * Environment variable validation.
 *
 * Call validateRequiredEnv() once at process startup — BEFORE the server
 * starts listening. If a required variable is missing the process exits
 * immediately with a clear error so no request ever hits a half-configured
 * server.
 *
 * logEnvStatus() prints a human-readable AVAILABLE / MISSING checklist to
 * stdout (never the actual values).
 */

interface EnvSpec {
  key: string;
  required: boolean;
  description: string;
}

const ENV_SPEC: EnvSpec[] = [
  { key: "NODE_ENV",                  required: false, description: "Runtime mode" },
  { key: "PORT",                      required: true,  description: "HTTP listen port" },
  { key: "SUPABASE_URL",              required: true,  description: "Supabase project URL" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", required: true,  description: "Supabase service role key (server-only)" },
  { key: "SUPABASE_ANON_KEY",         required: false, description: "Supabase anon key (also accepts VITE_SUPABASE_ANON_KEY)" },
  { key: "VITE_SUPABASE_URL",         required: false, description: "Vite-prefixed Supabase URL (fallback)" },
  { key: "VITE_SUPABASE_ANON_KEY",    required: false, description: "Vite-prefixed anon key (fallback)" },
  { key: "DATABASE_URL",              required: false, description: "Direct Postgres URL (dev/Replit)" },
  { key: "ALLOWED_ORIGINS",           required: false, description: "Comma-separated CORS allowlist (prod)" },
  { key: "ADMIN_EMAILS",              required: false, description: "Comma-separated super-admin email list" },
  { key: "SESSION_SECRET",            required: false, description: "Session signing secret" },
  { key: "LOG_LEVEL",                 required: false, description: "Pino log level" },
  { key: "MIDTRANS_SERVER_KEY",       required: false, description: "Midtrans payment gateway key" },
  { key: "XENDIT_API_KEY",            required: false, description: "Xendit payment gateway key" },
  { key: "XENDIT_WEBHOOK_TOKEN",      required: false, description: "Xendit webhook verification token" },
];

/** Resolve value for a key, handling VITE_ fallbacks. */
function resolveValue(key: string): string | undefined {
  const direct = process.env[key];
  if (direct) return direct;
  // Supabase VITE_ fallbacks (mirrors supabaseEnv.ts)
  if (key === "SUPABASE_URL") return process.env["VITE_SUPABASE_URL"];
  if (key === "SUPABASE_ANON_KEY") return process.env["VITE_SUPABASE_ANON_KEY"];
  return undefined;
}

/**
 * Validates that all required environment variables are present.
 * Exits the process with a clear error message if any are missing.
 */
export function validateRequiredEnv(): void {
  const missing = ENV_SPEC
    .filter((s) => s.required)
    .filter((s) => !resolveValue(s.key));

  if (missing.length > 0) {
    console.error("\n╔══════════════════════════════════════════════════════════╗");
    console.error("║          STARTUP ABORTED — MISSING ENVIRONMENT VARS       ║");
    console.error("╚══════════════════════════════════════════════════════════╝\n");
    for (const s of missing) {
      console.error(`  ✗ ${s.key} is MISSING — ${s.description}`);
    }
    console.error("\nFix the above variables in your environment and restart.\n");
    process.exit(1);
  }
}

/**
 * Logs a formatted AVAILABLE / MISSING status table for all known env vars.
 * Never prints actual values — only presence/absence.
 */
export function logEnvStatus(): void {
  console.log("\n── Environment Variables ─────────────────────────────────────");
  for (const s of ENV_SPEC) {
    const value = resolveValue(s.key);
    const status = value ? "✓ AVAILABLE" : "✗ MISSING  ";
    const req    = s.required ? "(required)" : "(optional)";
    console.log(`  ${status}  ${s.key.padEnd(28)} ${req}`);
  }
  console.log("──────────────────────────────────────────────────────────────\n");
}
