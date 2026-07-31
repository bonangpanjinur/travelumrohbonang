import { Router } from "express";
import { db, sql } from "@workspace/db";
import { sendAdminError } from "../../lib/adminApiError";
import { resolveUserScope } from "../../lib/scopeGuard";

/**
 * GET /api/admin/analytics/my-stats
 *
 * Personal performance dashboard for the logged-in agent.
 * Returns booking counts, total value, commission earned, and
 * 5 most recent bookings scoped to this agent only.
 *
 * Gate: requireOperational (accessible by role='agent')
 */
const router = Router();

router.get("/", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);

    if (scope.type !== "agent" || !scope.agentId) {
      res.status(403).json({ error: "Endpoint ini hanya untuk akun agen." });
      return;
    }

    const agentId = scope.agentId;

    const [countsRow, commissionRow, recentRows] = await Promise.all([
      // Booking counts & total value
      db.execute(sql`
        select
          count(*)::int                                                             as total_bookings,
          count(*) filter (where b.status not in ('cancelled', 'completed'))::int  as active_bookings,
          count(*) filter (where b.status = 'completed')::int                      as completed_bookings,
          count(*) filter (where b.status = 'cancelled')::int                      as cancelled_bookings,
          coalesce(sum(b.total_price), 0)::bigint                                  as total_value
        from bookings b
        where b.agent_id = ${agentId}
           or (b.pic_type = 'agen' and b.pic_id = ${agentId})
      `),

      // Commission sum (approved + paid)
      db.execute(sql`
        select coalesce(sum(ac.amount), 0)::bigint as total_commission
        from agent_commissions ac
        where ac.agent_id = ${agentId}
          and ac.status in ('approved', 'paid')
      `),

      // 5 most-recent bookings
      db.execute(sql`
        select
          b.id,
          b.booking_code   as "bookingCode",
          b.status,
          b.total_price    as "totalPrice",
          b.created_at     as "createdAt",
          p.title          as "packageTitle"
        from bookings b
        left join packages p on p.id = b.package_id
        where b.agent_id = ${agentId}
           or (b.pic_type = 'agen' and b.pic_id = ${agentId})
        order by b.created_at desc
        limit 5
      `),
    ]);

    const c = countsRow.rows[0] as {
      total_bookings: number;
      active_bookings: number;
      completed_bookings: number;
      cancelled_bookings: number;
      total_value: string | number;
    };

    const comm = commissionRow.rows[0] as { total_commission: string | number };

    const recent = (recentRows.rows as {
      id: string;
      bookingCode: string;
      status: string;
      totalPrice: string | number;
      createdAt: string;
      packageTitle: string | null;
    }[]).map((r) => ({
      id: r.id,
      bookingCode: r.bookingCode,
      status: r.status,
      totalPrice: Number(r.totalPrice ?? 0),
      createdAt: r.createdAt,
      packageTitle: r.packageTitle ?? null,
    }));

    res.json({
      totalBookings:      Number(c.total_bookings ?? 0),
      activeBookings:     Number(c.active_bookings ?? 0),
      completedBookings:  Number(c.completed_bookings ?? 0),
      cancelledBookings:  Number(c.cancelled_bookings ?? 0),
      totalValue:         Number(c.total_value ?? 0),
      totalCommission:    Number(comm.total_commission ?? 0),
      recentBookings:     recent,
    });
  } catch (err) {
    sendAdminError(res, "GET /api/admin/analytics/my-stats", err);
  }
});

export default router;
