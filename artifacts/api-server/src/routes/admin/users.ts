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
