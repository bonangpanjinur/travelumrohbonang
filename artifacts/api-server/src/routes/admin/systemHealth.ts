import { Router, type RequestHandler } from "express";
import { db, bookings, pool, sql } from "@workspace/db";
import { getRequestMetrics } from "../../lib/requestMetrics";

const router = Router();

const ACTIVE_BOOKING_STATUSES = ["pending", "submitted", "verified", "confirmed"];

const systemHealth: RequestHandler = async (_req, res) => {
  const dbStart = Date.now();
  let dbStatus: "ok" | "error" = "error";
  let dbLatencyMs: number | null = null;
  let dbError: string | null = null;

  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      dbLatencyMs = Date.now() - dbStart;
      dbStatus = "ok";
    } finally {
      client.release();
    }
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Unknown database error";
  }

  let totalBookings = 0;
  let activeBookings = 0;

  if (dbStatus === "ok") {
    try {
      const [totalRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookings);
      totalBookings = totalRow?.count ?? 0;

      const [activeRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookings)
        .where(sql`${bookings.status} = ANY(${ACTIVE_BOOKING_STATUSES})`);
      activeBookings = activeRow?.count ?? 0;
    } catch (err) {
      dbError = dbError ?? (err instanceof Error ? err.message : "Failed to query bookings");
    }
  }

  const metrics = getRequestMetrics();
  const overallStatus = dbStatus === "ok" ? "ok" : "degraded";

  res.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      ...(dbError ? { error: dbError } : {}),
    },
    auth: {
      provider: "replit-auth",
    },
    bookings: {
      total: totalBookings,
      active: activeBookings,
    },
    api: metrics,
  });
};

router.get("/", systemHealth);

export default router;
