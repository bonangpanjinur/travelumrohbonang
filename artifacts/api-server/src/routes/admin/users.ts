import { Router } from "express";
import { requireSuperAdmin } from "../../middlewares/requireAdmin";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "../../lib/supabaseEnv";
import { db, profiles, agents, userRoles, eq, or, ilike } from "@workspace/db";
import {
  ProfileSchema,
  AdminUpdateUserRequest,
  type AdminUpdateUserInput,
} from "@workspace/api-zod";
import { validate } from "../../middlewares/validate";

/**
 * Generate a simple referral code from a name.
 * e.g. "Budi Santoso" → "BUDI-4821"
 */
function generateReferralCode(name: string): string {
  const prefix = name.replace(/\s+/g, "").toUpperCase().slice(0, 5);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${suffix}`;
}

/**
 * Sync the agents table when a user's role is set to / from 'agent'.
 *
 * role → 'agent':
 *   1. If agents row with matching email exists → link (set user_id)
 *   2. Otherwise → auto-create agents row from profile data
 *
 * role → anything else:
 *   Unlink (set user_id = null) if this user was previously linked
 */
async function syncAgentRecord(
  profileId: string,
  newRole: string,
): Promise<void> {
  if (newRole === "agent") {
    // Fetch profile to get name / email / phone
    const [profile] = await db
      .select({ name: profiles.name, email: profiles.email, phone: profiles.phone })
      .from(profiles)
      .where(eq(profiles.id, profileId as any))
      .limit(1);

    if (!profile) return;

    // 1. Already linked by user_id?
    const [existing] = await db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.userId, profileId))
      .limit(1);

    if (existing) return; // already linked, nothing to do

    // 2. Linked by email?
    const [byEmail] = profile.email
      ? await db
          .select({ id: agents.id })
          .from(agents)
          .where(eq(agents.email, profile.email))
          .limit(1)
      : [undefined];

    if (byEmail) {
      // Link existing record
      await db.update(agents).set({ userId: profileId }).where(eq(agents.id, byEmail.id));
      return;
    }

    // 3. No agents record at all — auto-create
    await db.insert(agents).values({
      id: crypto.randomUUID(),
      userId: profileId,
      name: profile.name ?? "Agen Baru",
      email: profile.email ?? null,
      phone: profile.phone ?? null,
      referralCode: generateReferralCode(profile.name ?? "AGEN"),
      isActive: true,
      createdAt: new Date(),
    });
  } else {
    // Unlink: clear user_id so the agents record is not deleted, just de-associated
    await db
      .update(agents)
      .set({ userId: null })
      .where(eq(agents.userId, profileId));
  }
}

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { search } = req.query as { search?: string };
    const profileColumns = {
      id: profiles.id,
      name: profiles.name,
      email: profiles.email,
      phone: profiles.phone,
      avatarUrl: profiles.avatarUrl,
      branchId: profiles.branchId,
      createdAt: profiles.createdAt,
    };
    const profileRows = search
      ? await db
          .select(profileColumns)
          .from(profiles)
          .where(or(ilike(profiles.name, `%${search}%`), ilike(profiles.email, `%${search}%`)))
          .limit(8)
      : await db.select(profileColumns).from(profiles).limit(200);

    const roleRows = await db
      .select({ userId: userRoles.userId, role: userRoles.role })
      .from(userRoles);
    const rolePriority = ["super_admin", "owner", "admin", "branch_manager", "finance", "staff", "agent", "buyer"];
    const roleMap = new Map<string, string>();
    for (const row of roleRows) {
      const current = roleMap.get(row.userId);
      if (!current || rolePriority.indexOf(row.role) < rolePriority.indexOf(current)) {
        roleMap.set(row.userId, row.role);
      }
    }

    const data = profileRows.map((profile) => ({
      ...profile,
      role: roleMap.get(profile.id) ?? "buyer",
    }));
    res.json({ data, total: data.length });
  } catch (e) { console.error("[route error]", e);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id as string;

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);

    if (!profile) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(ProfileSchema.parse(profile));
  } catch (e) { console.error("[route error]", e);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

router.post("/:id/impersonate", requireSuperAdmin, async (req, res) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      res.status(503).json({ error: "Impersonation belum dikonfigurasi di server" });
      return;
    }

    const [target] = await db
      .select({ id: profiles.id, email: profiles.email })
      .from(profiles)
      .where(eq(profiles.id, req.params.id as any))
      .limit(1);
    if (!target?.email) {
      res.status(404).json({ error: "User target tidak ditemukan" });
      return;
    }

    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "magiclink",
        email: target.email,
        options: { redirectTo: process.env.APP_URL || "https://vinstourtravel.com/dashboard?impersonated=1" },
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { action_link?: string; properties?: { action_link?: string }; msg?: string; error_description?: string };
    if (!response.ok) {
      console.error("[admin/users] impersonation provider error", response.status, payload);
      res.status(502).json({ error: "Gagal membuat link impersonation" });
      return;
    }

    const actionLink = payload.action_link || payload.properties?.action_link;
    if (!actionLink) {
      res.status(502).json({ error: "Provider tidak mengembalikan link impersonation" });
      return;
    }
    console.warn(`[admin/users] impersonation link generated by ${(req.user as any)?.id} for ${target.id}`);
    res.json({ action_link: actionLink });
  } catch (e) {
    console.error("[admin/users] impersonation error", e);
    res.status(500).json({ error: "Gagal membuat link impersonation" });
  }
});

router.patch("/:id", validate(AdminUpdateUserRequest), async (req, res) => {
  try {
    const id = req.params.id as string;
    const updates = req.body as AdminUpdateUserInput;
    const { role, ...profileUpdates } = updates as AdminUpdateUserInput & { role?: string };
    const requesterRole = (req.user as any)?.role as string;

    // Only super_admin may modify privileged accounts or assign privileged roles.
    const [targetRole] = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, id as any))
      .limit(1);
    const targetIsPrivileged = targetRole?.role === "super_admin" || targetRole?.role === "owner";
    const assignsPrivilegedRole = role === "super_admin" || role === "owner";
    if (requesterRole !== "super_admin" && (targetIsPrivileged || assignsPrivilegedRole)) {
      res.status(403).json({ error: "Only super admin may modify or assign privileged roles" });
      return;
    }

    const [updated] = await db
      .update(profiles)
      .set(profileUpdates)
      .where(eq(profiles.id, id))
      .returning();

    if (role !== undefined) {
      const [existingRole] = await db.select({ id: userRoles.id }).from(userRoles).where(eq(userRoles.userId, id as any)).limit(1);
      if (existingRole) {
        await db.update(userRoles).set({ role }).where(eq(userRoles.id, existingRole.id));
      } else {
        await db.insert(userRoles).values({ id: crypto.randomUUID(), userId: id as any, role, createdAt: new Date() });
      }
    }

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Sync agents table whenever the role field is touched
    if (role !== undefined) {
      await syncAgentRecord(id, role as string);
    }

    res.json(ProfileSchema.parse(updated));
  } catch (e) { console.error("[route error]", e);
    res.status(500).json({ error: "Failed to update user" });
  }
});

export default router;
