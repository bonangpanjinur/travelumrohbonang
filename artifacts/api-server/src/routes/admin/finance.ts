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


// ── F-5: Kirim WA reminder piutang (bulk) ────────────────────────────────────
// POST /api/admin/finance/piutang/remind
// Body: { bookingIds: string[] }
router.post("/piutang/remind", async (req: Request, res: Response) => {
  try {
    const { bookingIds } = req.body as { bookingIds?: string[] };
    if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
      res.status(400).json({ error: "bookingIds harus berupa array dan tidak boleh kosong" });
      return;
    }
    if (bookingIds.length > 100) {
      res.status(400).json({ error: "Maksimal 100 booking per batch" });
      return;
    }

    // Ambil data semua booking sekaligus
    const rows = await db.execute(sql`
      SELECT
        b.id,
        b.booking_code,
        b.total_price,
        COALESCE(paid.total_paid, 0)                             AS total_paid,
        b.total_price - COALESCE(paid.total_paid, 0)            AS outstanding,
        dep.departure_date,
        pkg.title                                                AS package_title,
        prof.name                                                AS customer_name,
        prof.phone                                               AS customer_phone
      FROM bookings b
      LEFT JOIN (
        SELECT booking_id, SUM(amount) AS total_paid
        FROM booking_payments WHERE is_voided = false
        GROUP BY booking_id
      ) paid ON paid.booking_id = b.id
      LEFT JOIN package_departures dep ON dep.id = b.departure_id
      LEFT JOIN packages            pkg ON pkg.id = b.package_id
      LEFT JOIN profiles            prof ON prof.id = b.user_id
      WHERE b.id = ANY(${sql.raw(`ARRAY[${bookingIds.map(id => `'${id.replace(/'/g, "''")}'`).join(",")}]::text[]`)})
        AND b.status NOT IN ('cancelled', 'draft')
        AND b.total_price - COALESCE(paid.total_paid, 0) > 0
    `);

    const data = ((rows as any).rows ?? rows) as Array<{
      id: string;
      booking_code: string;
      total_price: string | number;
      outstanding: string | number;
      departure_date: string | null;
      package_title: string | null;
      customer_name: string | null;
      customer_phone: string | null;
    }>;

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Rate-limit: kirim max 10 per batch (anti-spam WA provider)
    const batch = data.slice(0, 50);

    for (const row of batch) {
      if (!row.customer_phone) {
        failed++;
        errors.push(`${row.booking_code}: no phone`);
        continue;
      }

      const depDate = row.departure_date
        ? new Date(row.departure_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
        : "Belum ditentukan";

      const daysLeft = row.departure_date
        ? Math.max(0, Math.ceil((new Date(row.departure_date).getTime() - Date.now()) / 86_400_000))
        : 999;

      const message = paymentDeadlineAlertWA({
        jamaahName:    row.customer_name  || "Jemaah",
        bookingCode:   row.booking_code,
        packageName:   row.package_title  || "Paket Umroh",
        outstanding:   Number(row.outstanding),
        departureDate: depDate,
        daysLeft,
      });

      const result = await sendWhatsApp({ to: row.customer_phone, message });
      if (result.sent) {
        sent++;
      } else {
        failed++;
        errors.push(`${row.booking_code}: ${result.reason}`);
      }

      // Jeda kecil antar pesan agar tidak dianggap spam
      if (batch.indexOf(row) < batch.length - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    res.json({
      sent,
      failed,
      total: batch.length,
      skipped: data.length - batch.length,
      errors: errors.slice(0, 10), // max 10 error detail
    });
  } catch (e) {
    sendError(res, "POST /admin/finance/piutang/remind", e);
  }
});

// ── Keuangan Per Keberangkatan — List ─────────────────────────────────────────
// GET /api/admin/finance/departures
router.get("/departures", async (req: Request, res: Response) => {
  try {
    const rows = await db.execute(sql`
      WITH
      -- 1. Aggregate payments per booking
      paid_agg AS (
        SELECT booking_id, SUM(amount) AS total_paid
        FROM booking_payments
        WHERE is_voided = false
        GROUP BY booking_id
      ),
      -- 2. Aggregate booking revenue + seat counts per departure
      booking_agg AS (
        SELECT
          b.departure_id,
          COUNT(DISTINCT b.id)                                                     AS booking_count,
          COALESCE(SUM(b.total_price), 0)                                          AS target_revenue,
          COALESCE(SUM(COALESCE(pa.total_paid, 0)), 0)                             AS collected,
          COUNT(DISTINCT CASE WHEN COALESCE(pa.total_paid,0) >= b.total_price THEN b.id END) AS lunas_count
        FROM bookings b
        LEFT JOIN paid_agg pa ON pa.booking_id = b.id
        WHERE b.status NOT IN ('cancelled','draft')
        GROUP BY b.departure_id
      ),
      -- 3. Compute HPP per departure using pre-aggregated seat count (no nested aggregates)
      hpp_agg AS (
        SELECT
          pc.departure_id,
          SUM(
            pc.unit_cost * pc.qty *
            CASE WHEN pc.is_per_pax THEN COALESCE(ba.booking_count, 0) ELSE 1 END
          ) AS hpp_total
        FROM package_costs pc
        LEFT JOIN booking_agg ba ON ba.departure_id = pc.departure_id
        WHERE pc.is_active = true
          AND pc.departure_id IS NOT NULL
        GROUP BY pc.departure_id
      )
      SELECT
        dep.id,
        dep.departure_date,
        dep.return_date,
        dep.quota,
        dep.status                                   AS departure_status,
        pkg.id                                       AS package_id,
        pkg.title                                    AS package_title,
        COALESCE(ba.booking_count, 0)                AS booking_count,
        COALESCE(ba.lunas_count, 0)                  AS lunas_count,
        COALESCE(ba.target_revenue, 0)               AS target_revenue,
        COALESCE(ba.collected, 0)                    AS collected,
        COALESCE(ba.target_revenue, 0) - COALESCE(ba.collected, 0) AS outstanding,
        COALESCE(ha.hpp_total, 0)                    AS hpp_total
      FROM package_departures dep
      JOIN packages pkg ON pkg.id = dep.package_id
      LEFT JOIN booking_agg ba ON ba.departure_id = dep.id
      LEFT JOIN hpp_agg ha ON ha.departure_id = dep.id
      ORDER BY dep.departure_date::timestamp DESC
    `);

    const getRows = (r: any) => (r as any).rows ?? r;

    const data = getRows(rows).map((r: any) => {
      const target     = Number(r.target_revenue);
      const collected  = Number(r.collected);
      const hpp        = Number(r.hpp_total);
      const grossProfit = collected - hpp;
      return {
        id:              r.id,
        departureDate:   r.departure_date,
        returnDate:      r.return_date,
        quota:           Number(r.quota),
        departureStatus: r.departure_status,
        packageId:       r.package_id,
        packageTitle:    r.package_title,
        bookingCount:    Number(r.booking_count),
        lunasCount:      Number(r.lunas_count),
        targetRevenue:   target,
        collected,
        outstanding:     Number(r.outstanding),
        pctCollected:    target > 0 ? Math.round((collected / target) * 100) : 0,
        hppTotal:        hpp,
        grossProfit,
        marginPct:       collected > 0 ? Math.round((grossProfit / collected) * 100) : 0,
      };
    });

    res.json({ data });
  } catch (e) {
    sendError(res, "GET /admin/finance/departures", e);
  }
});

// ── Keuangan Per Keberangkatan — Detail ───────────────────────────────────────
// GET /api/admin/finance/departure/:departureId
router.get("/departure/:departureId", async (req: Request, res: Response) => {
  try {
    const { departureId } = req.params;

    const [depResult, costsResult, pilgrimsResult] = await Promise.all([
      // Departure + revenue summary
      db.execute(sql`
        SELECT
          dep.id,
          dep.departure_date,
          dep.return_date,
          dep.quota,
          dep.status        AS departure_status,
          pkg.id            AS package_id,
          pkg.title         AS package_title,
          COUNT(DISTINCT b.id)                                        AS booking_count,
          COALESCE(SUM(b.total_price), 0)                             AS target_revenue,
          COALESCE(SUM(paid.total_paid), 0)                           AS collected,
          COALESCE(SUM(b.total_price), 0) - COALESCE(SUM(paid.total_paid), 0) AS outstanding,
          COUNT(DISTINCT CASE WHEN COALESCE(paid.total_paid, 0) >= b.total_price THEN b.id END) AS lunas_count
        FROM package_departures dep
        JOIN packages pkg ON pkg.id = dep.package_id
        LEFT JOIN bookings b ON b.departure_id = dep.id AND b.status NOT IN ('cancelled','draft')
        LEFT JOIN (
          SELECT booking_id, SUM(amount) AS total_paid
          FROM booking_payments WHERE is_voided = false
          GROUP BY booking_id
        ) paid ON paid.booking_id = b.id
        WHERE dep.id = ${departureId}
        GROUP BY dep.id, dep.departure_date, dep.return_date, dep.quota, dep.status, pkg.id, pkg.title
      `),

      // Operational costs (package_costs for this departure)
      db.execute(sql`
        SELECT
          pc.id,
          pc.category,
          pc.item_name,
          pc.qty,
          pc.unit,
          pc.unit_cost,
          pc.is_per_pax,
          pc.notes,
          -- filled seats count for per-pax calculation
          (
            SELECT COUNT(*) FROM bookings b2
            WHERE b2.departure_id = ${departureId}
              AND b2.status NOT IN ('cancelled','draft')
          ) AS filled_seats
        FROM package_costs pc
        WHERE pc.departure_id = ${departureId}
          AND pc.is_active = true
        ORDER BY pc.category, pc.sort_order, pc.item_name
      `),

      // Pilgrims per booking
      db.execute(sql`
        SELECT
          b.id,
          b.booking_code,
          b.total_price,
          b.status,
          b.created_at,
          p.name          AS customer_name,
          p.phone         AS customer_phone,
          p.email         AS customer_email,
          COALESCE(paid.total_paid, 0) AS total_paid,
          b.total_price - COALESCE(paid.total_paid, 0) AS outstanding
        FROM bookings b
        LEFT JOIN profiles p ON p.id = b.user_id
        LEFT JOIN (
          SELECT booking_id, SUM(amount) AS total_paid
          FROM booking_payments WHERE is_voided = false
          GROUP BY booking_id
        ) paid ON paid.booking_id = b.id
        WHERE b.departure_id = ${departureId}
          AND b.status NOT IN ('cancelled','draft')
        ORDER BY b.created_at ASC
      `),
    ]);

    const getRows = (r: any) => (r as any).rows ?? r;

    const depRow = getRows(depResult)[0];
    if (!depRow) {
      return res.status(404).json({ error: "Keberangkatan tidak ditemukan" });
    }

    const targetRevenue = Number(depRow.target_revenue);
    const collected     = Number(depRow.collected);
    const outstanding   = Number(depRow.outstanding);
    const bookingCount  = Number(depRow.booking_count);

    // Build operational costs with computed budgeted amount
    let hppTotal = 0;
    const operationalCosts = getRows(costsResult).map((r: any) => {
      const qty         = Number(r.qty) || 1;
      const unitCost    = Number(r.unit_cost) || 0;
      const filledSeats = Number(r.filled_seats) || 0;
      const multiplier  = r.is_per_pax ? filledSeats : 1;
      const budgeted    = unitCost * qty * multiplier;
      hppTotal += budgeted;
      return {
        id:         r.id,
        category:   r.category,
        itemName:   r.item_name,
        qty,
        unit:       r.unit,
        unitCost,
        isPerPax:   r.is_per_pax,
        budgeted,
        notes:      r.notes,
      };
    });

    const grossProfit = collected - hppTotal;

    const pilgrims = getRows(pilgrimsResult).map((r: any) => {
      const totalPrice = Number(r.total_price);
      const totalPaid  = Number(r.total_paid);
      const out        = Number(r.outstanding);
      let payStatus: string;
      if (totalPaid === 0)                         payStatus = "belum_bayar";
      else if (totalPaid >= totalPrice)             payStatus = "lunas";
      else if (totalPaid / totalPrice < 0.3)        payStatus = "baru_dp";
      else if (totalPaid / totalPrice < 0.9)        payStatus = "sebagian";
      else                                           payStatus = "hampir_lunas";

      return {
        id:            r.id,
        bookingCode:   r.booking_code,
        customerName:  r.customer_name  ?? "-",
        customerPhone: r.customer_phone ?? null,
        customerEmail: r.customer_email ?? null,
        totalPrice,
        totalPaid,
        outstanding:   out,
        status:        r.status,
        payStatus,
        pctPaid:       totalPrice > 0 ? Math.round((totalPaid / totalPrice) * 100) : 0,
        createdAt:     r.created_at,
      };
    });

    res.json({
      departure: {
        id:              depRow.id,
        departureDate:   depRow.departure_date,
        returnDate:      depRow.return_date,
        quota:           Number(depRow.quota),
        filledSeats:     bookingCount,
        departureStatus: depRow.departure_status,
        packageId:       depRow.package_id,
        packageTitle:    depRow.package_title,
      },
      revenue: {
        target:       targetRevenue,
        collected,
        outstanding,
        pctCollected: targetRevenue > 0 ? Math.round((collected / targetRevenue) * 100) : 0,
        lunasCount:   Number(depRow.lunas_count),
        bookingCount,
      },
      hpp: {
        total: hppTotal,
        perPax: bookingCount > 0 ? Math.round(hppTotal / bookingCount) : 0,
      },
      operationalCosts,
      grossProfit,
      marginPct: collected > 0 ? Math.round((grossProfit / collected) * 100) : 0,
      pilgrims,
    });
  } catch (e) {
    sendError(res, "GET /admin/finance/departure/:id", e);
  }
});

// ── F-8: Laporan Keuangan — Income Statement ─────────────────────────────────
// GET /api/admin/finance/reports/income-statement?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/reports/income-statement", async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };

    const conditions: string[] = [];
    if (from) conditions.push(`ft.transaction_date >= '${from}'::timestamptz`);
    if (to)   conditions.push(`ft.transaction_date <= '${to}'::timestamptz`);
    const whereClause = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

    const rows = await db.execute(sql.raw(`
      SELECT
        ft.type,
        ft.category,
        COALESCE(coa.name, ft.category) AS account_name,
        COALESCE(coa.code, '')          AS account_code,
        SUM(ft.amount::numeric)         AS total
      FROM financial_transactions ft
      LEFT JOIN chart_of_accounts coa ON coa.id = ft.account_id
      WHERE ft.type IN ('income', 'expense') ${whereClause}
      GROUP BY ft.type, ft.category, coa.name, coa.code
      ORDER BY ft.type, SUM(ft.amount::numeric) DESC
    `));

    const getRows = (r: any) => (r as any).rows ?? r;
    const data = getRows(rows);

    const revenueItems = data.filter((r: any) => r.type === "income").map((r: any) => ({
      category: r.category,
      accountName: r.account_name,
      accountCode: r.account_code,
      total: Number(r.total),
    }));
    const expenseItems = data.filter((r: any) => r.type === "expense").map((r: any) => ({
      category: r.category,
      accountName: r.account_name,
      accountCode: r.account_code,
      total: Number(r.total),
    }));

    const totalRevenue = revenueItems.reduce((s: number, r: any) => s + r.total, 0);
    const totalExpense = expenseItems.reduce((s: number, r: any) => s + r.total, 0);

    res.json({
      period: { from: from ?? null, to: to ?? null },
      revenue: { items: revenueItems, total: totalRevenue },
      expense: { items: expenseItems, total: totalExpense },
      grossProfit: totalRevenue - totalExpense,
      netIncome: totalRevenue - totalExpense,
    });
  } catch (e) {
    sendError(res, "GET /admin/finance/reports/income-statement", e);
  }
});

// ── F-8: Laporan Keuangan — Balance Sheet ─────────────────────────────────────
// GET /api/admin/finance/reports/balance-sheet?date=YYYY-MM-DD
router.get("/reports/balance-sheet", async (req: Request, res: Response) => {
  try {
    const { date } = req.query as { date?: string };
    const dateFilter = date ? `AND ft.transaction_date <= '${date}'::timestamptz` : "";

    const rows = await db.execute(sql.raw(`
      SELECT
        coa.type,
        coa.category,
        coa.code,
        coa.name,
        coa.normal_balance,
        COALESCE(SUM(CASE WHEN ft.entry_type = 'debit' THEN ft.amount::numeric ELSE 0 END), 0) AS total_debit,
        COALESCE(SUM(CASE WHEN ft.entry_type = 'credit' THEN ft.amount::numeric ELSE 0 END), 0) AS total_credit
      FROM chart_of_accounts coa
      LEFT JOIN financial_transactions ft ON ft.account_id = coa.id ${dateFilter}
      WHERE coa.is_active = true AND coa.type IN ('asset', 'liability', 'equity')
      GROUP BY coa.id, coa.type, coa.category, coa.code, coa.name, coa.normal_balance
      ORDER BY coa.code
    `));

    const getRows = (r: any) => (r as any).rows ?? r;
    const data = getRows(rows);

    const computeBalance = (row: any) => {
      const debit = Number(row.total_debit);
      const credit = Number(row.total_credit);
      return row.normal_balance === "debit" ? debit - credit : credit - debit;
    };

    const assets = data.filter((r: any) => r.type === "asset").map((r: any) => ({
      code: r.code, name: r.name, category: r.category, balance: computeBalance(r),
    }));
    const liabilities = data.filter((r: any) => r.type === "liability").map((r: any) => ({
      code: r.code, name: r.name, category: r.category, balance: computeBalance(r),
    }));
    const equity = data.filter((r: any) => r.type === "equity").map((r: any) => ({
      code: r.code, name: r.name, category: r.category, balance: computeBalance(r),
    }));

    const totalAssets = assets.reduce((s: number, r: any) => s + r.balance, 0);
    const totalLiabilities = liabilities.reduce((s: number, r: any) => s + r.balance, 0);
    const totalEquity = equity.reduce((s: number, r: any) => s + r.balance, 0);

    res.json({
      asOf: date ?? new Date().toISOString().split("T")[0],
      assets: { items: assets, total: totalAssets },
      liabilities: { items: liabilities, total: totalLiabilities },
      equity: { items: equity, total: totalEquity },
      totalLiabilitiesEquity: totalLiabilities + totalEquity,
    });
  } catch (e) {
    sendError(res, "GET /admin/finance/reports/balance-sheet", e);
  }
});

// ── F-8: Laporan Keuangan — Cash Flow ────────────────────────────────────────
// GET /api/admin/finance/reports/cash-flow?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/reports/cash-flow", async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };

    const conditions: string[] = [];
    if (from) conditions.push(`bp.paid_at >= '${from}'::timestamptz`);
    if (to)   conditions.push(`bp.paid_at <= '${to}'::timestamptz`);
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Operating: actual cash received from bookings
    const [inflows, outflows] = await Promise.all([
      db.execute(sql.raw(`
        SELECT
          DATE_TRUNC('month', bp.paid_at) AS month,
          SUM(bp.amount) AS total
        FROM booking_payments bp
        ${whereClause}
        GROUP BY month
        ORDER BY month
      `)),
      db.execute(sql.raw(`
        SELECT
          DATE_TRUNC('month', ft.transaction_date) AS month,
          SUM(ft.amount::numeric) AS total
        FROM financial_transactions ft
        WHERE ft.type = 'expense' ${conditions.length > 0 ? "AND ft.transaction_date >= '" + from + "'::timestamptz" : ""}
          ${to ? "AND ft.transaction_date <= '" + to + "'::timestamptz" : ""}
        GROUP BY month
        ORDER BY month
      `)),
    ]);

    const getRows = (r: any) => (r as any).rows ?? r;

    const inflowMap = new Map(getRows(inflows).map((r: any) => [
      new Date(r.month).toISOString().slice(0, 7),
      Number(r.total),
    ]));
    const outflowMap = new Map(getRows(outflows).map((r: any) => [
      new Date(r.month).toISOString().slice(0, 7),
      Number(r.total),
    ]));

    const allMonths = Array.from(new Set([...inflowMap.keys(), ...outflowMap.keys()])).sort();

    const monthly = allMonths.map((m) => {
      const inflow = inflowMap.get(m) ?? 0;
      const outflow = outflowMap.get(m) ?? 0;
      return { month: m, inflow, outflow, net: inflow - outflow };
    });

    const totalInflow = monthly.reduce((s, r) => s + r.inflow, 0);
    const totalOutflow = monthly.reduce((s, r) => s + r.outflow, 0);

    res.json({
      period: { from: from ?? null, to: to ?? null },
      monthly,
      summary: { totalInflow, totalOutflow, netCashFlow: totalInflow - totalOutflow },
    });
  } catch (e) {
    sendError(res, "GET /admin/finance/reports/cash-flow", e);
  }
});

export default router;


