import { Router } from "express";
import {
  db,
  agents,
  branches,
  agentCommissions,
  agentWithdrawals,
  affiliateClicks,
  userRoles,
  eq,
  desc,
  and,
  inArray,
} from "@workspace/db";
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

function parseIsoDate(value: unknown, label: string) {
  if (value == null || value === "") return null;
  const candidate = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate))
    throw new Error(`${label} harus berformat YYYY-MM-DD`);
  const parsed = new Date(`${candidate}T00:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== candidate
  )
    throw new Error(`${label} bukan tanggal yang valid`);
  return candidate;
}

async function generateAgentCode(branchId: string | null, client = db) {
  const year = new Date().getFullYear().toString().slice(-2);
  // Agen tanpa branchId memakai identitas kantor pusat VINS.
  let branchCode = "VINS";
  let referralBase = "VINS";
  if (branchId) {
    const [branch] = await client
      .select({ code: branches.code, name: branches.name })
      .from(branches)
      .where(eq(branches.id, branchId))
      .limit(1);
    const fromName = String(branch?.name || "CABANG")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase();
    const configuredCode = String(branch?.code || "")
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase();
    const isHeadOffice =
      /KANTORPU(SAT)?|PUSAT/i.test(fromName) || configuredCode === "VINS";
    if (isHeadOffice) {
      branchCode = "VINSU";
      referralBase = "VINS";
    } else {
      branchCode =
        configuredCode.slice(0, 12) || fromName.slice(0, 8) || "CABANG";
      referralBase = branchCode;
    }
  }
  // The sequence is deliberately global for the year. Filtering by branch here
  // used to produce A001 for every branch (and VINS/VINSU was also split), which
  // made the directory show duplicate-looking agent numbers. The transaction
  // lock in the create handler makes this read/increment operation atomic.
  const [last] = (await client.execute(sql`
    SELECT COALESCE(MAX(sequence), 0) AS sequence
    FROM (
      SELECT substring(agent_code from '^A([0-9]{3})')::integer AS sequence
      FROM agents
      WHERE agent_code ~ ${`^A[0-9]{3}[A-Z0-9]+${year}$`}
      UNION ALL
      SELECT substring(referral_code from '^A([0-9]{3})')::integer AS sequence
      FROM agents
      WHERE referral_code ~ ${`^A[0-9]{3}[A-Z0-9]+${year}$`}
    ) used_sequences
  `)) as any[];
  const sequence = Number(last?.sequence || 0) + 1;
  const candidate = `A${String(sequence).padStart(3, "0")}${branchCode}${year}`;
  const referralCode = `A${String(sequence).padStart(3, "0")}${referralBase}${year}`;
  return { agentCode: candidate, referralCode };
}

function normalizeAgentPayload(
  body: Record<string, unknown>,
  existingName?: string,
  generated?: { agentCode: string; referralCode: string },
) {
  const name = String(body.name ?? existingName ?? "").trim();
  if (!name) throw new Error("Nama agen wajib diisi");
  const gender =
    body.gender == null || body.gender === ""
      ? null
      : String(body.gender).toUpperCase();
  if (gender && !ALLOWED_GENDERS.has(gender))
    throw new Error("Gender harus L atau P");
  const dateOfBirth = parseIsoDate(body.dateOfBirth, "Tanggal lahir");
  const requestedSlug =
    body.publicSlug == null || body.publicSlug === ""
      ? slugify(name)
      : slugify(String(body.publicSlug));
  const agentCode =
    body.agentCode == null || body.agentCode === ""
      ? generated?.agentCode || `AG-${shortCode()}`
      : String(body.agentCode)
          .trim()
          .toUpperCase()
          .replace(/\s+/g, "-")
          .slice(0, 40);
  const referralCode =
    body.referralCode == null || body.referralCode === ""
      ? generated?.referralCode || agentCode
      : String(body.referralCode)
          .trim()
          .toUpperCase()
          .replace(/\s+/g, "")
          .slice(0, 40);
  const commissionPercent =
    body.commissionPercent == null || body.commissionPercent === ""
      ? 0
      : Number(body.commissionPercent);
  if (
    !Number.isFinite(commissionPercent) ||
    commissionPercent < 0 ||
    commissionPercent > 100
  )
    throw new Error("Komisi harus berada di antara 0 sampai 100 persen");
  const joinedAt = parseIsoDate(body.joinedAt, "Tanggal bergabung");
  const validUntil = parseIsoDate(body.validUntil, "Masa berlaku");
  if (joinedAt && validUntil && validUntil < joinedAt)
    throw new Error(
      "Masa berlaku tidak boleh lebih awal dari tanggal bergabung",
    );
  return {
    name,
    agentCode: agentCode || null,
    gender,
    address:
      body.address == null || body.address === ""
        ? null
        : String(body.address).trim().slice(0, 500),
    dateOfBirth,
    phone:
      body.phone == null || body.phone === ""
        ? null
        : String(body.phone).trim().slice(0, 40),
    email:
      body.email == null || body.email === ""
        ? null
        : String(body.email).trim().toLowerCase().slice(0, 160),
    photoUrl:
      body.photoUrl == null || body.photoUrl === ""
        ? null
        : String(body.photoUrl).trim().slice(0, 1000),
    joinedAt,
    bannerIdCardUrl:
      body.bannerIdCardUrl == null || body.bannerIdCardUrl === ""
        ? null
        : String(body.bannerIdCardUrl).trim().slice(0, 1000),
    mouNumber:
      body.mouNumber == null || body.mouNumber === ""
        ? null
        : String(body.mouNumber).trim().slice(0, 100),
    validUntil,
    referralCode: referralCode || null,
    publicSlug: requestedSlug || `agen-${shortCode().toLowerCase()}`,
    publicDescription:
      body.publicDescription == null || body.publicDescription === ""
        ? null
        : String(body.publicDescription).trim().slice(0, 500),
    publicPageEnabled: body.publicPageEnabled !== false,
    branchId:
      body.branchId == null || body.branchId === ""
        ? null
        : String(body.branchId),
    commissionPercent: commissionPercent.toFixed(2),
    monthlyTarget:
      body.monthlyTarget == null || body.monthlyTarget === ""
        ? null
        : Number(body.monthlyTarget),
    isActive: body.isActive !== false,
    ...(body.userId ? { userId: String(body.userId) } : {}),
  };
}

async function agentIdsForScope(
  scope: Awaited<ReturnType<typeof resolveUserScope>>,
) {
  if (scope.type === "global") return null;
  if (scope.type === "agent") return scope.agentId ? [scope.agentId] : [];
  if (!scope.branchId) return [];
  const rows = await db
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.branchId, scope.branchId));
  return rows.map((row: { id: string }) => row.id);
}

async function agentInScope(
  agentId: string,
  scope: Awaited<ReturnType<typeof resolveUserScope>>,
) {
  const ids = await agentIdsForScope(scope);
  return ids === null || ids.includes(agentId);
}

async function canCreateAgent(
  req: any,
  branchId: string | null,
  scope: Awaited<ReturnType<typeof resolveUserScope>>,
) {
  if (req.user?.role === "agent") return false;
  if (scope.type === "global") return true;
  return (
    scope.type === "branch" && !!scope.branchId && branchId === scope.branchId
  );
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
      data =
        ids === null
          ? await db.select().from(agents)
          : ids.length
            ? await db.select().from(agents).where(inArray(agents.id, ids))
            : [];
    } catch (queryError) {
      console.error(
        "[admin/agents] current schema query failed; using legacy-compatible read:",
        queryError,
      );
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
    const requestedBranchId =
      req.body?.branchId == null || req.body?.branchId === ""
        ? null
        : String(req.body.branchId);
    if (!(await canCreateAgent(req, requestedBranchId, scope))) {
      return res
        .status(403)
        .json({ error: "Anda hanya dapat mengelola agen pada scope Anda" });
    }
    // Serialize generated-code allocation per year. The unique index remains
    // the final safety net, while this prevents two concurrent requests from
    // both observing the same MAX(sequence).
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const data = await db.transaction(async (tx: any) => {
          await tx.execute(
            sql`SELECT pg_advisory_xact_lock(hashtext('agents:code:${new Date().getFullYear()}'))`,
          );
          const generated = await generateAgentCode(requestedBranchId, tx);
          const [created] = await tx
            .insert(agents)
            .values({
              ...normalizeAgentPayload(
                req.body as Record<string, unknown>,
                undefined,
                generated,
              ),
              id: crypto.randomUUID(),
              createdAt: new Date(),
            })
            .returning();
          return created;
        });
        return res.json(data);
      } catch (error) {
        // A manually supplied code can still race with another insert. Retry
        // only database unique violations; validation errors must be returned.
        if ((error as { code?: string })?.code !== "23505" || attempt === 2)
          throw error;
      }
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create agent";
    res
      .status(
        message.includes("wajib") ||
          message.includes("harus") ||
          message.includes("Komisi")
          ? 400
          : 500,
      )
      .json({ error: message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    if (req.user?.role === "agent" && req.body?.branchId !== undefined) {
      return res
        .status(403)
        .json({ error: "Agen tidak dapat memindahkan agen ke cabang lain" });
    }
    const existing = await db
      .select()
      .from(agents)
      .where(eq(agents.id, req.params.id))
      .limit(1);
    if (!existing[0] || !(await agentInScope(existing[0].id, scope)))
      return res.status(404).json({ error: "Agent not found" });
    // Strip immutable fields to prevent accidental overwrite of PK / createdAt
    const {
      id: _id,
      createdAt: _createdAt,
      ...body
    } = req.body as Record<string, unknown>;
    const mergedAgent = { ...existing[0], ...body };
    const generated = mergedAgent.agentCode
      ? undefined
      : await generateAgentCode(
          mergedAgent.branchId ? String(mergedAgent.branchId) : null,
        );
    const updates = normalizeAgentPayload(
      mergedAgent,
      existing[0].name,
      generated,
    );
    const [data] = await db
      .update(agents)
      .set(updates)
      .where(eq(agents.id, req.params.id))
      .returning();
    if (!data) return res.status(404).json({ error: "Agent not found" });
    res.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update agent";
    res
      .status(
        message.includes("wajib") ||
          message.includes("harus") ||
          message.includes("Komisi")
          ? 400
          : 500,
      )
      .json({ error: message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (req.user?.role === "agent")
      return res
        .status(403)
        .json({ error: "Agen tidak dapat menghapus data agen" });
    const scope = await resolveUserScope(req);
    if (!(await agentInScope(req.params.id, scope)))
      return res.status(404).json({ error: "Agent not found" });
    const [deleted] = await db
      .delete(agents)
      .where(eq(agents.id, req.params.id as string))
      .returning();
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
    const query =
      ids === null
        ? db
            .select()
            .from(agentCommissions)
            .orderBy(desc(agentCommissions.createdAt))
        : ids.length
          ? db
              .select()
              .from(agentCommissions)
              .where(inArray(agentCommissions.agentId, ids))
              .orderBy(desc(agentCommissions.createdAt))
          : Promise.resolve([]);
    const data = await query;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch commissions" });
  }
});

router.patch("/commissions/:id", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const [commission] = await db
      .select({ agentId: agentCommissions.agentId })
      .from(agentCommissions)
      .where(eq(agentCommissions.id, req.params.id))
      .limit(1);
    if (!commission || !(await agentInScope(commission.agentId, scope)))
      return res.status(404).json({ error: "Komisi tidak ditemukan" });
    const [data] = await db
      .update(agentCommissions)
      .set(req.body)
      .where(eq(agentCommissions.id, req.params.id))
      .returning();
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
  approved: ["paid", "rejected"],
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
      .select({
        agentId: agentWithdrawals.agentId,
        amount: agentWithdrawals.amount,
        status: agentWithdrawals.status,
      })
      .from(agentWithdrawals)
      .where(eq(agentWithdrawals.id, req.params.id))
      .limit(1);

    if (!before) return res.status(404).json({ error: "Withdrawal not found" });
    if (!(await agentInScope(before.agentId, scope)))
      return res.status(404).json({ error: "Withdrawal not found" });

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
    if (
      status === "paid" &&
      before?.status !== "paid" &&
      before?.agentId &&
      before?.amount != null
    ) {
      void journalCommissionWithdrawal({
        agentId: before.agentId,
        amount: Number(before.amount),
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
    const data =
      ids === null
        ? await db
            .select()
            .from(affiliateClicks)
            .orderBy(desc(affiliateClicks.createdAt))
        : ids.length
          ? await db
              .select()
              .from(affiliateClicks)
              .where(inArray(affiliateClicks.agentId, ids))
              .orderBy(desc(affiliateClicks.createdAt))
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
    const [data] = await db
      .insert(userRoles)
      .values({
        ...req.body,
        id,
        createdAt: new Date(),
      })
      .returning();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to create user role" });
  }
});

router.delete("/roles/:id", requireSuperAdmin, async (req, res) => {
  try {
    const [deleted] = await db
      .delete(userRoles)
      .where(eq(userRoles.id, req.params.id as string))
      .returning();
    if (!deleted) return res.status(404).json({ error: "User role not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user role" });
  }
});

export default router;
