import { Router } from "express";
import {
  db, leads, leadFollowUps, leadInteractions, bookingPilgrims,
  eq, desc, asc, and, lte, gte, sql, inArray,
} from "@workspace/db";

const router = Router();

// ─── Pipeline (Kanban) ───────────────────────────────────────────────────────

router.get("/pipeline", async (_req, res) => {
  try {
    const data = await db.select().from(leads).orderBy(asc(leads.createdAt));
    const statuses = ["new", "contacted", "interested", "negotiation", "converted", "lost"];
    const pipeline = statuses.reduce<Record<string, typeof data>>((acc, s) => {
      acc[s] = data.filter((l) => l.status === s);
      return acc;
    }, {});
    res.json(pipeline);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil pipeline" });
  }
});

// ─── Follow-ups (global, with filter) ────────────────────────────────────────

/**
 * GET /api/admin/crm/follow-ups
 * Optional ?filter=today|overdue|pending|done
 */
router.get("/follow-ups", async (req, res) => {
  try {
    const { filter } = req.query as { filter?: string };
    const now = new Date();

    // Build date boundaries
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    let whereClause;
    if (filter === "overdue") {
      whereClause = and(eq(leadFollowUps.isDone, false), lte(leadFollowUps.followUpDate, todayStart));
    } else if (filter === "today") {
      whereClause = and(
        eq(leadFollowUps.isDone, false),
        gte(leadFollowUps.followUpDate, todayStart),
        lte(leadFollowUps.followUpDate, todayEnd),
      );
    } else if (filter === "pending") {
      whereClause = eq(leadFollowUps.isDone, false);
    } else if (filter === "done") {
      whereClause = eq(leadFollowUps.isDone, true);
    }

    const query = db
      .select({
        id: leadFollowUps.id,
        leadId: leadFollowUps.leadId,
        followUpDate: leadFollowUps.followUpDate,
        type: leadFollowUps.type,
        notes: leadFollowUps.notes,
        isDone: leadFollowUps.isDone,
        doneAt: leadFollowUps.doneAt,
        createdAt: leadFollowUps.createdAt,
        leadName: leads.name,
        leadPhone: leads.phone,
        leadStatus: leads.status,
      })
      .from(leadFollowUps)
      .leftJoin(leads, eq(leadFollowUps.leadId, leads.id));

    const data = whereClause
      ? await query.where(whereClause).orderBy(asc(leadFollowUps.followUpDate))
      : await query.orderBy(asc(leadFollowUps.followUpDate));

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil follow-ups" });
  }
});

// ─── Repeat Customer Detection ────────────────────────────────────────────────

/**
 * GET /api/admin/crm/repeat-customers
 * Cross-references leads.phone / leads.email against booking_pilgrims.
 * Marks matched leads as isRepeatCustomer=true in the DB.
 * Returns { detected, leads[] }.
 */
router.get("/repeat-customers", async (_req, res) => {
  try {
    const [allLeads, allPilgrims] = await Promise.all([
      db.select().from(leads),
      db.select({ phone: bookingPilgrims.phone, email: bookingPilgrims.email }).from(bookingPilgrims),
    ]);

    const pilgrimPhones = new Set(allPilgrims.map((p) => p.phone).filter(Boolean) as string[]);
    const pilgrimEmails = new Set(allPilgrims.map((p) => p.email).filter(Boolean) as string[]);

    const repeatLeads = allLeads.filter(
      (l) =>
        (l.phone && pilgrimPhones.has(l.phone)) ||
        (l.email && pilgrimEmails.has(l.email)),
    );

    // Mark detected leads in DB (batch update)
    if (repeatLeads.length > 0) {
      const repeatIds = repeatLeads.map((l) => l.id);
      await db
        .update(leads)
        .set({ isRepeatCustomer: true })
        .where(inArray(leads.id, repeatIds));

      // Also clear flag for leads no longer matching (phone/email changed)
      const nonRepeatIds = allLeads.filter((l) => !repeatIds.includes(l.id)).map((l) => l.id);
      if (nonRepeatIds.length > 0) {
        await db
          .update(leads)
          .set({ isRepeatCustomer: false })
          .where(inArray(leads.id, nonRepeatIds));
      }
    }

    res.json({ detected: repeatLeads.length, leads: repeatLeads });
  } catch (err) {
    console.error("[crm] repeat-customers error:", err);
    res.status(500).json({ error: "Gagal mendeteksi repeat customer" });
  }
});

// ─── Leads ───────────────────────────────────────────────────────────────────

router.get("/leads", async (req, res) => {
  try {
    const { status, tag, search } = req.query as Record<string, string>;
    let query = db.select().from(leads).$dynamic();

    const conditions = [];
    if (status) conditions.push(eq(leads.status, status));
    if (search) {
      conditions.push(
        sql`(${leads.name} ilike ${"%" + search + "%"} or ${leads.phone} ilike ${"%" + search + "%"} or ${leads.email} ilike ${"%" + search + "%"})`,
      );
    }
    if (tag) {
      conditions.push(sql`${leads.tags} @> ${JSON.stringify([tag])}::jsonb`);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const data = await query.orderBy(desc(leads.createdAt));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil leads" });
  }
});

router.get("/leads/:id", async (req, res) => {
  try {
    const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id));
    if (!lead) return res.status(404).json({ error: "Lead tidak ditemukan" });
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil lead" });
  }
});

router.post("/leads", async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const [data] = await db.insert(leads).values({
      ...req.body,
      id,
      createdAt: new Date(),
    }).returning();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Gagal membuat lead" });
  }
});

router.patch("/leads/:id", async (req, res) => {
  try {
    const [data] = await db.update(leads).set(req.body).where(eq(leads.id, req.params.id)).returning();
    if (!data) return res.status(404).json({ error: "Lead tidak ditemukan" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Gagal update lead" });
  }
});

router.delete("/leads/:id", async (req, res) => {
  try {
    await db.delete(leads).where(eq(leads.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Gagal hapus lead" });
  }
});

// ─── Lead Tags ────────────────────────────────────────────────────────────────

router.patch("/leads/:id/tags", async (req, res) => {
  try {
    const { tags } = req.body as { tags: string[] };
    if (!Array.isArray(tags)) return res.status(400).json({ error: "Tags harus array" });
    const [data] = await db
      .update(leads)
      .set({ tags })
      .where(eq(leads.id, req.params.id))
      .returning();
    if (!data) return res.status(404).json({ error: "Lead tidak ditemukan" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Gagal update tags" });
  }
});

// ─── Lead Interactions ───────────────────────────────────────────────────────

router.get("/leads/:leadId/interactions", async (req, res) => {
  try {
    const data = await db
      .select()
      .from(leadInteractions)
      .where(eq(leadInteractions.leadId, req.params.leadId))
      .orderBy(desc(leadInteractions.createdAt));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil riwayat interaksi" });
  }
});

router.post("/leads/:leadId/interactions", async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date();

    // Persist interaction
    const [data] = await db.insert(leadInteractions).values({
      ...req.body,
      id,
      leadId: req.params.leadId,
      createdAt: now,
    }).returning();

    // Update lastInteractionAt on the parent lead (staleness tracking)
    await db
      .update(leads)
      .set({ lastInteractionAt: now })
      .where(eq(leads.id, req.params.leadId));

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Gagal tambah interaksi" });
  }
});

router.delete("/interactions/:id", async (req, res) => {
  try {
    await db.delete(leadInteractions).where(eq(leadInteractions.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Gagal hapus interaksi" });
  }
});

// ─── Per-lead follow-ups ──────────────────────────────────────────────────────

router.get("/leads/:leadId/follow-ups", async (req, res) => {
  try {
    const data = await db
      .select()
      .from(leadFollowUps)
      .where(eq(leadFollowUps.leadId, req.params.leadId))
      .orderBy(asc(leadFollowUps.followUpDate));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil follow-ups" });
  }
});

router.post("/leads/:leadId/follow-ups", async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const [data] = await db.insert(leadFollowUps).values({
      ...req.body,
      id,
      leadId: req.params.leadId,
      createdAt: new Date(),
    }).returning();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Gagal buat follow-up" });
  }
});

router.patch("/follow-ups/:id", async (req, res) => {
  try {
    const [data] = await db.update(leadFollowUps).set(req.body).where(eq(leadFollowUps.id, req.params.id)).returning();
    if (!data) return res.status(404).json({ error: "Follow-up tidak ditemukan" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Gagal update follow-up" });
  }
});

router.delete("/follow-ups/:id", async (req, res) => {
  try {
    await db.delete(leadFollowUps).where(eq(leadFollowUps.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Gagal hapus follow-up" });
  }
});

// ─── Stats ────────────────────────────────────────────────────────────────────

router.get("/stats", async (_req, res) => {
  try {
    const [allLeads, allFollowUps] = await Promise.all([
      db.select().from(leads),
      db.select().from(leadFollowUps),
    ]);
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

    const stats = {
      total: allLeads.length,
      byStatus: Object.fromEntries(
        ["new", "contacted", "interested", "negotiation", "converted", "lost"].map((s) => [
          s,
          allLeads.filter((l) => l.status === s).length,
        ]),
      ),
      pendingFollowUps: allFollowUps.filter((f) => !f.isDone).length,
      overdueFollowUps: allFollowUps.filter(
        (f) => !f.isDone && f.followUpDate && new Date(f.followUpDate) < todayStart,
      ).length,
      todayFollowUps: allFollowUps.filter((f) => {
        if (f.isDone || !f.followUpDate) return false;
        const d = new Date(f.followUpDate);
        return d >= todayStart && d <= now;
      }).length,
      conversionRate:
        allLeads.length > 0
          ? Math.round((allLeads.filter((l) => l.status === "converted").length / allLeads.length) * 100)
          : 0,
      repeatCustomers: allLeads.filter((l) => l.isRepeatCustomer).length,
    };

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil statistik CRM" });
  }
});

export default router;
