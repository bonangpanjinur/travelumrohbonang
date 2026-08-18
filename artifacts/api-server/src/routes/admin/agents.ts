import { Router } from "express";
import { db, agents, agentCommissions, agentWithdrawals, affiliateClicks, userRoles, eq, desc, and, inArray } from "@workspace/db";
import { requireSuperAdmin } from "../../middlewares/requireAdmin";
import { journalCommissionWithdrawal } from "../../lib/autoJournal";
import { resolveUserScope } from "../../lib/scopeGuard";

const router = Router();

async function agentIdsForScope(scope: Awaited<ReturnType<typeof resolveUserScope>>) {
  if (scope.type === "global") return null;
  if (scope.type === "agent") return scope.agentId ? [scope.agentId] : [];
  if (!scope.branchId) return [];
  const rows = await db.select({ id: agents.id }).from(agents).where(eq(agents.branchId, scope.branchId));
  return rows.map((row) => row.id);
}

async function agentInScope(agentId: string, scope: Awaited<ReturnType<typeof resolveUserScope>>) {
  const ids = await agentIdsForScope(scope);
  return ids === null || ids.includes(agentId);
}

// Agents
router.get("/", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const ids = await agentIdsForScope(scope);
    const data = ids === null ? await db.select().from(agents) : ids.length ? await db.select().from(agents).where(inArray(agents.id, ids)) : [];
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
    const scope = await resolveUserScope(req);
    const existing = await db.select({ id: agents.id }).from(agents).where(eq(agents.id, req.params.id)).limit(1);
    if (!existing[0] || !(await agentInScope(existing[0].id, scope))) return res.status(404).json({ error: "Agent not found" });
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
    const scope = await resolveUserScope(req);
    if (!(await agentInScope(req.params.id, scope))) return res.status(404).json({ error: "Agent not found" });
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
    const scope = await resolveUserScope(req);
    const ids = await agentIdsForScope(scope);
    const query = ids === null
      ? db.select().from(agentCommissions).orderBy(desc(agentCommissions.createdAt))
      : ids.length ? db.select().from(agentCommissions).where(inArray(agentCommissions.agentId, ids)).orderBy(desc(agentCommissions.createdAt)) : Promise.resolve([]);
    const data = await query;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch commissions" });
  }
});

router.patch("/commissions/:id", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const [commission] = await db.select({ agentId: agentCommissions.agentId }).from(agentCommissions).where(eq(agentCommissions.id, req.params.id)).limit(1);
    if (!commission || !(await agentInScope(commission.agentId, scope))) return res.status(404).json({ error: "Komisi tidak ditemukan" });
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
    const scope = await resolveUserScope(req);
    const ids = await agentIdsForScope(scope);
    if (ids !== null && ids.length === 0) return res.json([]);
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
      .where(ids === null ? undefined : inArray(agentWithdrawals.agentId, ids))
      .orderBy(desc(agentWithdrawals.createdAt));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch withdrawals" });
  }
});

// Status machine untuk withdrawal: transisi yang diizinkan
const WITHDRAWAL_TRANSITIONS: Record<string, string[]> = {
  requested: ["approved", "rejected"],
  approved:  ["paid", "rejected"],
  // paid & rejected adalah terminal
};

router.patch("/withdrawals/:id", async (req, res) => {
  try {
    const { status, adminNotes, proofUrl } = req.body as {
      status?: "requested" | "approved" | "rejected" | "paid";

      adminNotes?: string;
      proofUrl?: string;
    };
    const adminId = (req as any).user?.id as string | undefined;

    const scope = await resolveUserScope(req);
    // Ambil data withdrawal sebelum update (untuk jurnal dan state-machine check)
    const [before] = await db
      .select({ agentId: agentWithdrawals.agentId, amount: agentWithdrawals.amount, status: agentWithdrawals.status })
      .from(agentWithdrawals)
      .where(eq(agentWithdrawals.id, req.params.id))
      .limit(1);

    if (!before) return res.status(404).json({ error: "Withdrawal not found" });
    if (!(await agentInScope(before.agentId, scope))) return res.status(404).json({ error: "Withdrawal not found" });

    // State-machine — tolak transisi yang tidak diizinkan
    if (status && status !== before.status) {
      const allowedNext = WITHDRAWAL_TRANSITIONS[before.status ?? ""] ?? [];
      if (!allowedNext.includes(status)) {
        return res.status(409).json({
          error: `Tidak dapat mengubah status withdrawal dari '${before.status}' ke '${status}'. Transisi yang diizinkan: ${allowedNext.join(", ") || "tidak ada"}`,
        });
      }
    }

    const [data] = await db
      .update(agentWithdrawals)
      .set({
        ...(status !== undefined ? { status } : {}),
        ...(adminNotes !== undefined ? { adminNotes } : {}),
        ...(proofUrl !== undefined ? { proofUrl } : {}),
        ...(status === "paid" || status === "approved" || status === "rejected"
          ? { processedAt: new Date(), processedBy: adminId ?? null }
          : {}),
      })
      .where(eq(agentWithdrawals.id, req.params.id))
      .returning();
    if (!data) return res.status(404).json({ error: "Withdrawal not found" });

    // F-6: Auto-posting jurnal komisi withdrawal (fire-and-forget)
    if (status === "paid" && before?.status !== "paid" && before?.agentId && before?.amount != null) {
      void journalCommissionWithdrawal({
        agentId:      before.agentId,
        amount:       Number(before.amount),
        withdrawalId: req.params.id,
        adminId,
      });
    }

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
