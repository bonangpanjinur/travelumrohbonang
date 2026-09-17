import { Router } from "express";
import { db, agents, branches, eq } from "@workspace/db";
import { sql } from "drizzle-orm";
import { resolveUserScope } from "../../lib/scopeGuard";

const router = Router();

function codeFromBranchName(name: string) {
  const words = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toUpperCase().match(/[A-Z0-9]+/g) || [];
  const initials = words.length > 1 ? words.map((word) => word[0]).join("") : (words[0] || "CABANG");
  return initials.slice(0, 8) || "CABANG";
}

async function generateBranchCode(name: string, requestedCode?: unknown, currentId?: string) {
  const manualCode = String(requestedCode ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20);
  const base = manualCode || codeFromBranchName(name);
  let candidate = base;
  let suffix = 2;
  while (true) {
    const [existing] = await db.select({ id: branches.id }).from(branches).where(eq(branches.code, candidate)).limit(1);
    if (!existing || existing.id === currentId) return candidate;
    candidate = `${base.slice(0, Math.max(1, 20 - String(suffix).length))}${suffix}`;
    suffix += 1;
  }
}

async function branchIdsForScope(scope: Awaited<ReturnType<typeof resolveUserScope>>) {
  if (scope.type === "global") return null;
  if (scope.type === "branch") return scope.branchId ? [scope.branchId] : [];
  if (!scope.agentId) return [];
  const [agent] = await db.select({ branchId: agents.branchId }).from(agents).where(eq(agents.id, scope.agentId)).limit(1);
  return agent?.branchId ? [agent.branchId] : [];
}

async function selectLegacyBranches(ids: string[] | null) {
  const rows = await db.execute(sql`
    SELECT id, code, name, slug, address, phone, email, city, region,
      postal_code, country, latitude, longitude, opening_hours,
      image_url, map_url, description, is_active, created_at
    FROM branches
    ${ids === null ? sql`` : sql`WHERE id = ANY(${ids}::text[])`}
  `);
  return (rows as any[]).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    slug: row.slug,
    address: row.address,
    phone: row.phone,
    email: row.email,
    city: row.city,
    region: row.region,
    provinceCode: null,
    regencyCode: null,
    district: null,
    districtCode: null,
    village: null,
    villageCode: null,
    postalCode: row.postal_code,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    openingHours: row.opening_hours,
    imageUrl: row.image_url,
    mapUrl: row.map_url,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
  }));
}

async function attachAgentCounts<T extends { id: string }>(rows: T[]) {
  const counts = await db.execute(sql`
    SELECT branch_id, count(*)::int AS agent_count
    FROM agents
    WHERE branch_id IS NOT NULL
    GROUP BY branch_id
  `);
  const countByBranch = new Map(
    ((counts as any).rows ?? counts).map((row: any) => [
      row.branch_id,
      Number(row.agent_count || 0),
    ]),
  );
  return rows.map((row) => ({
    ...row,
    agentCount: countByBranch.get(row.id) || 0,
  }));
}

router.get("/", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const ids = await branchIdsForScope(scope);
    let data;
    try {
      data = ids === null
        ? await db.select().from(branches)
        : ids.length
          ? await db.select().from(branches).where(eq(branches.id, ids[0]))
          : [];
    } catch (queryError) {
      console.error("[admin/branches] current schema query failed; using legacy-compatible read:", queryError);
      data = await selectLegacyBranches(ids);
    }
    res.json(await attachAgentCounts(data));
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
      code: await generateBranchCode(String(req.body?.name || "Cabang"), req.body?.code),
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
    const { id: _id, isActive: _isActive, ...requestedUpdates } = req.body as Record<string, unknown>;
    const { code: _code, ...managerUpdates } = requestedUpdates;
    const updates = scope.type === "global"
      ? { ...requestedUpdates, code: await generateBranchCode(String(requestedUpdates.name || "Cabang"), requestedUpdates.code, req.params.id) }
      : managerUpdates;
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
    const agentRows = await db.execute(sql`
      SELECT count(*)::int AS agent_count
      FROM agents
      WHERE branch_id = ${req.params.id}
    `);
    const agentCount = Number(((agentRows as any).rows ?? agentRows)[0]?.agent_count || 0);
    if (agentCount > 0) {
      return res.status(409).json({
        error: `Cabang masih memiliki ${agentCount} agen. Pindahkan agen terlebih dahulu sebelum menghapus cabang.`,
      });
    }
    await db.delete(branches).where(eq(branches.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete branch" });
  }
});

export default router;
