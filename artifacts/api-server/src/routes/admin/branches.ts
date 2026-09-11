import { Router } from "express";
import { db, agents, branches, eq } from "@workspace/db";
import { resolveUserScope } from "../../lib/scopeGuard";

const router = Router();

async function branchIdsForScope(scope: Awaited<ReturnType<typeof resolveUserScope>>) {
  if (scope.type === "global") return null;
  if (scope.type === "branch") return scope.branchId ? [scope.branchId] : [];
  if (!scope.agentId) return [];
  const [agent] = await db.select({ branchId: agents.branchId }).from(agents).where(eq(agents.id, scope.agentId)).limit(1);
  return agent?.branchId ? [agent.branchId] : [];
}

router.get("/", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const ids = await branchIdsForScope(scope);
    const data = ids === null
      ? await db.select().from(branches)
      : ids.length
        ? await db.select().from(branches).where(eq(branches.id, ids[0]))
        : [];
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch branches" });
  }
});

router.post("/", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    if (scope.type !== "global") return res.status(403).json({ error: "Hanya admin pusat yang dapat membuat cabang" });
    const id = crypto.randomUUID();
    const [data] = await db.insert(branches).values({
      ...req.body,
      id,
      createdAt: new Date(),
    }).returning();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to create branch" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const ids = await branchIdsForScope(scope);
    if (ids !== null && !ids.includes(req.params.id)) return res.status(404).json({ error: "Branch not found" });
    if (scope.type !== "global" && req.user?.role !== "branch_manager") {
      return res.status(403).json({ error: "Staf hanya dapat melihat data cabang" });
    }
    const { id: _id, code: _code, isActive: _isActive, ...managerUpdates } = req.body as Record<string, unknown>;
    const updates = scope.type === "global" ? req.body : managerUpdates;
    const [data] = await db.update(branches).set(updates).where(eq(branches.id, req.params.id)).returning();
    if (!data) return res.status(404).json({ error: "Branch not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to update branch" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    if (scope.type !== "global") return res.status(403).json({ error: "Hanya admin pusat yang dapat menghapus cabang" });
    await db.delete(branches).where(eq(branches.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete branch" });
  }
});

export default router;
