/**
 * Public chat routes — Sprint 1 (chat_architecture.md §5.3)
 *
 * POST   /api/chat/start
 * GET    /api/chat/conversations/:id/messages
 * POST   /api/chat/conversations/:id/messages
 * PATCH  /api/chat/conversations/:id/read
 */

import { Router } from "express";
import { db, conversations, conversationMessages } from "@workspace/db";
import { eq, asc, sql } from "drizzle-orm";
import { chatAuth } from "../middlewares/chatAuth";
import { generalLimiter, writeLimiter } from "../middlewares/rateLimiter";
import { SUPABASE_URL, SUPABASE_SERVER_KEY } from "../lib/supabaseEnv";

const router = Router();

// ── POST /chat/start ─────────────────────────────────────────────────────────
router.post("/start", writeLimiter, async (req, res) => {
  try {
    const guestToken = req.headers["x-guest-token"] as string | undefined;
    const bearer = req.headers["authorization"];
    const hasJwt = bearer && bearer.startsWith("Bearer ") && bearer.length > 8;

    // ── Guest flow ──────────────────────────────────────────────────────────
    if (!hasJwt) {
      // ── Resume FIRST — check token before validating name/phone ──────────
      // Returning visitors send X-Guest-Token with an empty body so they
      // never have to fill the form again. The name/phone check must come
      // AFTER this lookup, otherwise returning guests get a spurious 400.
      if (guestToken) {
        const existing = await db.query.conversations.findFirst({
          where: eq(conversations.guestToken, guestToken),
        });
        if (existing) {
          return res.json({ conversationId: existing.id, guestToken, resumed: true });
        }
        // Token not found (stale) — fall through to create a new conversation
      }

      // New guest — name and phone are required
      const { name, phone, email } = req.body as {
        name?: string;
        phone?: string;
        email?: string;
      };

      if (!name?.trim() || !phone?.trim()) {
        return res.status(400).json({ error: "name dan phone wajib diisi" });
      }

      // Create new guest conversation
      const newId = crypto.randomUUID();
      const newGuestToken = crypto.randomUUID();
      await db.insert(conversations).values({
        id: newId,
        type: "guest",
        guestName: name.trim(),
        guestPhone: phone.trim(),
        guestEmail: email?.trim() ?? null,
        guestToken: newGuestToken,
        status: "open",
      });

      return res.status(201).json({
        conversationId: newId,
        guestToken: newGuestToken,
        resumed: false,
      });
    }

    // ── Logged-in member flow ───────────────────────────────────────────────
    const token = bearer!.slice(7).trim();
    if (!SUPABASE_URL || !SUPABASE_SERVER_KEY) {
      return res.status(503).json({ error: "Auth service unavailable" });
    }

    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_SERVER_KEY,
      },
    });
    if (!authRes.ok) return res.status(401).json({ error: "Token tidak valid" });

    const authData = (await authRes.json()) as { id?: string };
    const userId = authData.id;
    if (!userId) return res.status(401).json({ error: "Token tidak valid" });

    // Find or create member conversation
    const existing = await db.query.conversations.findFirst({
      where: (c, { and }) =>
        and(eq(c.userId, userId), eq(c.type, "member")),
    });

    if (existing) {
      return res.json({ conversationId: existing.id, resumed: true });
    }

    const profile = await db.query.profiles
      .findFirst({ where: (p, { eq: eqFn }) => eqFn(p.id, userId) })
      .catch(() => null);

    const newId = crypto.randomUUID();
    await db.insert(conversations).values({
      id: newId,
      type: "member",
      userId,
      guestName: (profile as any)?.name ?? "Member",
      status: "open",
    });

    return res.status(201).json({ conversationId: newId, resumed: false });
  } catch (err) {
    console.error("[chat/start]", err);
    return res.status(500).json({ error: "Gagal memulai percakapan" });
  }
});

// ── GET /chat/conversations/:id/messages ─────────────────────────────────────
router.get("/conversations/:id/messages", generalLimiter, chatAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Guests can only read their own conversation
    if (req.chatRole === "guest" && req.guestConversationId !== id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Members can only read their own conversation
    if (req.chatRole === "member") {
      const conv = await db.query.conversations.findFirst({
        where: eq(conversations.id, id),
      });
      if (!conv || conv.userId !== req.chatUserId) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const messages = await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, id))
      .orderBy(asc(conversationMessages.createdAt));

    return res.json({ data: messages });
  } catch (err) {
    console.error("[chat/messages GET]", err);
    return res.status(500).json({ error: "Gagal memuat pesan" });
  }
});

// ── POST /chat/conversations/:id/messages ─────────────────────────────────────
router.post("/conversations/:id/messages", writeLimiter, chatAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body as { message?: string };

    if (!message?.trim()) {
      return res.status(400).json({ error: "Pesan tidak boleh kosong" });
    }

    // Access control
    if (req.chatRole === "guest" && req.guestConversationId !== id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (req.chatRole === "member") {
      const conv = await db.query.conversations.findFirst({
        where: eq(conversations.id, id),
      });
      if (!conv || conv.userId !== req.chatUserId) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const senderType = req.chatRole === "admin" ? "admin"
      : req.chatRole === "guest" ? "guest"
      : "member";

    const senderName =
      req.chatRole === "guest" ? (req.guestName ?? "Tamu") : (req.chatUserName ?? "User");

    const msgId = crypto.randomUUID();
    const [inserted] = await db
      .insert(conversationMessages)
      .values({
        id: msgId,
        conversationId: id,
        senderType,
        senderId: req.chatUserId ?? null,
        senderName,
        message: message.trim(),
      })
      .returning();

    // Update preview + increment unread for the other side
    if (senderType === "admin") {
      await db
        .update(conversations)
        .set({
          lastMessageAt: new Date(),
          lastMessagePreview: message.trim().slice(0, 100),
          unreadAdmin: 0,
          unreadUser: sql`unread_user + 1`,
        } as any)
        .where(eq(conversations.id, id));
    } else {
      await db
        .update(conversations)
        .set({
          lastMessageAt: new Date(),
          lastMessagePreview: message.trim().slice(0, 100),
          unreadUser: 0,
          unreadAdmin: sql`unread_admin + 1`,
        } as any)
        .where(eq(conversations.id, id));
    }

    return res.status(201).json({ data: inserted });
  } catch (err) {
    console.error("[chat/messages POST]", err);
    return res.status(500).json({ error: "Gagal mengirim pesan" });
  }
});

// ── PATCH /chat/conversations/:id/read ───────────────────────────────────────
router.patch("/conversations/:id/read", generalLimiter, chatAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const resetField =
      req.chatRole === "admin" ? { unreadAdmin: 0 } : { unreadUser: 0 };

    await db
      .update(conversations)
      .set(resetField)
      .where(eq(conversations.id, id));

    return res.json({ ok: true });
  } catch (err) {
    console.error("[chat/read]", err);
    return res.status(500).json({ error: "Gagal menandai sudah dibaca" });
  }
});

export default router;
