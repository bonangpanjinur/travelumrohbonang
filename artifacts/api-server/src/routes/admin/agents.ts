import { Router } from "express";
import { db, agents, agentCommissions, agentWithdrawals, affiliateClicks, userRoles, eq, desc } from "@workspace/db";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// Agents
router.get("/", async (req, res) => {
  try {
    const data = await db.select().from(agents);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch agents" });
  }
});

router.post("/", async (req, res) => {
  try {
    const id = uuidv4();
    const [data] = await db.insert(agents).values({
      ...req.body,
      id,
      createdAt: new Date(),
    }).returning();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to create agent" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const [data] = await db.update(agents).set(req.body).where(eq(agents.id, req.params.id)).returning();
    if (!data) return res.status(404).json({ error: "Agent not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to update agent" });
  }
});

// Commissions
router.get("/commissions", async (req, res) => {
  try {
    const data = await db.select().from(agentCommissions).orderBy(desc(agentCommissions.createdAt));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch commissions" });
  }
});

router.patch("/commissions/:id", async (req, res) => {
  try {
    const [data] = await db.update(agentCommissions).set(req.body).where(eq(agentCommissions.id, req.params.id)).returning();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to update commission" });
  }
});

// Withdrawals
router.get("/withdrawals", async (req, res) => {
  try {
    const data = await db.select().from(agentWithdrawals).orderBy(desc(agentWithdrawals.createdAt));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch withdrawals" });
  }
});

router.patch("/withdrawals/:id", async (req, res) => {
  try {
    const [data] = await db.update(agentWithdrawals).set(req.body).where(eq(agentWithdrawals.id, req.params.id)).returning();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to update withdrawal" });
  }
});

// Affiliate Clicks
router.get("/affiliate-clicks", async (req, res) => {
  try {
    const data = await db.select().from(affiliateClicks).orderBy(desc(affiliateClicks.createdAt));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch affiliate clicks" });
  }
});

// User Roles (Management)
router.get("/roles", async (req, res) => {
  try {
    const data = await db.select().from(userRoles);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user roles" });
  }
});

router.post("/roles", async (req, res) => {
  try {
    const id = uuidv4();
    const [data] = await db.insert(userRoles).values({
      ...req.body,
      id,
      createdAt: new Date(),
    }).returning();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to create user role" });
  }
});

router.delete("/roles/:id", async (req, res) => {
  try {
    await db.delete(userRoles).where(eq(userRoles.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user role" });
  }
});

export default router;
