import { Router } from "express";
import { db, profiles } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ProfileSchema, UpdateProfileRequest } from "@workspace/api-zod";

const router = Router();

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

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
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const parsed = UpdateProfileRequest.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const [updated] = await db
      .update(profiles)
      .set(parsed.data)
      .where(eq(profiles.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    res.json(ProfileSchema.parse(updated));
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
