import { Router } from "express";
import {
  db,
  packageCosts,
  bookings,
  agentCommissions,
  packageCommissions,
  financialTransactions,
  eq,
  and,
  or,
  inArray,
  isNull,
  asc,
} from "@workspace/db";

const router = Router();

router.get("/all", async (_req, res) => {
  try {
    const data = await db.select().from(packageCosts);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch all costs" });
  }
});

router.get("/package/:packageId", async (req, res) => {
  try {
    const { departureId } = req.query;

    // When a specific departure is selected: show costs for that departure OR
    // package-level costs (departure_id IS NULL) so admins see both shared
    // and departure-specific line items in one view.
    // When no departure filter ("__all__" or absent): show all costs for the package.
    const whereClause =
      departureId && departureId !== "__all__"
        ? and(
            eq(packageCosts.packageId, req.params.packageId),
            or(
              eq(packageCosts.departureId, departureId as string),
              isNull(packageCosts.departureId),
            ),
          )
        : eq(packageCosts.packageId, req.params.packageId);

    const data = await db
      .select()
      .from(packageCosts)
      .where(whereClause)
      .orderBy(asc(packageCosts.sortOrder), asc(packageCosts.createdAt));

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch package costs" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [created] = await db
      .insert(packageCosts)
      .values({
        id: crypto.randomUUID(),
        ...req.body,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: "Failed to create cost component" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const [updated] = await db
      .update(packageCosts)
      .set(req.body)
      .where(eq(packageCosts.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Cost component not found" });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Failed to update cost component" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(packageCosts).where(eq(packageCosts.id, req.params.id)).returning();
    if (!deleted) return res.status(404).json({ error: "Cost component not found" });
    return res.json({ message: "Cost component deleted" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete cost component" });
  }
});

router.post("/bulk-copy", async (req, res) => {
  try {
    const { sourceCosts, targetPackageIds, targetDepartureIds, mode, overwrite, sourcePackageId } = req.body ?? {};

    if (mode !== "packages" && mode !== "departures") {
      return res.status(400).json({ error: "mode must be 'packages' or 'departures'" });
    }
    if (!Array.isArray(sourceCosts) || sourceCosts.length === 0) {
      return res.status(400).json({ error: "sourceCosts must be a non-empty array" });
    }
    if (mode === "packages" && (!Array.isArray(targetPackageIds) || targetPackageIds.length === 0)) {
      return res.status(400).json({ error: "targetPackageIds must be a non-empty array" });
    }
    if (mode === "departures") {
      if (!Array.isArray(targetDepartureIds) || targetDepartureIds.length === 0) {
        return res.status(400).json({ error: "targetDepartureIds must be a non-empty array" });
      }
      if (!sourcePackageId) {
        return res.status(400).json({ error: "sourcePackageId is required for mode 'departures'" });
      }
    }

    if (overwrite) {
      if (mode === "packages") {
        for (const pid of targetPackageIds) {
          await db.delete(packageCosts).where(and(eq(packageCosts.packageId, pid), isNull(packageCosts.departureId)));
        }
      } else {
        for (const did of targetDepartureIds) {
          await db.delete(packageCosts).where(eq(packageCosts.departureId, did));
        }
      }
    }

    const inserts: any[] = [];
    if (mode === "packages") {
      for (const pid of targetPackageIds) {
        for (const c of sourceCosts) {
          inserts.push({
            id: crypto.randomUUID(),
            packageId: pid,
            departureId: null,
            category: c.category,
            itemName: c.item_name,
            qty: c.qty,
            unit: c.unit,
            unitCost: c.unit_cost,
            currencyCode: c.currency_code,
            isPerPax: c.is_per_pax,
            isActive: c.is_active,
            notes: c.notes,
          });
        }
      }
    } else {
      for (const did of targetDepartureIds) {
        for (const c of sourceCosts) {
          inserts.push({
            id: crypto.randomUUID(),
            packageId: sourcePackageId,
            departureId: did,
            category: c.category,
            itemName: c.item_name,
            qty: c.qty,
            unit: c.unit,
            unitCost: c.unit_cost,
            currencyCode: c.currency_code,
            isPerPax: c.is_per_pax,
            isActive: c.is_active,
            notes: c.notes,
          });
        }
      }
    }

    if (inserts.length > 0) {
      await db.insert(packageCosts).values(inserts);
    }

    res.json({ message: `${inserts.length} components copied` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to copy components" });
  }
});

// ── GET /profitability-overview — batch profitability for many packages at once
// Accepts ?packageIds=id1,id2,id3 and optionally ?departureId=X
// Returns an array of { packageId, paidBookings, agentCommission, picCommissionPerPax, marketingTotal }
router.get("/profitability-overview", async (req, res) => {
  try {
    const { packageIds: rawIds, departureId } = req.query as { packageIds?: string; departureId?: string };
    if (!rawIds) return res.json([]);

    const ids = rawIds.split(",").filter(Boolean);
    if (ids.length === 0) return res.json([]);

    // Fetch all paid bookings for these packages in one query
    const allBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          inArray(bookings.packageId, ids),
          eq(bookings.status, "paid"),
          ...(departureId && departureId !== "__all__"
            ? [eq(bookings.departureId, departureId)]
            : []),
        ),
      );

    const allBookingIds = allBookings.map((b: any) => b.id);

    // Fetch agent commissions for all bookings at once
    const allAgentComm = allBookingIds.length > 0
      ? await db.select().from(agentCommissions).where(inArray(agentCommissions.bookingId, allBookingIds))
      : [];

    // Fetch package commissions for all packages at once
    const allPkgComm = await db.select().from(packageCommissions).where(inArray(packageCommissions.packageId, ids));

    // Marketing total is global (shared across packages) — fetch once
    const ftx = await db.select().from(financialTransactions).where(
      and(
        eq(financialTransactions.category, "marketing"),
        eq(financialTransactions.type, "expense"),
        isNull(financialTransactions.bookingId),
      ),
    );
    const marketingTotal = ftx.reduce((s: number, x: any) => s + Number(x.amount || 0), 0);

    const results = ids.map((pid) => {
      const pkgBookings = allBookings.filter((b: any) => b.packageId === pid);
      const pkgBookingIds = pkgBookings.map((b: any) => b.id);
      const agentComm = allAgentComm
        .filter((ac: any) => pkgBookingIds.includes(ac.bookingId))
        .reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
      const picCommPerPax = allPkgComm
        .filter((pc: any) => pc.packageId === pid)
        .reduce((s: number, x: any) => s + Number(x.commissionAmount || 0), 0);
      return {
        packageId: pid,
        paidBookings: pkgBookings,
        agentCommission: agentComm,
        picCommissionPerPax: picCommPerPax,
        marketingTotal,
      };
    });

    return res.json(results);
  } catch (err) {
    console.error("[costs] profitability-overview:", err);
    return res.status(500).json({ error: "Failed to fetch profitability overview" });
  }
});

// Profitability helper endpoint
// ── GET /summary?packageId=X — budgeted vs actual vs variance per category
router.get("/summary", async (req, res) => {
  try {
    const { packageId, departureId } = req.query as { packageId?: string; departureId?: string };
    if (!packageId) return res.status(400).json({ error: "packageId required" });

    const { sql, db } = await import("@workspace/db");

    const getRows = (r: any) => (r as any).rows ?? r;

    const result = await db.execute(sql`
      SELECT
        category,
        SUM(
          CASE WHEN is_active THEN
            COALESCE(unit_cost::numeric, 0) * COALESCE(qty::numeric, 1)
          ELSE 0 END
        )::numeric AS budgeted_total,
        SUM(actual_amount::numeric)             AS actual_total,
        SUM(actual_amount::numeric) - SUM(
          CASE WHEN is_active THEN
            COALESCE(unit_cost::numeric, 0) * COALESCE(qty::numeric, 1)
          ELSE 0 END
        )                                       AS variance,
        COUNT(*) FILTER (WHERE actual_amount IS NULL AND is_active) AS missing_actual_count
      FROM package_costs
      WHERE package_id = ${packageId}
        ${departureId && departureId !== "__all__" ? sql`AND (departure_id = ${departureId} OR departure_id IS NULL)` : sql``}
      GROUP BY category
      ORDER BY category
    `);

    const rows = getRows(result);
    return res.json({ data: rows });
  } catch (err) {
    console.error("[costs] summary:", err);
    return res.status(500).json({ error: "Failed to fetch cost summary" });
  }
});

// Profitability helper endpoint
router.get("/profitability/:packageId", async (req, res) => {
  try {
    const { packageId } = req.params;
    const { departureId } = req.query;

    let bookingQuery = db.select().from(bookings).where(and(eq(bookings.packageId, packageId), eq(bookings.status, "paid")));
    if (departureId && departureId !== "__all__") {
      bookingQuery = db.select().from(bookings).where(and(eq(bookings.packageId, packageId), eq(bookings.status, "paid"), eq(bookings.departureId, departureId as string)));
    }
    
    const paidBookings = await bookingQuery;
    const bookingIds = paidBookings.map((b: any) => b.id);

    let agentComm = 0;
    if (bookingIds.length > 0) {
      const ac = await db.select().from(agentCommissions).where(inArray(agentCommissions.bookingId, bookingIds));
      agentComm = ac.reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
    }

    const pc = await db.select().from(packageCommissions).where(eq(packageCommissions.packageId, packageId));
    const picCommPerPax = pc.reduce((s: number, x: any) => s + Number(x.commissionAmount || 0), 0);

    const ftx = await db.select().from(financialTransactions).where(and(eq(financialTransactions.category, "marketing"), eq(financialTransactions.type, "expense"), isNull(financialTransactions.bookingId)));
    const marketing = ftx.reduce((s: number, x: any) => s + Number(x.amount || 0), 0);

    return res.json({
      paidBookings,
      agentCommission: agentComm,
      picCommissionPerPax: picCommPerPax,
      marketingTotal: marketing
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch profitability data" });
  }
});

export default router;
