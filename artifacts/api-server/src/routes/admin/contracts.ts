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
import crypto from "node:crypto";

const router = Router();

// POST / — admin creates a contract manually for a booking (e.g. paper contract
// signed offline, or a contract entered on the pilgrim's behalf).
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { bookingId, signerName, htmlContent, signedAt } = req.body as {
      bookingId?: string;
      signerName?: string;
      htmlContent?: string;
      signedAt?: string;
    };

    if (!bookingId || typeof bookingId !== "string") {
      return res.status(400).json({ error: "bookingId wajib diisi" });
    }
    if (!signerName || typeof signerName !== "string" || !signerName.trim()) {
      return res.status(400).json({ error: "Nama penandatangan wajib diisi" });
    }

    const [booking] = await db
      .select({ id: bookings.id, userId: bookings.userId })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      return res.status(404).json({ error: "Booking tidak ditemukan" });
    }
    if (!booking.userId) {
      return res.status(400).json({ error: "Booking ini tidak memiliki pemilik akun, kontrak tidak dapat dibuat" });
    }

    const [existing] = await db
      .select({ id: contracts.id })
      .from(contracts)
      .where(eq(contracts.bookingId, bookingId))
      .limit(1);
    if (existing) {
      return res.status(409).json({ error: "Booking ini sudah memiliki kontrak. Hapus kontrak lama terlebih dahulu jika ingin membuat ulang." });
    }

    const [inserted] = await db
      .insert(contracts)
      .values({
        id: crypto.randomUUID(),
        bookingId,
        userId: booking.userId,
        signerName: signerName.trim(),
        htmlContent: htmlContent?.trim() || null,
        signedAt: signedAt ? new Date(signedAt) : new Date(),
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json(inserted);
  } catch (err) {
    console.error("[POST /api/admin/contracts] failed:", err);
    res.status(500).json({ error: "Failed to create contract" });
  }
});

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
