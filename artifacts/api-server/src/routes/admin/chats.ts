import { Router } from "express";
import { db, chatMessages, bookings, eq, asc } from "@workspace/db";
import { isWhatsAppConfigured } from "@workspace/whatsapp";
import { waNotifications } from "../../lib/notifications/waNotifications";
import { resolveUserScope } from "../../lib/scopeGuard";
import { buildBookingScopeCondition } from "../../lib/scopeConditions";
import { canAccessBooking, canAccessDeparture } from "../../lib/conversationScope";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const data = scope.type === "global"
      ? await db.select().from(chatMessages).orderBy(asc(chatMessages.createdAt))
      : await db
          .select({ chat: chatMessages })
          .from(chatMessages)
          .innerJoin(bookings, eq(bookings.id, chatMessages.bookingId))
          .where(buildBookingScopeCondition(scope, "bookings"))
          .orderBy(asc(chatMessages.createdAt))
          .then((rows) => rows.map((row) => row.chat));
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chats" });
  }
});

router.get("/:bookingId", async (req, res) => {
  try {
    const bookingId = String(req.params.bookingId);
    if (!(await canAccessBooking(req, bookingId))) {
      return res.status(404).json({ error: "Chat tidak ditemukan" });
    }
    const data = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.bookingId, bookingId))
      .orderBy(asc(chatMessages.createdAt));
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chat messages" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { bookingId, senderId, senderRole, message } = req.body as {
      bookingId?: string;
      senderId?: string;
      senderRole?: string;
      message?: string;
    };
    const normalizedMessage = message?.trim() ?? "";
    if (!bookingId || !normalizedMessage) return res.status(400).json({ error: "bookingId dan message wajib diisi" });
    if (normalizedMessage.length > 5000) return res.status(400).json({ error: "Pesan maksimal 5000 karakter" });
    if (!senderRole || !["admin", "buyer", "member"].includes(senderRole)) return res.status(400).json({ error: "senderRole tidak valid" });
    if (!(await canAccessBooking(req, bookingId))) {
      return res.status(404).json({ error: "Booking tidak ditemukan" });
    }
    const [item] = await db.insert(chatMessages).values({
      id: crypto.randomUUID(),
      bookingId,
      senderId: senderId ?? null,
      senderRole,
      message: normalizedMessage,
      createdAt: new Date(),
    }).returning();
    res.status(201).json({ data: item });
  } catch (err) {
    console.error("[admin/chats POST]", err);
    res.status(500).json({ error: "Gagal mengirim pesan" });
  }
});

/**
 * F-04 — WA Blast: kirim pesan WhatsApp ke semua jamaah satu keberangkatan.
 * POST /api/admin/chats/blast/:departureId  { message: string }
 */
router.post("/blast/:departureId", async (req, res) => {
  const departureId = String(req.params.departureId);
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
    if (!(await canAccessDeparture(req, departureId))) {
      return res.status(404).json({ error: "Keberangkatan tidak ditemukan" });
    }
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
