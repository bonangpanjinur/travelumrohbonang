import { Router } from "express";
import { db, profiles, eq, or, ilike } from "@workspace/db";
import {
  ProfileSchema,
  AdminUpdateUserRequest,
  type AdminUpdateUserInput,
} from "@workspace/api-zod";
import { validate } from "../../middlewares/validate";

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

    res.json(ProfileSchema.parse(updated));
  } catch {
    res.status(500).json({ error: "Failed to update user" });
  }
});

export default router;
