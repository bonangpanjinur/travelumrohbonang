import { Router } from "express";
import { db, chatMessages, eq, asc } from "@workspace/db";
import { isWhatsAppConfigured } from "@workspace/whatsapp";
import { waNotifications } from "../../lib/notifications/waNotifications";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const data = await db.select().from(chatMessages).orderBy(asc(chatMessages.createdAt));
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chats" });
  }
});

router.get("/:bookingId", async (req, res) => {
  try {
    const data = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.bookingId, req.params.bookingId))
      .orderBy(asc(chatMessages.createdAt));
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chat messages" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [item] = await db.insert(chatMessages).values({
      id: crypto.randomUUID(),
      ...req.body,
      createdAt: new Date(),
    }).returning();
    res.status(201).json({ data: item });
  } catch (err) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

/**
 * F-04 — WA Blast: kirim pesan WhatsApp ke semua jamaah satu keberangkatan.
 * POST /api/admin/chats/blast/:departureId  { message: string }
 */
router.post("/blast/:departureId", async (req, res) => {
  const { departureId } = req.params;
  const { message } = req.body as { message?: string };

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "message harus diisi" });
  }

  if (!isWhatsAppConfigured()) {
    return res.status(503).json({
      error: "WhatsApp belum dikonfigurasi",
      hint: "Set FONNTE_API_TOKEN dan WA_SENDER_NUMBER di environment variables",
    });
  }

  try {
    const { sent, skipped } = await waNotifications.blast(departureId, message.trim());
    res.json({
      ok: true,
      sent,
      skipped,
      message: `WA blast selesai: ${sent} terkirim, ${skipped} dilewati (no HP kosong / error)`,
    });
  } catch (err) {
    console.error("[admin/chats] blast error:", err);
    res.status(500).json({ error: "Gagal mengirim WA blast" });
  }
});

export default router;
