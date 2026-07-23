/**
 * F-12: Budget & Proyeksi Cash Flow
 *
 * GET    /api/admin/budget                    — list semua budget
 * POST   /api/admin/budget                    — buat budget baru
 * PATCH  /api/admin/budget/:id                — update budget
 * DELETE /api/admin/budget/:id                — hapus budget
 * GET    /api/admin/budget/vs-actual          — target vs realisasi per periode
 * GET    /api/admin/budget/cash-flow-projection — proyeksi cash flow
 */

import { Router, Request, Response } from "express";
import { db, sql, budgets, eq, and } from "@workspace/db";

const router = Router();

function sendError(res: Response, label: string, err: unknown) {
  console.error(`[${label}]`, err);
  res.status(500).json({ error: "Terjadi kesalahan server" });
}

function getRows(r: any): any[] {
  return (r as any).rows ?? r;
}

// ── GET / — list budgets ──────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  try {
    const { year, month } = req.query as { year?: string; month?: string };

    const filters = [];
    if (year) filters.push(eq(budgets.periodYear, Number(year)));
    if (month) filters.push(eq(budgets.periodMonth, Number(month)));

    const rows = await db
      .select()
      .from(budgets)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(budgets.periodYear, budgets.periodMonth, budgets.category);

    res.json(rows);
  } catch (e) {
    sendError(res, "GET /admin/budget", e);
  }
});

// ── POST / — create budget ────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  try {
    const { periodYear, periodMonth, category, categoryLabel, budgetType, amount, notes, createdBy } = req.body as {
      periodYear: number;
      periodMonth?: number | null;
      category: string;
      categoryLabel?: string;
      budgetType?: string;
      amount: number;
      notes?: string;
      createdBy?: string;
    };

    if (!periodYear || !category || amount === undefined) {
      return res.status(400).json({ error: "periodYear, category, amount wajib diisi" });
    }

    const [created] = await db.insert(budgets).values({
      id: crypto.randomUUID(),
      periodYear,
      periodMonth: periodMonth ?? null,
      category,
      categoryLabel: categoryLabel ?? null,
      budgetType: budgetType ?? "expense",
      amount: Math.round(amount),
      notes: notes ?? null,
      createdBy: createdBy ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    res.status(201).json(created);
  } catch (e) {
    sendError(res, "POST /admin/budget", e);
  }
});

// ── PATCH /:id — update budget ────────────────────────────────────────────────
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { amount, categoryLabel, notes, budgetType, periodMonth } = req.body;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (amount !== undefined) patch.amount = Math.round(amount);
    if (categoryLabel !== undefined) patch.categoryLabel = categoryLabel;
    if (notes !== undefined) patch.notes = notes;
    if (budgetType !== undefined) patch.budgetType = budgetType;
    if (periodMonth !== undefined) patch.periodMonth = periodMonth;

    const [updated] = await db
      .update(budgets)
      .set(patch)
      .where(eq(budgets.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Budget tidak ditemukan" });
    res.json(updated);
  } catch (e) {
    sendError(res, "PATCH /admin/budget/:id", e);
  }
});

// ── DELETE /:id — delete budget ───────────────────────────────────────────────
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const [deleted] = await db
      .delete(budgets)
      .where(eq(budgets.id, req.params.id))
      .returning();

    if (!deleted) return res.status(404).json({ error: "Budget tidak ditemukan" });
    res.json({ ok: true });
  } catch (e) {
    sendError(res, "DELETE /admin/budget/:id", e);
  }
});

// ── GET /vs-actual — target vs realisasi per periode ─────────────────────────
// Aktual dihitung per tipe:
// - income: dari booking_payments (didistribusi ke satu kategori income utama)
// - expense: dari financial_transactions per category
router.get("/vs-actual", async (req: Request, res: Response) => {
  try {
    const { year, month } = req.query as { year?: string; month?: string };
    const targetYear = year ? Number(year) : new Date().getFullYear();
    const targetMonth = month ? Number(month) : null;

    // 1. Anggaran yang sudah dikonfigurasi
    const budgetFilters = [eq(budgets.periodYear, targetYear)];
    if (targetMonth) budgetFilters.push(eq(budgets.periodMonth, targetMonth));

    const budgetRows = await db
      .select()
      .from(budgets)
      .where(and(...budgetFilters));

    if (budgetRows.length === 0) {
      return res.json({
        period: { year: targetYear, month: targetMonth },
        comparison: [],
        summary: { totalBudget: 0, totalActual: 0, totalVariance: 0, realisasiPct: 0 },
      });
    }

    // 2. Build date range as parameters
    const fromDate = targetMonth
      ? `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`
      : `${targetYear}-01-01`;
    const toDate = targetMonth
      ? (() => {
          const d = new Date(targetYear, targetMonth, 0); // last day of month
          return d.toISOString().split("T")[0];
        })()
      : `${targetYear}-12-31`;

    // 3. Realisasi pendapatan: satu angka total untuk semua kategori income
    const [incomeResult, expenseResult] = await Promise.all([
      db.execute(sql`
        SELECT COALESCE(SUM(bp.amount), 0) AS total_income
        FROM booking_payments bp
        WHERE bp.is_voided = false
          AND bp.paid_at >= ${fromDate}::date
          AND bp.paid_at < ${toDate}::date + INTERVAL '1 day'
      `),
      // Realisasi pengeluaran per kategori dari financial_transactions
      db.execute(sql`
        SELECT
          COALESCE(ft.category, 'lainnya') AS category,
          SUM(ft.amount::numeric) AS total
        FROM financial_transactions ft
        WHERE ft.type IN ('expense', 'cost')
          AND ft.transaction_date >= ${fromDate}::date
          AND ft.transaction_date < ${toDate}::date + INTERVAL '1 day'
        GROUP BY COALESCE(ft.category, 'lainnya')
      `),
    ]);

    const totalIncome = Number(getRows(incomeResult)[0]?.total_income ?? 0);
    const expenseMap = new Map<string, number>(
      getRows(expenseResult).map((r: any) => [r.category as string, Number(r.total)])
    );

    // 4. Untuk income: hanya assign ke kategori income PERTAMA; biarkan sisanya 0
    //    Ini menghindari double-counting ketika ada >1 kategori income
    const incomeRows = budgetRows.filter((b) => b.budgetType === "income");
    const primaryIncomeCategoryId = incomeRows[0]?.id ?? null;

    // 5. Gabungkan budget vs aktual per baris anggaran
    const comparison = budgetRows.map((b) => {
      let actual = 0;
      if (b.budgetType === "income") {
        // Hanya kategori income pertama yang mendapat angka aktual booking_payments
        // agar tidak terjadi double-counting jika ada lebih dari 1 kategori income
        actual = b.id === primaryIncomeCategoryId ? totalIncome : 0;
      } else {
        actual = expenseMap.get(b.category) ?? 0;
      }

      const variance = actual - b.amount;
      const variancePct = b.amount > 0 ? (variance / b.amount) * 100 : 0;

      return {
        id: b.id,
        category: b.category,
        categoryLabel: b.categoryLabel ?? b.category,
        budgetType: b.budgetType,
        periodYear: b.periodYear,
        periodMonth: b.periodMonth,
        budget: b.amount,
        actual,
        variance,
        variancePct: Math.round(variancePct * 10) / 10,
        isPrimaryIncome: b.budgetType === "income" && b.id === primaryIncomeCategoryId,
        status:
          b.budgetType === "income"
            ? actual >= b.amount ? "on_track" : "under_target"
            : actual <= b.amount ? "under_budget" : "over_budget",
      };
    });

    const totalBudget = comparison.reduce((s, c) => s + c.budget, 0);
    const totalActual = comparison.reduce((s, c) => s + c.actual, 0);

    res.json({
      period: { year: targetYear, month: targetMonth },
      comparison,
      summary: {
        totalBudget,
        totalActual,
        totalVariance: totalActual - totalBudget,
        realisasiPct: totalBudget > 0 ? Math.round((totalActual / totalBudget) * 1000) / 10 : 0,
      },
    });
  } catch (e) {
    sendError(res, "GET /admin/budget/vs-actual", e);
  }
});

// ── GET /cash-flow-projection — proyeksi cash flow N bulan ke depan ───────────
router.get("/cash-flow-projection", async (req: Request, res: Response) => {
  try {
    // Validate months param strictly
    const rawMonths = Number(req.query.months ?? 6);
    const months = Number.isInteger(rawMonths) && rawMonths >= 1 && rawMonths <= 12 ? rawMonths : 6;

    const [installmentResult, piutangResult, avgExpenseResult] = await Promise.all([
      // Cicilan jatuh tempo dalam N bulan ke depan
      db.execute(sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', is2.due_date), 'YYYY-MM') AS month,
          SUM(is2.amount) AS expected_inflow
        FROM installment_schedules is2
        WHERE is2.status = 'pending'
          AND is2.due_date >= NOW()
          AND is2.due_date < NOW() + (${months} || ' months')::interval
        GROUP BY DATE_TRUNC('month', is2.due_date)
        ORDER BY DATE_TRUNC('month', is2.due_date)
      `),
      // Pelunasan outstanding dari booking menjelang keberangkatan
      db.execute(sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', dep.departure_date), 'YYYY-MM') AS month,
          SUM(b.total_price - COALESCE(paid.total_paid, 0)) AS outstanding
        FROM bookings b
        JOIN package_departures dep ON dep.id = b.departure_id
        LEFT JOIN (
          SELECT booking_id, SUM(amount) AS total_paid
          FROM booking_payments WHERE is_voided = false
          GROUP BY booking_id
        ) paid ON paid.booking_id = b.id
        WHERE b.status NOT IN ('cancelled', 'draft')
          AND COALESCE(paid.total_paid, 0) < b.total_price
          AND dep.departure_date >= NOW()
          AND dep.departure_date < NOW() + (${months} || ' months')::interval
        GROUP BY DATE_TRUNC('month', dep.departure_date)
        ORDER BY DATE_TRUNC('month', dep.departure_date)
      `),
      // Rata-rata pengeluaran 3 bulan terakhir
      db.execute(sql`
        SELECT COALESCE(AVG(monthly_expense), 0) AS avg_monthly_expense
        FROM (
          SELECT
            DATE_TRUNC('month', ft.transaction_date) AS month,
            SUM(ft.amount::numeric) AS monthly_expense
          FROM financial_transactions ft
          WHERE ft.type IN ('expense', 'cost')
            AND ft.transaction_date >= NOW() - INTERVAL '3 months'
          GROUP BY DATE_TRUNC('month', ft.transaction_date)
        ) monthly
      `),
    ]);

    const avgMonthlyExpense = Number(getRows(avgExpenseResult)[0]?.avg_monthly_expense ?? 0);

    const installmentMap = new Map<string, number>(
      getRows(installmentResult).map((r: any) => [r.month as string, Number(r.expected_inflow)])
    );
    const piutangMap = new Map<string, number>(
      getRows(piutangResult).map((r: any) => [r.month as string, Number(r.outstanding)])
    );

    const projection = [];
    const now = new Date();
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cicilan = installmentMap.get(key) ?? 0;
      const pelunasan = piutangMap.get(key) ?? 0;
      const projectedInflow = cicilan + pelunasan;
      const projectedOutflow = avgMonthlyExpense;

      projection.push({
        month: key,
        projectedInflow,
        cicilan,
        pelunasan,
        projectedOutflow,
        netCashFlow: projectedInflow - projectedOutflow,
        isForecast: true,
      });
    }

    res.json({
      months,
      avgMonthlyExpense,
      projection,
      note: "Proyeksi inflow dari: cicilan jatuh tempo + outstanding booking menjelang keberangkatan. Proyeksi outflow dari rata-rata pengeluaran 3 bulan terakhir.",
    });
  } catch (e) {
    sendError(res, "GET /admin/budget/cash-flow-projection", e);
  }
});

export default router;
