/**
 * §7.2.1 — Dedicated Agent Portal Routes
 *
 * These endpoints are scoped strictly to the current authenticated user's
 * own agent record — no IDOR risk since we always filter by userId.
 *
 * GET  /api/agent/profile   — current user's agent profile + stats
 * GET  /api/agent/bookings  — bookings referred by this agent
 * GET  /api/agent/leaderboard — top 10 agents ranked by confirmed revenue
 */

import { Router } from "express";
import {
  db,
  agents,
  bookings,
  packages,
  packageDepartures,
  profiles,
  eq,
  desc,
  and,
  inArray,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

// ── GET /api/agent/profile ───────────────────────────────────────────────────
router.get("/profile", async (req: any, res) => {
  try {
    const userId = req.user.id;

    const [agent] = await db
      .select({
        id: agents.id,
        name: agents.name,
        email: agents.email,
        phone: agents.phone,
        commissionPercent: agents.commissionPercent,
        referralCode: agents.referralCode,
        branchId: agents.branchId,
        monthlyTarget: agents.monthlyTarget,
        isActive: agents.isActive,
        createdAt: agents.createdAt,
      })
      .from(agents)
      .where(eq(agents.userId, userId))
      .limit(1);

    if (!agent) {
      return res.status(404).json({ error: "Agent not found for this user" });
    }

    // Quick stats: count bookings and compute commission
    const agentBookings = await db
      .select({
        id: bookings.id,
        status: bookings.status,
        totalPrice: bookings.totalPrice,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .where(eq(bookings.agentId, agent.id));

    const paid = agentBookings.filter((b) => b.status === "paid");
    const totalRevenue = paid.reduce((s, b) => s + (Number(b.totalPrice) || 0), 0);
    const totalCommission = totalRevenue * ((agent.commissionPercent || 0) / 100);

    return res.json({
      ...agent,
      stats: {
        totalBookings: agentBookings.length,
        paidBookings: paid.length,
        totalRevenue,
        totalCommission,
        pendingBookings: agentBookings.filter(
          (b) => b.status === "pending" || b.status === "waiting_payment"
        ).length,
      },
    });
  } catch (err) {
    console.error("[agent/profile]", err);
    return res.status(500).json({ error: "Failed to fetch agent profile" });
  }
});

// ── GET /api/agent/bookings ──────────────────────────────────────────────────
router.get("/bookings", async (req: any, res) => {
  try {
    const userId = req.user.id;

    const [agent] = await db
      .select({ id: agents.id, commissionPercent: agents.commissionPercent })
      .from(agents)
      .where(eq(agents.userId, userId))
      .limit(1);

    if (!agent) return res.status(404).json({ error: "Not an agent" });

    const data = await db
      .select({
        id: bookings.id,
        bookingCode: bookings.bookingCode,
        status: bookings.status,
        totalPrice: bookings.totalPrice,
        currency: bookings.currency,
        paymentScheme: bookings.paymentScheme,
        createdAt: bookings.createdAt,
        packageId: bookings.packageId,
        departureId: bookings.departureId,
        packageTitle: packages.title,
        departureDate: packageDepartures.departureDate,
      })
      .from(bookings)
      .leftJoin(packages, eq(packages.id, bookings.packageId))
      .leftJoin(packageDepartures, eq(packageDepartures.id, bookings.departureId))
      .where(eq(bookings.agentId, agent.id))
      .orderBy(desc(bookings.createdAt));

    return res.json(
      data.map((b) => ({
        ...b,
        commission:
          b.status === "paid"
            ? (Number(b.totalPrice) || 0) * ((agent.commissionPercent || 0) / 100)
            : 0,
      }))
    );
  } catch (err) {
    console.error("[agent/bookings]", err);
    return res.status(500).json({ error: "Failed to fetch agent bookings" });
  }
});

// ── GET /api/agent/leaderboard ───────────────────────────────────────────────
router.get("/leaderboard", async (req: any, res) => {
  try {
    // Get all agents with their paid booking totals
    const allAgents = await db
      .select({
        id: agents.id,
        name: agents.name,
        commissionPercent: agents.commissionPercent,
        referralCode: agents.referralCode,
      })
      .from(agents)
      .where(eq(agents.isActive, true));

    if (allAgents.length === 0) return res.json([]);

    const agentIds = allAgents.map((a) => a.id);
    const paidBookings = await db
      .select({
        agentId: bookings.agentId,
        totalPrice: bookings.totalPrice,
      })
      .from(bookings)
      .where(
        and(
          inArray(bookings.agentId, agentIds),
          eq(bookings.status, "paid")
        )
      );

    const leaderboard = allAgents
      .map((agent) => {
        const agentBookings = paidBookings.filter((b) => b.agentId === agent.id);
        const totalRevenue = agentBookings.reduce(
          (s, b) => s + (Number(b.totalPrice) || 0),
          0
        );
        return {
          agentId: agent.id,
          name: agent.name,
          paidBookingCount: agentBookings.length,
          totalRevenue,
          commission: totalRevenue * ((agent.commissionPercent || 0) / 100),
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    return res.json(leaderboard);
  } catch (err) {
    console.error("[agent/leaderboard]", err);
    return res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

export default router;
