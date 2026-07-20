/**
 * Admin Finance Routes
 * GET /api/admin/finance/dashboard  — aggregated financial summary
 * GET /api/admin/finance/piutang    — AR list: bookings with outstanding balance
 */
import { Router, Request, Response } from "express";
import { db, sql } from "@workspace/db";

const router = Router();

function sendError(res: Response, label: string, err: unknown) {
  console.error(`[${label}]`, err);
  res.status(500).json({ error: "Terjadi kesalahan server" });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const [
      monthIncomeResult,
      totalPiutangResult,
      paidBookingsResult,
      monthlyCashflowResult,
      upcomingDeparturesResult,
      agingResult,
      paymentTypeBreakdownResult,
    ] = await Promise.all([
      // Total pemasukan bulan ini
      db.execute(sql`
        SELECT COALESCE(SUM(amount), 0) AS month_income
        FROM booking_payments
        WHERE is_voided = false
          AND EXTRACT(MONTH FROM paid_at) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR  FROM paid_at) = EXTRACT(YEAR  FROM NOW())
      `),

      // Total piutang aktif (belum lunas)
      db.execute(sql`
        SELECT COALESCE(SUM(b.total_price - COALESCE(paid.total_paid, 0)), 0) AS total_piutang,
               COUNT(*) AS booking_count
        FROM bookings b
        LEFT JOIN (
          SELECT booking_id, SUM(amount) AS total_paid
          FROM booking_payments WHERE is_voided = false
          GROUP BY booking_id
        ) paid ON paid.booking_id = b.id
        WHERE b.status NOT IN ('cancelled', 'draft')
          AND COALESCE(paid.total_paid, 0) < b.total_price
      `),

      // Booking sudah lunas (paid/confirmed/completed)
      db.execute(sql`
        SELECT COUNT(*) AS lunas_count
        FROM bookings b
        LEFT JOIN (
          SELECT booking_id, SUM(amount) AS total_paid
          FROM booking_payments WHERE is_voided = false
          GROUP BY booking_id
        ) paid ON paid.booking_id = b.id
        WHERE b.status NOT IN ('cancelled', 'draft')
          AND COALESCE(paid.total_paid, 0) >= b.total_price
      `),

      // Arus kas bulanan — 12 bulan terakhir
      db.execute(sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', paid_at), 'YYYY-MM') AS month,
          SUM(CASE WHEN type IN ('dp','down_payment') THEN amount ELSE 0 END) AS dp,
          SUM(CASE WHEN type = 'installment'          THEN amount ELSE 0 END) AS cicilan,
          SUM(CASE WHEN type IN ('full','balance','pelunasan') THEN amount ELSE 0 END) AS pelunasan,
          SUM(amount) AS total
        FROM booking_payments
        WHERE is_voided = false
          AND paid_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', paid_at)
        ORDER BY DATE_TRUNC('month', paid_at) ASC
      `),

      // Keberangkatan mendatang 90 hari — financial summary
      db.execute(sql`
        SELECT
          dep.id,
          dep.departure_date,
          pkg.title AS package_title,
          COUNT(DISTINCT b.id)                                          AS booking_count,
          COALESCE(SUM(b.total_price), 0)                              AS target_revenue,
          COALESCE(SUM(paid.total_paid), 0)                            AS collected,
          COALESCE(SUM(b.total_price), 0) - COALESCE(SUM(paid.total_paid), 0) AS outstanding,
          COUNT(DISTINCT CASE WHEN COALESCE(paid.total_paid, 0) < b.total_price THEN b.id END) AS belum_lunas_count
        FROM package_departures dep
        JOIN packages pkg ON pkg.id = dep.package_id
        JOIN bookings b ON b.departure_id = dep.id AND b.status NOT IN ('cancelled', 'draft')
        LEFT JOIN (
          SELECT booking_id, SUM(amount) AS total_paid
          FROM booking_payments WHERE is_voided = false
          GROUP BY booking_id
        ) paid ON paid.booking_id = b.id
        WHERE dep.departure_date::timestamp BETWEEN NOW() AND NOW() + INTERVAL '90 days'
        GROUP BY dep.id, dep.departure_date, pkg.title
        ORDER BY dep.departure_date::timestamp ASC
      `),

      // Aging buckets — berapa booking per bucket hari-ke-keberangkatan
      db.execute(sql`
        SELECT
          CASE
            WHEN dep.departure_date::timestamp < NOW() THEN 'overdue'
            WHEN dep.departure_date::timestamp <= NOW() + INTERVAL '14 days'  THEN 'kritis'
            WHEN dep.departure_date::timestamp <= NOW() + INTERVAL '30 days'  THEN 'mendesak'
            WHEN dep.departure_date::timestamp <= NOW() + INTERVAL '60 days'  THEN 'perhatian'
            ELSE 'normal'
          END AS bucket,
          COUNT(DISTINCT b.id) AS count,
          COALESCE(SUM(b.total_price - COALESCE(paid.total_paid, 0)), 0) AS total_outstanding
        FROM bookings b
        JOIN package_departures dep ON dep.id = b.departure_id
        LEFT JOIN (
          SELECT booking_id, SUM(amount) AS total_paid
          FROM booking_payments WHERE is_voided = false
          GROUP BY booking_id
        ) paid ON paid.booking_id = b.id
        WHERE b.status NOT IN ('cancelled', 'draft')
          AND COALESCE(paid.total_paid, 0) < b.total_price
        GROUP BY bucket
      `),

      // Breakdown tipe pembayaran bulan ini
      db.execute(sql`
        SELECT type, SUM(amount) AS total
        FROM booking_payments
        WHERE is_voided = false
          AND EXTRACT(MONTH FROM paid_at) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR  FROM paid_at) = EXTRACT(YEAR  FROM NOW())
        GROUP BY type
      `),
    ]);

    const getRows = (r: any) => (r as any).rows ?? r;

    const monthIncome  = Number(getRows(monthIncomeResult)[0]?.month_income ?? 0);
    const piutangRow   = getRows(totalPiutangResult)[0] ?? {};
    const lunasRow     = getRows(paidBookingsResult)[0] ?? {};

    res.json({
      summary: {
        monthIncome,
        totalPiutang:   Number(piutangRow.total_piutang ?? 0),
        piutangCount:   Number(piutangRow.booking_count ?? 0),
        lunasCount:     Number(lunasRow.lunas_count ?? 0),
      },
      cashflow: getRows(monthlyCashflowResult).map((r: any) => ({
        month:     r.month,
        dp:        Number(r.dp),
        cicilan:   Number(r.cicilan),
        pelunasan: Number(r.pelunasan),
        total:     Number(r.total),
      })),
      upcomingDepartures: getRows(upcomingDeparturesResult).map((r: any) => ({
        id:             r.id,
        departureDate:  r.departure_date,
        packageTitle:   r.package_title,
        bookingCount:   Number(r.booking_count),
        targetRevenue:  Number(r.target_revenue),
        collected:      Number(r.collected),
        outstanding:    Number(r.outstanding),
        belumLunasCount: Number(r.belum_lunas_count),
        pctCollected:   r.target_revenue > 0
          ? Math.round((Number(r.collected) / Number(r.target_revenue)) * 100)
          : 0,
      })),
      aging: getRows(agingResult).map((r: any) => ({
        bucket:      r.bucket,
        count:       Number(r.count),
        outstanding: Number(r.total_outstanding),
      })),
      paymentTypeBreakdown: getRows(paymentTypeBreakdownResult).map((r: any) => ({
        type:  r.type,
        total: Number(r.total),
      })),
    });
  } catch (e) {
    sendError(res, "GET /admin/finance/dashboard", e);
  }
});

// ── Piutang (AR) list ─────────────────────────────────────────────────────────
router.get("/piutang", async (req: Request, res: Response) => {
  try {
    const { package_id, departure_id, bucket, status: statusFilter } = req.query as Record<string, string>;

    const rows = await db.execute(sql`
      SELECT
        b.id,
        b.booking_code,
        b.total_price,
        b.status,
        b.created_at,
        b.package_id,
        b.departure_id,
        p.name        AS customer_name,
        p.phone       AS customer_phone,
        p.email       AS customer_email,
        pkg.title     AS package_title,
        dep.departure_date,
        COALESCE(paid.total_paid, 0)                          AS total_paid,
        b.total_price - COALESCE(paid.total_paid, 0)          AS outstanding,
        CASE
          WHEN dep.departure_date IS NULL THEN NULL
          ELSE EXTRACT(DAY FROM (dep.departure_date::timestamp - NOW()))::int
        END AS days_to_departure
      FROM bookings b
      LEFT JOIN profiles            p   ON p.id   = b.user_id
      LEFT JOIN packages            pkg ON pkg.id = b.package_id
      LEFT JOIN package_departures  dep ON dep.id = b.departure_id
      LEFT JOIN (
        SELECT booking_id, SUM(amount) AS total_paid
        FROM booking_payments WHERE is_voided = false
        GROUP BY booking_id
      ) paid ON paid.booking_id = b.id
      WHERE b.status NOT IN ('cancelled', 'draft')
        AND COALESCE(paid.total_paid, 0) < b.total_price
        ${package_id   ? sql`AND b.package_id   = ${package_id}`   : sql``}
        ${departure_id ? sql`AND b.departure_id = ${departure_id}` : sql``}
      ORDER BY dep.departure_date::timestamp ASC NULLS LAST, b.created_at DESC
    `);

    let data = ((rows as any).rows ?? rows).map((r: any) => {
      const outstanding  = Number(r.outstanding);
      const totalPrice   = Number(r.total_price);
      const totalPaid    = Number(r.total_paid);
      const days         = r.days_to_departure != null ? Number(r.days_to_departure) : null;

      // Payment status label
      let payStatus: string;
      if (totalPaid === 0)                         payStatus = "belum_bayar";
      else if (totalPaid / totalPrice < 0.3)       payStatus = "baru_dp";
      else if (totalPaid / totalPrice < 0.9)       payStatus = "sebagian";
      else                                          payStatus = "hampir_lunas";

      // Aging bucket
      let agingBucket: string;
      if (days === null)          agingBucket = "normal";
      else if (days < 0)          agingBucket = "overdue";
      else if (days <= 14)        agingBucket = "kritis";
      else if (days <= 30)        agingBucket = "mendesak";
      else if (days <= 60)        agingBucket = "perhatian";
      else                        agingBucket = "normal";

      return {
        id:            r.id,
        bookingCode:   r.booking_code,
        totalPrice,
        totalPaid,
        outstanding,
        status:        r.status,
        payStatus,
        agingBucket,
        daysToDepart:  days,
        customerName:  r.customer_name  ?? "-",
        customerPhone: r.customer_phone ?? null,
        customerEmail: r.customer_email ?? null,
        packageId:     r.package_id,
        packageTitle:  r.package_title  ?? "-",
        departureId:   r.departure_id,
        departureDate: r.departure_date,
        createdAt:     r.created_at,
      };
    });

    // Filter by aging bucket
    if (bucket && bucket !== "all") {
      data = data.filter((d: any) => d.agingBucket === bucket);
    }
    // Filter by pay status
    if (statusFilter && statusFilter !== "all") {
      data = data.filter((d: any) => d.payStatus === statusFilter);
    }

    // Aggregate totals
    const totalOutstanding = data.reduce((s: number, d: any) => s + d.outstanding, 0);
    const kritisCount      = data.filter((d: any) => d.agingBucket === "kritis" || d.agingBucket === "overdue").length;

    res.json({
      data,
      meta: {
        total:            data.length,
        totalOutstanding,
        kritisCount,
      },
    });
  } catch (e) {
    sendError(res, "GET /admin/finance/piutang", e);
  }
});

export default router;
