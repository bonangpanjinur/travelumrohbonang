/**
 * Public chat routes — Sprint 1 (chat_architecture.md §5.3)
 *
 * POST   /api/chat/start
 * GET    /api/chat/conversations/:id/messages
 * POST   /api/chat/conversations/:id/messages
 * PATCH  /api/chat/conversations/:id/read
 */

import { Router } from "express";
import { db, conversations, conversationMessages, notifications } from "@workspace/db";
import { eq, asc, sql } from "drizzle-orm";
import { chatAuth } from "../middlewares/chatAuth";
import { generalLimiter, writeLimiter } from "../middlewares/rateLimiter";
import { SUPABASE_URL, SUPABASE_SERVER_KEY } from "../lib/supabaseEnv";

const router = Router();

// ── Admin notification helper ─────────────────────────────────────────────────
const ADMIN_ROLES = new Set(["super_admin", "admin", "branch_manager", "staff"]);

/**
 * Insert an in-app notification for every admin user so they see the new chat
 * message in their notification bell (useAdminNotifications.ts).
 * Never throws — swallows errors to avoid blocking the HTTP response.
 */
async function notifyAdmins({
  conversationId,
  senderName,
  preview,
}: {
  conversationId: string;
  senderName: string;
  preview: string;
}): Promise<void> {
  try {
    // Query user_roles and join with profiles to filter by branch if needed
    // For now, we increase the limit and prioritize super_admins/admins
    const adminRows = await db.execute(
      sql`
        SELECT ur.user_id 
        FROM user_roles ur
        LEFT JOIN profiles p ON ur.user_id = p.id
        WHERE ur.role = ANY(ARRAY['super_admin','admin','branch_manager','staff'])
        ORDER BY 
          CASE 
            WHEN ur.role = 'super_admin' THEN 1 
            WHEN ur.role = 'admin' THEN 2 
            ELSE 3 
          END ASC
        LIMIT 100
      `,
    );
    const adminIds = (adminRows.rows as { user_id: string }[]).map((r) => r.user_id);
    if (adminIds.length === 0) return;

    const notifValues = adminIds.map((userId) => ({
      id: crypto.randomUUID(),
      userId,
      title: `Pesan baru dari ${senderName}`,
      message: preview,
      isRead: false,
      createdAt: new Date(),
    }));

    await db.insert(notifications).values(notifValues);
  } catch (err) {
    console.error("[chat] notifyAdmins error:", err);
  }
}

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

      const normalizedName = name?.trim() ?? "";
      const normalizedPhone = phone?.trim() ?? "";
      const normalizedEmail = email?.trim() ?? "";
      if (!normalizedName || !normalizedPhone) {
        return res.status(400).json({ error: "name dan phone wajib diisi" });
      }
      if (normalizedName.length > 120 || normalizedPhone.length > 40 || normalizedEmail.length > 160) {
        return res.status(400).json({ error: "Data kontak terlalu panjang" });
      }

      // Create new guest conversation
      const newId = crypto.randomUUID();
      const newGuestToken = crypto.randomUUID();
      await db.insert(conversations).values({
        id: newId,
        type: "guest",
        guestName: normalizedName,
        guestPhone: normalizedPhone,
        guestEmail: normalizedEmail || null,
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
    // Fast path: authMiddleware already validated the JWT and set req.user.
    // Use it directly to avoid a duplicate Supabase round-trip (and to make
    // member chat work even when Supabase is not configured on this instance).
    let userId: string | undefined = req.user?.id;

    if (!userId) {
      // Fallback: validate JWT against Supabase (production path with credentials)
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
      userId = authData.id;
    }

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

    const normalizedMessage = message?.trim() ?? "";
    if (!normalizedMessage) {
      return res.status(400).json({ error: "Pesan tidak boleh kosong" });
    }
    if (normalizedMessage.length > 5000) {
      return res.status(400).json({ error: "Pesan maksimal 5000 karakter" });
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
        message: normalizedMessage,
      })
      .returning();

    // ── Notify all admin users ─────────────────────────────────────────────
    // Fire-and-forget: do not let notification errors block the response.
    // Note: Metadata updates (preview, unread count) are now handled by DB triggers.
    if (senderType !== "admin") {
      notifyAdmins({
        conversationId: id,
        senderName,
        preview: normalizedMessage.slice(0, 80),
      }).catch((err) => console.error("[chat] notifyAdmins failed:", err));
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

    // ── Ownership check (same as GET/POST message routes) ─────────────────
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

    const resetField =
      req.chatRole === "admin" ? { unreadAdmin: 0 } : { unreadUser: 0 };

    await db
      .update(conversations)
      .set(resetField)
      .where(eq(conversations.id, id));

    // Also mark individual admin messages as read (for ✓✓ ticks on admin side)
    if (req.chatRole !== "admin") {
      await db
        .update(conversationMessages)
        .set({ isRead: true })
        .where(
          sql`conversation_id = ${id} AND sender_type = 'admin' AND is_read = false`,
        );
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("[chat/read]", err);
    return res.status(500).json({ error: "Gagal menandai sudah dibaca" });
  }
});

export default router;
