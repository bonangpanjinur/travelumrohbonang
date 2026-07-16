import { Router } from "express";
import { db, agents, agentCommissions, agentWithdrawals, affiliateClicks, userRoles, eq, desc } from "@workspace/db";
import { requireSuperAdmin } from "../../middlewares/requireAdmin";

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
    const id = crypto.randomUUID();
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
    // Strip immutable fields to prevent accidental overwrite of PK / createdAt
    const { id: _id, createdAt: _createdAt, ...updates } = req.body;
    const [data] = await db.update(agents).set(updates).where(eq(agents.id, req.params.id)).returning();
    if (!data) return res.status(404).json({ error: "Agent not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to update agent" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(agents).where(eq(agents.id, req.params.id as string)).returning();
    if (!deleted) return res.status(404).json({ error: "Agent not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete agent" });
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
    // Join with agents to get agent name/email for display
    const data = await db
      .select({
        id: agentWithdrawals.id,
        agentId: agentWithdrawals.agentId,
        amount: agentWithdrawals.amount,
        status: agentWithdrawals.status,
        bankName: agentWithdrawals.bankName,
        bankAccount: agentWithdrawals.bankAccount,
        accountHolder: agentWithdrawals.accountHolder,
        notes: agentWithdrawals.notes,
        adminNotes: agentWithdrawals.adminNotes,
        proofUrl: agentWithdrawals.proofUrl,
        processedBy: agentWithdrawals.processedBy,
        processedAt: agentWithdrawals.processedAt,
        createdAt: agentWithdrawals.createdAt,
        agentName: agents.name,
        agentEmail: agents.email,
        agentPhone: agents.phone,
      })
      .from(agentWithdrawals)
      .leftJoin(agents, eq(agentWithdrawals.agentId, agents.id))
      .orderBy(desc(agentWithdrawals.createdAt));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch withdrawals" });
  }
});

router.patch("/withdrawals/:id", async (req, res) => {
  try {
    const { status, adminNotes, proofUrl } = req.body as {
      status?: string;
      adminNotes?: string;
      proofUrl?: string;
    };
    const [data] = await db
      .update(agentWithdrawals)
      .set({
        ...(status !== undefined ? { status } : {}),
        ...(adminNotes !== undefined ? { adminNotes } : {}),
        ...(proofUrl !== undefined ? { proofUrl } : {}),
        ...(status === "paid" || status === "approved" || status === "rejected"
          ? { processedAt: new Date() }
          : {}),
      })
      .where(eq(agentWithdrawals.id, req.params.id))
      .returning();
    if (!data) return res.status(404).json({ error: "Withdrawal not found" });
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

// User Roles (Management) — read available to all admins, write is super_admin only
router.get("/roles", async (_req, res) => {
  try {
    const data = await db.select().from(userRoles);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user roles" });
  }
});

router.post("/roles", requireSuperAdmin, async (req, res) => {
  try {
    const id = crypto.randomUUID();
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

router.delete("/roles/:id", requireSuperAdmin, async (req, res) => {
  try {
    const [deleted] = await db.delete(userRoles).where(eq(userRoles.id, req.params.id as string)).returning();
    if (!deleted) return res.status(404).json({ error: "User role not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user role" });
  }
});

export default router;
