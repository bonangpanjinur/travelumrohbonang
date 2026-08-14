import { Router } from "express";
import { db, agents, agentCommissions, bookings, eq, gte, lte, and } from "@workspace/db";
import { generateCommissionsExcel } from "../../lib/excel/commissionsReport";
import { resolveUserScope } from "../../lib/scopeGuard";
import { buildBookingScopeCondition } from "../../lib/scopeConditions";

const router = Router();

// ── WIB timezone helpers (sama dengan finance.ts) ─────────────────────────────
const WIB_OFFSET_MS = 7 * 60 * 60 * 1_000;

function toStartOfDayWIB(dateStr: string): Date {
  return new Date(new Date(dateStr).getTime() - WIB_OFFSET_MS);
}

function toEndOfDayWIB(dateStr: string): Date {
  return new Date(new Date(dateStr).getTime() - WIB_OFFSET_MS + 24 * 60 * 60 * 1_000 - 1);
}

/**
 * GET /api/admin/reports/commissions.xlsx?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Excel export of agent commissions grouped by agent with subtotals (F-06).
 *
 * F3-01: Filter tanggal menggunakan WIB helpers agar tidak off-by-one.
 */
router.get("/commissions.xlsx", async (req, res) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const scope = await resolveUserScope(req);

    const conditions = [buildBookingScopeCondition(scope, "bookings")];
    if (from) conditions.push(gte(agentCommissions.createdAt, toStartOfDayWIB(from)));
    if (to)   conditions.push(lte(agentCommissions.createdAt, toEndOfDayWIB(to)));

    const rows = await db
      .select({
        agentName: agents.name,
        agentReferralCode: agents.referralCode,
        bookingCode: bookings.bookingCode,
        bookingCreatedAt: bookings.createdAt,
        amount: agentCommissions.amount,
        status: agentCommissions.status,
      })
      .from(agentCommissions)
      .leftJoin(agents, eq(agentCommissions.agentId, agents.id))
      .leftJoin(bookings, eq(agentCommissions.bookingId, bookings.id))
      .where(conditions.length ? and(...conditions) : undefined);

    const periodLabel =
      from || to
        ? `${from ?? "awal"} s/d ${to ?? "sekarang"}`
        : "Semua periode";

    const buffer = await generateCommissionsExcel(
      rows.map((r) => ({
        agentName: r.agentName ?? "(Agen tidak diketahui)",
        agentReferralCode: r.agentReferralCode,
        bookingCode: r.bookingCode ?? "-",
        bookingCreatedAt: r.bookingCreatedAt,
        amount: r.amount,
        status: r.status,
      })),
      periodLabel,
    );

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="laporan-komisi-agen.xlsx"`);
    res.send(buffer);
  } catch (err) {
    console.error("[reports] Failed to generate commissions Excel:", err);
    res.status(500).json({ error: "Failed to generate commissions report" });
  }
});

export default router;
