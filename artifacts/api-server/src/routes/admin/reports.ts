import { Router } from "express";
import { db, agents, agentCommissions, bookings, eq, gte, lte, and } from "@workspace/db";
import { generateCommissionsExcel } from "../../lib/excel/commissionsReport";

const router = Router();

/**
 * GET /api/admin/reports/commissions.xlsx?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Excel export of agent commissions grouped by agent with subtotals (F-06).
 */
router.get("/commissions.xlsx", async (req, res) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };

    const conditions = [];
    if (from) conditions.push(gte(agentCommissions.createdAt, new Date(from)));
    if (to) conditions.push(lte(agentCommissions.createdAt, new Date(to)));

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
