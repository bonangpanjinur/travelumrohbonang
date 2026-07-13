import { Router } from "express";
import { db, profiles, eq } from "@workspace/db";
import {
  ProfileSchema,
  UpdateProfileRequest,
  type UpdateProfileInput,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validate";

const router = Router();

router.use(requireAuth);

router.get("/:id", async (req: any, res) => {
  try {
    const id = req.params.id as string;

    if (!req.isAuthenticated() || id !== req.user.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);

    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    res.json(ProfileSchema.parse(profile));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.patch("/:id", validate(UpdateProfileRequest), async (req: any, res) => {
  try {
    const id = req.params.id as string;

    if (!req.isAuthenticated() || id !== req.user.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const updates = req.body as UpdateProfileInput;

    const [updated] = await db
      .update(profiles)
      .set({
        ...updates,
      })
      .where(eq(profiles.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    res.json(ProfileSchema.parse(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
