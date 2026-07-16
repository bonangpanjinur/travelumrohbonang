import { Router } from "express";
import { db, sql } from "@workspace/db";

const router = Router();

type RangeConfig = { start: Date; end: Date; prevStart: Date; prevEnd: Date; useMonthly: boolean };

interface TrendRow { key: string; bookings: number | string; revenue: number | string }
interface PackageRevenueRow { name: string; bookings: number | string; revenue: number | string }
interface StatusCountRow { status: string; count: number | string }
interface DepartureRow {
  id: string;
  package_title: string | null;
  departure_date: string;
  quota: number | string;
  remaining_quota: number | string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function getRange(period: string): RangeConfig {
  const now = new Date();
  switch (period) {
    case "7days":
      return { start: new Date(now.getTime() - 7 * DAY_MS), end: now, prevStart: new Date(now.getTime() - 14 * DAY_MS), prevEnd: new Date(now.getTime() - 7 * DAY_MS), useMonthly: false };
    case "3months":
    case "6months":
    case "1year": {
      const months = period === "3months" ? 3 : period === "6months" ? 6 : 12;
      const start = new Date(now); start.setMonth(start.getMonth() - months);
      const prevStart = new Date(now); prevStart.setMonth(prevStart.getMonth() - months * 2);
      return { start, end: now, prevStart, prevEnd: start, useMonthly: true };
    }
    case "30days":
    default:
      return { start: new Date(now.getTime() - 30 * DAY_MS), end: now, prevStart: new Date(now.getTime() - 60 * DAY_MS), prevEnd: new Date(now.getTime() - 30 * DAY_MS), useMonthly: false };
  }
}

/**
 * GET /api/admin/analytics/summary?period=7days|30days|3months|6months|1year
 *
 * Replaces what used to be ~6 sequential client-side supabase-js calls
 * (per-row JS aggregation, N+1-ish and slow on large tables) with a
 * handful of server-side SQL aggregate queries. The frontend only formats
 * labels/colors for display now.
 */
router.get("/summary", async (req, res) => {
  try {
    const period = String(req.query.period ?? "30days");
    const { start, end, prevStart, prevEnd, useMonthly } = getRange(period);

    const [kpiRows, trendRows, packageRevenueRows, paymentStatusRows, bookingStatusRows, departureRows] = await Promise.all([
      db.execute(sql`
        with curr_bookings as (
          select id from bookings where created_at between ${start} and ${end} and status is distinct from 'cancelled'
        ),
        prev_bookings as (
          select id from bookings where created_at between ${prevStart} and ${prevEnd} and status is distinct from 'cancelled'
        )
        select
          (select count(*)::int from curr_bookings) as curr_bookings,
          (select count(*)::int from prev_bookings) as prev_bookings,
          (select coalesce(sum(amount),0)::bigint from payments where status = 'verified' and booking_id in (select id from curr_bookings)) as curr_revenue,
          (select coalesce(sum(amount),0)::bigint from payments where status = 'verified' and booking_id in (select id from prev_bookings)) as prev_revenue,
          (select count(*)::int from booking_pilgrims where booking_id in (select id from curr_bookings)) as curr_pilgrims,
          (select count(*)::int from booking_pilgrims where booking_id in (select id from prev_bookings)) as prev_pilgrims
      `),

      useMonthly
        ? db.execute(sql`
            select
              to_char(d.bucket, 'YYYY-MM') as key,
              coalesce(b.cnt, 0)::int as bookings,
              coalesce(p.rev, 0)::bigint as revenue
            from generate_series(date_trunc('month', ${start}::timestamptz), date_trunc('month', ${end}::timestamptz), interval '1 month') as d(bucket)
            left join (
              select date_trunc('month', created_at) as bucket, count(*) as cnt
              from bookings
              where created_at between ${start} and ${end} and status is distinct from 'cancelled'
              group by 1
            ) b on b.bucket = d.bucket
            left join (
              select date_trunc('month', coalesce(paid_at, created_at)) as bucket, sum(amount) as rev
              from payments
              where status = 'verified' and created_at between ${start} and ${end}
              group by 1
            ) p on p.bucket = d.bucket
            order by d.bucket
          `)
        : db.execute(sql`
            select
              to_char(d.bucket, 'YYYY-MM-DD') as key,
              coalesce(b.cnt, 0)::int as bookings,
              coalesce(p.rev, 0)::bigint as revenue
            from generate_series(date_trunc('day', ${start}::timestamptz), date_trunc('day', ${end}::timestamptz), interval '1 day') as d(bucket)
            left join (
              select date_trunc('day', created_at) as bucket, count(*) as cnt
              from bookings
              where created_at between ${start} and ${end} and status is distinct from 'cancelled'
              group by 1
            ) b on b.bucket = d.bucket
            left join (
              select date_trunc('day', coalesce(paid_at, created_at)) as bucket, sum(amount) as rev
              from payments
              where status = 'verified' and created_at between ${start} and ${end}
              group by 1
            ) p on p.bucket = d.bucket
            order by d.bucket
          `),

      db.execute(sql`
        select
          coalesce(pk.title, 'Tanpa Paket') as name,
          count(distinct b.id)::int as bookings,
          coalesce(sum(pay.amount), 0)::bigint as revenue
        from bookings b
        left join packages pk on pk.id = b.package_id
        left join payments pay on pay.booking_id = b.id and pay.status = 'verified'
        where b.created_at between ${start} and ${end} and b.status is distinct from 'cancelled'
        group by coalesce(pk.title, 'Tanpa Paket')
        order by revenue desc
        limit 8
      `),

      db.execute(sql`
        select status, count(*)::int as count
        from payments
        where created_at between ${start} and ${end} and status is not null
        group by status
      `),

      db.execute(sql`
        select status, count(*)::int as count
        from bookings
        where created_at between ${start} and ${end} and status is not null
        group by status
      `),

      db.execute(sql`
        select pd.id, pk.title as package_title, pd.departure_date, pd.quota, pd.remaining_quota
        from package_departures pd
        left join packages pk on pk.id = pd.package_id
        where pd.departure_date >= current_date
        order by pd.departure_date asc
        limit 8
      `),
    ]);

    const kpi = (kpiRows.rows[0] ?? {}) as Record<string, number>;
    const currBookings = Number(kpi.curr_bookings ?? 0);
    const prevBookings = Number(kpi.prev_bookings ?? 0);
    const currRevenue = Number(kpi.curr_revenue ?? 0);
    const prevRevenue = Number(kpi.prev_revenue ?? 0);

    res.json({
      kpis: {
        bookings: currBookings,
        prevBookings,
        revenue: currRevenue,
        prevRevenue,
        pilgrims: Number(kpi.curr_pilgrims ?? 0),
        prevPilgrims: Number(kpi.prev_pilgrims ?? 0),
        avgValue: currBookings > 0 ? currRevenue / currBookings : 0,
        prevAvgValue: prevBookings > 0 ? prevRevenue / prevBookings : 0,
      },
      trend: (trendRows.rows as unknown as TrendRow[]).map((r) => ({
        key: r.key,
        bookings: Number(r.bookings ?? 0),
        revenue: Number(r.revenue ?? 0),
      })),
      packageRevenue: (packageRevenueRows.rows as unknown as PackageRevenueRow[]).map((r) => ({
        name: r.name,
        bookings: Number(r.bookings ?? 0),
        revenue: Number(r.revenue ?? 0),
      })),
      paymentStatus: (paymentStatusRows.rows as unknown as StatusCountRow[]).map((r) => ({
        status: r.status,
        count: Number(r.count ?? 0),
      })),
      bookingStatus: (bookingStatusRows.rows as unknown as StatusCountRow[]).map((r) => ({
        status: r.status,
        count: Number(r.count ?? 0),
      })),
      departures: (departureRows.rows as unknown as DepartureRow[]).map((r) => ({
        id: r.id,
        package_title: r.package_title ?? "–",
        departure_date: r.departure_date,
        quota: Number(r.quota ?? 0),
        booked: Number(r.quota ?? 0) - Number(r.remaining_quota ?? 0),
      })),
    });
  } catch (err) {
    console.error("[analytics/summary]", err);
    res.status(500).json({ error: "Failed to load analytics summary" });
  }
});

/**
 * GET /api/admin/analytics/dashboard-stats
 *
 * All dashboard KPI counts in a single round-trip so the admin Dashboard
 * page no longer needs 8 parallel supabase-js count queries (which relied on
 * the shim's HEAD-request handling).
 */
router.get("/dashboard-stats", async (req, res) => {
  try {
    const [countsRow, revenueRow, trendRows] = await Promise.all([
      db.execute(sql`
        select
          (select count(*)::int from bookings)                                           as total_bookings,
          (select count(*)::int from bookings where status = 'waiting_payment')          as pending_payments,
          (select count(*)::int from agents where is_active = true)                      as total_agents,
          (select count(*)::int from packages where is_active = true)                    as active_packages,
          (select count(*)::int from booking_pilgrims)                                   as total_pilgrims,
          (select count(*)::int from branches where is_active = true)                    as total_branches,
          (select count(*)::int from muthawifs)                                          as total_muthawifs
      `),
      db.execute(sql`
        select coalesce(sum(total_price), 0)::bigint as total_revenue
        from bookings
        where status = 'paid'
      `),
      db.execute(sql`
        select
          to_char(d.month, 'Mon YY') as month,
          coalesce(b.cnt, 0)::int    as count
        from generate_series(
          date_trunc('month', now()) - interval '5 months',
          date_trunc('month', now()),
          interval '1 month'
        ) as d(month)
        left join (
          select date_trunc('month', created_at) as m, count(*) as cnt
          from bookings
          group by 1
        ) b on b.m = d.month
        order by d.month
      `),
    ]);

    const c = (countsRow.rows[0] ?? {}) as Record<string, number>;
    const r = (revenueRow.rows[0] ?? {}) as Record<string, number>;

    res.json({
      totalBookings: Number(c.total_bookings ?? 0),
      pendingPayments: Number(c.pending_payments ?? 0),
      totalAgents: Number(c.total_agents ?? 0),
      activePackages: Number(c.active_packages ?? 0),
      totalPilgrims: Number(c.total_pilgrims ?? 0),
      totalBranches: Number(c.total_branches ?? 0),
      totalMuthawifs: Number(c.total_muthawifs ?? 0),
      totalRevenue: Number(r.total_revenue ?? 0),
      monthlyTrend: (trendRows.rows as { month: string; count: number }[]).map((row) => ({
        month: row.month,
        count: Number(row.count ?? 0),
      })),
    });
  } catch (err) {
    console.error("[analytics/dashboard-stats]", err);
    res.status(500).json({ error: "Failed to load dashboard stats" });
  }
});

export default router;
