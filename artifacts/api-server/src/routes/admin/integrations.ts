import { Router } from "express";
import { db, integrationSecrets, eq } from "@workspace/db";

const router = Router();

const MASK = "********";

/**
 * The GET handler below redacts every config value to MASK before sending
 * it to the client (so secrets never round-trip in plaintext). That means
 * an admin who edits one field (e.g. toggles "Aktif" or changes "mode")
 * without retyping the secret fields would otherwise post the literal
 * string "********" back and overwrite the real stored secret.
 *
 * Fix: when writing config, any field whose incoming value is exactly MASK
 * is treated as "unchanged" and merged back from the existing stored value
 * instead of being persisted as the literal mask string.
 */
function mergeConfig(
  incoming: Record<string, unknown> | undefined | null,
  existing: Record<string, unknown> | undefined | null,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...(incoming || {}) };
  for (const key of Object.keys(merged)) {
    if (merged[key] === MASK) {
      merged[key] = existing?.[key] ?? "";
    }
  }
  return merged;
}

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
    // New row — there is no existing config to merge against, so any
    // literal MASK value the client sent (shouldn't normally happen on
    // create) is simply dropped rather than persisted as "********".
    const config = mergeConfig(req.body?.config, null);
    const [data] = await db.insert(integrationSecrets).values({
      ...req.body,
      config,
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
    const [existing] = await db
      .select()
      .from(integrationSecrets)
      .where(eq(integrationSecrets.id, req.params.id))
      .limit(1);
    if (!existing) return res.status(404).json({ error: "Integration not found" });

    const body = { ...req.body };
    if (body.config !== undefined) {
      body.config = mergeConfig(body.config, existing.config as Record<string, unknown> | null);
    }

    const [data] = await db.update(integrationSecrets).set(body).where(eq(integrationSecrets.id, req.params.id)).returning();
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
