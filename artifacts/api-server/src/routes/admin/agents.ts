import { Router } from "express";
import { db, agents, branches, agentCommissions, agentWithdrawals, affiliateClicks, userRoles, eq, desc, and, inArray, like } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireSuperAdmin } from "../../middlewares/requireAdmin";
import { journalCommissionWithdrawal } from "../../lib/autoJournal";
import { resolveUserScope } from "../../lib/scopeGuard";

const router = Router();

const ALLOWED_GENDERS = new Set(["L", "P"]);

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function shortCode() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
}

async function generateAgentCode(branchId: string | null) {
  const year = new Date().getFullYear().toString().slice(-2);
  let branchCode = "HQ";
  if (branchId) {
    const [branch] = await db.select({ code: branches.code }).from(branches).where(eq(branches.id, branchId)).limit(1);
    branchCode = String(branch?.code || "HQ").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 12) || "HQ";
  }
  const prefix = `A%${branchCode}${year}`;
  const existing = await db.select({ agentCode: agents.agentCode }).from(agents).where(like(agents.agentCode, prefix));
  const used = new Set(existing.map((row) => row.agentCode).filter(Boolean));
  let sequence = 1;
  let candidate = "";
  do {
    candidate = `A${String(sequence).padStart(3, "0")}${branchCode}${year}`;
    sequence += 1;
  } while (used.has(candidate));
  return candidate;
}

function normalizeAgentPayload(body: Record<string, unknown>, existingName?: string, generatedAgentCode?: string) {
  const name = String(body.name ?? existingName ?? "").trim();
  if (!name) throw new Error("Nama agen wajib diisi");
  const gender = body.gender == null || body.gender === "" ? null : String(body.gender).toUpperCase();
  if (gender && !ALLOWED_GENDERS.has(gender)) throw new Error("Gender harus L atau P");
  const dateOfBirth = body.dateOfBirth == null || body.dateOfBirth === "" ? null : String(body.dateOfBirth);
  if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) throw new Error("Tanggal lahir harus berformat YYYY-MM-DD");
  const requestedSlug = body.publicSlug == null || body.publicSlug === "" ? slugify(name) : slugify(String(body.publicSlug));
  const agentCode = body.agentCode == null || body.agentCode === "" ? (generatedAgentCode || `AG-${shortCode()}`) : String(body.agentCode).trim().toUpperCase().replace(/\s+/g, "-").slice(0, 40);
  const referralCode = body.referralCode == null || body.referralCode === "" ? agentCode : String(body.referralCode).trim().toUpperCase().replace(/\s+/g, "").slice(0, 40);
  const commissionPercent = body.commissionPercent == null || body.commissionPercent === "" ? 0 : Number(body.commissionPercent);
  if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) throw new Error("Komisi harus berada di antara 0 sampai 100 persen");
  return {
    name,
    agentCode: agentCode || null,
    gender,
    address: body.address == null || body.address === "" ? null : String(body.address).trim().slice(0, 500),
    dateOfBirth,
    phone: body.phone == null || body.phone === "" ? null : String(body.phone).trim().slice(0, 40),
    email: body.email == null || body.email === "" ? null : String(body.email).trim().toLowerCase().slice(0, 160),
    photoUrl: body.photoUrl == null || body.photoUrl === "" ? null : String(body.photoUrl).trim().slice(0, 1000),
    joinedAt: body.joinedAt == null || body.joinedAt === "" ? null : String(body.joinedAt),
    bannerIdCardUrl: body.bannerIdCardUrl == null || body.bannerIdCardUrl === "" ? null : String(body.bannerIdCardUrl).trim().slice(0, 1000),
    mouNumber: body.mouNumber == null || body.mouNumber === "" ? null : String(body.mouNumber).trim().slice(0, 100),
    validUntil: body.validUntil == null || body.validUntil === "" ? null : String(body.validUntil),
    referralCode: referralCode || null,
    publicSlug: requestedSlug || `agen-${shortCode().toLowerCase()}`,
    publicDescription: body.publicDescription == null || body.publicDescription === "" ? null : String(body.publicDescription).trim().slice(0, 500),
    publicPageEnabled: body.publicPageEnabled !== false,
    branchId: body.branchId == null || body.branchId === "" ? null : String(body.branchId),
    commissionPercent: commissionPercent.toFixed(2),
    monthlyTarget: body.monthlyTarget == null || body.monthlyTarget === "" ? null : Number(body.monthlyTarget),
    isActive: body.isActive !== false,
    ...(body.userId ? { userId: String(body.userId) } : {}),
  };
}

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

async function canCreateAgent(req: any, branchId: string | null, scope: Awaited<ReturnType<typeof resolveUserScope>>) {
  if (req.user?.role === "agent") return false;
  if (scope.type === "global") return true;
  return scope.type === "branch" && !!scope.branchId && branchId === scope.branchId;
}

/**
 * Production databases can briefly lag behind the application deploy while the
 * Supabase migration is being applied. Keep the read path compatible with the
 * previous agents schema so existing agents remain visible instead of returning
 * a generic 500 error.
 */
async function selectLegacyAgents(ids: string[] | null) {
  const rows = await db.execute(sql`
    SELECT id, user_id, branch_id, agent_code, name, gender, address,
      date_of_birth, phone, email, photo_url, referral_code, public_slug,
      public_description, public_page_enabled, commission_percent,
      monthly_target, is_active, created_at
    FROM agents
    ${ids === null ? sql`` : sql`WHERE id = ANY(${ids}::text[])`}
  `);
  return (rows as any[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    branchId: row.branch_id,
    agentCode: row.agent_code,
    name: row.name,
    gender: row.gender,
    address: row.address,
    dateOfBirth: row.date_of_birth,
    phone: row.phone,
    email: row.email,
    photoUrl: row.photo_url,
    joinedAt: null,
    bannerIdCardUrl: null,
    mouNumber: null,
    validUntil: null,
    referralCode: row.referral_code,
    publicSlug: row.public_slug,
    publicDescription: row.public_description,
    publicPageEnabled: row.public_page_enabled,
    commissionPercent: row.commission_percent,
    monthlyTarget: row.monthly_target,
    isActive: row.is_active,
    createdAt: row.created_at,
  }));
}

// Agents
router.get("/", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const ids = await agentIdsForScope(scope);
    let data;
    try {
      data = ids === null ? await db.select().from(agents) : ids.length ? await db.select().from(agents).where(inArray(agents.id, ids)) : [];
    } catch (queryError) {
      console.error("[admin/agents] current schema query failed; using legacy-compatible read:", queryError);
      data = await selectLegacyAgents(ids);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch agents" });
  }
});

router.post("/", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const requestedBranchId = req.body?.branchId == null || req.body?.branchId === "" ? null : String(req.body.branchId);
    if (!(await canCreateAgent(req, requestedBranchId, scope))) {
      return res.status(403).json({ error: "Anda hanya dapat mengelola agen pada scope Anda" });
    }
    const id = crypto.randomUUID();
    const generatedAgentCode = await generateAgentCode(requestedBranchId);
    const [data] = await db.insert(agents).values({
      ...normalizeAgentPayload(req.body as Record<string, unknown>, undefined, generatedAgentCode),
      id,
      createdAt: new Date(),
    }).returning();
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create agent";
    res.status(message.includes("wajib") || message.includes("harus") || message.includes("Komisi") ? 400 : 500).json({ error: message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    if (req.user?.role === "agent" && req.body?.branchId !== undefined) {
      return res.status(403).json({ error: "Agen tidak dapat memindahkan agen ke cabang lain" });
    }
    const existing = await db.select().from(agents).where(eq(agents.id, req.params.id)).limit(1);
    if (!existing[0] || !(await agentInScope(existing[0].id, scope))) return res.status(404).json({ error: "Agent not found" });
    // Strip immutable fields to prevent accidental overwrite of PK / createdAt
    const { id: _id, createdAt: _createdAt, ...body } = req.body as Record<string, unknown>;
    const mergedAgent = { ...existing[0], ...body };
    const generatedAgentCode = mergedAgent.agentCode ? undefined : await generateAgentCode(mergedAgent.branchId ? String(mergedAgent.branchId) : null);
    const updates = normalizeAgentPayload(mergedAgent, existing[0].name, generatedAgentCode);
    const [data] = await db.update(agents).set(updates).where(eq(agents.id, req.params.id)).returning();
    if (!data) return res.status(404).json({ error: "Agent not found" });
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update agent";
    res.status(message.includes("wajib") || message.includes("harus") || message.includes("Komisi") ? 400 : 500).json({ error: message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (req.user?.role === "agent") return res.status(403).json({ error: "Agen tidak dapat menghapus data agen" });
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
    const scope = await resolveUserScope(req);
    const ids = await agentIdsForScope(scope);
    const data = ids === null
      ? await db.select().from(affiliateClicks).orderBy(desc(affiliateClicks.createdAt))
      : ids.length
        ? await db.select().from(affiliateClicks).where(inArray(affiliateClicks.agentId, ids)).orderBy(desc(affiliateClicks.createdAt))
        : [];
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
