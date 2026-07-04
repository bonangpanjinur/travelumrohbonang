import { Router } from "express";
import { db, leads, leadFollowUps, eq, desc } from "@workspace/db";

const router = Router();

// Leads
router.get("/leads", async (req, res) => {
  try {
    const data = await db.select().from(leads).orderBy(desc(leads.createdAt));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leads" });
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
    res.status(500).json({ error: "Failed to create lead" });
  }
});

router.patch("/leads/:id", async (req, res) => {
  try {
    const [data] = await db.update(leads).set(req.body).where(eq(leads.id, req.params.id)).returning();
    if (!data) return res.status(404).json({ error: "Lead not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to update lead" });
  }
});

router.delete("/leads/:id", async (req, res) => {
  try {
    await db.delete(leads).where(eq(leads.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete lead" });
  }
});

// Follow ups
router.get("/leads/:leadId/follow-ups", async (req, res) => {
  try {
    const data = await db.select().from(leadFollowUps).where(eq(leadFollowUps.leadId, req.params.leadId)).orderBy(desc(leadFollowUps.createdAt));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch follow ups" });
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
    res.status(500).json({ error: "Failed to create follow up" });
  }
});

router.patch("/follow-ups/:id", async (req, res) => {
  try {
    const [data] = await db.update(leadFollowUps).set(req.body).where(eq(leadFollowUps.id, req.params.id)).returning();
    if (!data) return res.status(404).json({ error: "Follow up not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to update follow up" });
  }
});

router.delete("/follow-ups/:id", async (req, res) => {
  try {
    await db.delete(leadFollowUps).where(eq(leadFollowUps.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete follow up" });
  }
});

export default router;
