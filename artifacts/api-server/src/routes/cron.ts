import { Router, type RequestHandler } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { SUPABASE_URL, SUPABASE_SERVER_KEY } from "../lib/supabaseEnv";

const router = Router();

async function checkDatabase(): Promise<{
  status: "ok" | "error";
  latencyMs: number | null;
  error?: string;
}> {
  const start = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      return { status: "ok", latencyMs: Date.now() - start };
    } finally {
      client.release();
    }
  } catch (err) {
    return {
      status: "error",
      latencyMs: null,
      error: err instanceof Error ? err.message : "Unknown database error",
    };
  }
}

async function checkSupabase(): Promise<{
  status: "ok" | "error" | "not_configured";
  latencyMs: number | null;
  error?: string;
}> {
  const supabaseUrl = SUPABASE_URL || undefined;
  const supabaseKey = SUPABASE_SERVER_KEY || undefined;

  if (!supabaseUrl || !supabaseKey) {
    return {
      status: "not_configured",
      latencyMs: null,
      error: "SUPABASE_URL and/or SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY are not set",
    };
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.status >= 500) {
      return {
        status: "error",
        latencyMs: Date.now() - start,
        error: `Supabase responded with HTTP ${res.status}`,
      };
    }

    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: "error",
      latencyMs: null,
      error: err instanceof Error ? err.message : "Unknown Supabase connectivity error",
    };
  }
}

type ServiceResult = Awaited<ReturnType<typeof checkDatabase>> | Awaited<ReturnType<typeof checkSupabase>>;

async function sendAlert(overallStatus: "ok" | "degraded", services: Record<string, ServiceResult>) {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) {
    logger.warn(
      "[cron/health-check] Status is degraded but ALERT_WEBHOOK_URL is not set — skipping alert",
    );
    return;
  }

  const failing = Object.entries(services)
    .filter(([, result]) => result.status === "error")
    .map(([name, result]) => `• *${name}*: ${result.error ?? "unknown error"}`)
    .join("\n");

  const text = [
    `🚨 UmrohPlus health check is *${overallStatus.toUpperCase()}*`,
    failing || "One or more services reported an issue.",
    `Time: ${new Date().toISOString()}`,
  ].join("\n");

  try {
    // Compatible with Slack and Discord incoming webhooks, both of which
    // accept a JSON body with a top-level "text" field.
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, content: text }),
    });
  } catch (err) {
    logger.error(
      { err },
      "[cron/health-check] Failed to send alert webhook",
    );
  }
}

const healthCheckCron: RequestHandler = async (req: any, res: any) => {
  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` automatically
  // when CRON_SECRET is set as an env var on the project. Reject any other
  // caller so this endpoint can't be used to spam the alert webhook.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  const [database, supabase] = await Promise.all([checkDatabase(), checkSupabase()]);
  const services = { database, supabase };

  const overallStatus: "ok" | "degraded" =
    database.status === "ok" && supabase.status !== "error" ? "ok" : "degraded";

  if (overallStatus === "degraded") {
    await sendAlert(overallStatus, services);
    logger.error({ services }, "[cron/health-check] Health check degraded");
  } else {
    logger.info({ services }, "[cron/health-check] Health check ok");
  }

  res.status(200).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services,
  });
};

router.get("/cron/health-check", healthCheckCron);

export default router;
