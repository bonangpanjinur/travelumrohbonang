import app from "./app";
import { logger } from "./lib/logger";
import { validateRequiredEnv, logEnvStatus } from "./lib/envValidation";
import { logStartupBanner } from "./lib/startupLogger";

// ── Step 1: Validate required env vars — fail fast before anything else ───────
// If SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are missing the process exits
// here with a clear error message. This prevents silent 500s on the first request.
validateRequiredEnv();

// ── Step 2: Log env var status (AVAILABLE / MISSING, never actual values) ─────
logEnvStatus();

// ── Step 3: Validate PORT ─────────────────────────────────────────────────────
const rawPort = process.env["PORT"];

if (!rawPort) {
  console.error("ERROR: PORT environment variable is required but was not provided.");
  process.exit(1);
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  console.error(`ERROR: Invalid PORT value: "${rawPort}"`);
  process.exit(1);
}

// ── Step 4: Start server + print startup banner with routes ───────────────────
app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  // logStartupBanner checks Supabase connectivity and prints all registered routes
  await logStartupBanner(app, port);

  logger.info({ port }, "Server listening");
});
