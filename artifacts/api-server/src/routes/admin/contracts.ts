/**
 * P2-5: Admin contracts CRUD.
 * Gate: requireStaff (staff+ can view signed contracts; only super_admin/admin
 * should delete — handled inline below).
 */
import { Router } from "express";
import {
  db,
  contracts,
  bookings,
  eq,
  desc,
} from "@workspace/db";
import { requireAdmin } from "../../middlewares/requireAdmin";

const router = Router();

// GET / — list all contracts with booking info
router.get("/", async (_req, res) => {
  try {
    const data = await db
      .select({
        id: contracts.id,
        bookingId: contracts.bookingId,
        userId: contracts.userId,
        signerName: contracts.signerName,
        signedAt: contracts.signedAt,
        createdAt: contracts.createdAt,
        bookingCode: bookings.bookingCode,
        bookingStatus: bookings.status,
      })
      .from(contracts)
      .leftJoin(bookings, eq(contracts.bookingId, bookings.id))
      .orderBy(desc(contracts.createdAt));
    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to fetch contracts" });
  }
});

// GET /:id — single contract (includes html_content + signature for preview)
router.get("/:id", async (req, res) => {
  try {
    const [contract] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, String(req.params.id)))
      .limit(1);
    if (!contract) return res.status(404).json({ error: "Contract not found" });
    res.json(contract);
  } catch {
    res.status(500).json({ error: "Failed to fetch contract" });
  }
});

// PATCH /:id — admin can correct signer name or re-set signedAt
router.patch("/:id", async (req, res) => {
  try {
    const { signerName, signedAt } = req.body as {
      signerName?: string;
      signedAt?: string;
    };
    const [updated] = await db
      .update(contracts)
      .set({
        ...(signerName !== undefined ? { signerName } : {}),
        ...(signedAt ? { signedAt: new Date(signedAt) } : {}),
      })
      .where(eq(contracts.id, String(req.params.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: "Contract not found" });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update contract" });
  }
});

// DELETE /:id — restricted to full admin
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const [deleted] = await db
      .delete(contracts)
      .where(eq(contracts.id, String(req.params.id)))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Contract not found" });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete contract" });
  }
});

export default router;
