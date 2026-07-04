import { Router } from "express";
import { db, integrationSecrets, eq } from "@workspace/db";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const data = await db.select().from(integrationSecrets);
    // Redact secrets
    const redacted = data.map(item => ({
      ...item,
      config: item.config ? Object.keys(item.config as object).reduce((acc, key) => {
        acc[key] = "********";
        return acc;
      }, {} as any) : null
    }));
    res.json(redacted);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch integrations" });
  }
});

router.post("/", async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const [data] = await db.insert(integrationSecrets).values({
      ...req.body,
      id,
      createdAt: new Date(),
    }).returning();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to create integration" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const [data] = await db.update(integrationSecrets).set(req.body).where(eq(integrationSecrets.id, req.params.id)).returning();
    if (!data) return res.status(404).json({ error: "Integration not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to update integration" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(integrationSecrets).where(eq(integrationSecrets.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete integration" });
  }
});

export default router;
