import app from "./app";
import { logger } from "./lib/logger";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "./lib/supabaseEnv";

// Startup diagnostics — booleans only, never the actual secret values.
// This is the first thing to check in Vercel logs when endpoints 500:
// if SUPABASE_URL/SERVICE_ROLE are false, every Supabase-backed route will fail.
console.log({
  DATABASE_URL: !!process.env.DATABASE_URL,
  SUPABASE_URL: !!SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
  ALLOWED_ORIGINS: !!process.env.ALLOWED_ORIGINS,
  NODE_ENV: process.env.NODE_ENV,
  VERCEL: process.env.VERCEL === "1",
});

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
