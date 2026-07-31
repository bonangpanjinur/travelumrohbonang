import { Router } from "express";
import { db, profiles, agents, eq, or, ilike } from "@workspace/db";
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
    const data = search
      ? await db
          .select()
          .from(profiles)
          .where(or(ilike(profiles.name, `%${search}%`), ilike(profiles.email, `%${search}%`)))
          .limit(8)
      : await db.select().from(profiles).limit(200);
    res.json({ data, total: data.length });
  } catch {
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
  } catch {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

router.patch("/:id", validate(AdminUpdateUserRequest), async (req, res) => {
  try {
    const id = req.params.id as string;
    const updates = req.body as AdminUpdateUserInput;
    const requesterRole = (req.user as any)?.role as string;

    // Owner cannot touch super_admin accounts or promote anyone to super_admin/owner.
    if (requesterRole === "owner") {
      // Fetch the target user's current role
      const [target] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
      if (target?.role === "super_admin") {
        res.status(403).json({ error: "Owner cannot modify a super admin account" });
        return;
      }
      if (target?.role === "owner" && target.id !== (req.user as any)?.id) {
        res.status(403).json({ error: "Owner cannot modify another owner account" });
        return;
      }
      // Prevent promoting to super_admin or owner
      if (updates.role === "super_admin" || updates.role === "owner") {
        res.status(403).json({ error: "Owner cannot assign the super_admin or owner role" });
        return;
      }
    }

    const [updated] = await db
      .update(profiles)
      .set(updates)
      .where(eq(profiles.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Sync agents table whenever the role field is touched
    if (updates.role !== undefined) {
      await syncAgentRecord(id, updates.role as string);
    }

    res.json(ProfileSchema.parse(updated));
  } catch {
    res.status(500).json({ error: "Failed to update user" });
  }
});

export default router;
