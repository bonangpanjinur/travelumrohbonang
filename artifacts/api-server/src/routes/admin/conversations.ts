/**
 * Admin conversations routes — Sprint 1 (chat_architecture.md §5.3)
 *
 * GET    /api/admin/conversations          → list all conversations (filter: type, status, unread)
 * GET    /api/admin/conversations/:id      → single conversation detail
 * GET    /api/admin/conversations/:id/messages
 * POST   /api/admin/conversations/:id/messages → reply as admin
 * PATCH  /api/admin/conversations/:id         → close / assign
 */

import { Router } from "express";
import { db, conversations, conversationMessages, profiles } from "@workspace/db";
import { eq, desc, and, sql, asc } from "drizzle-orm";
import { requireAuth } from "../../middlewares/auth";

const router = Router();

// All admin conversation routes require authentication (admin check happens via
// requireAdmin applied at mount point in admin/index.ts)

// ── GET /conversations ────────────────────────────────────────────────────────
router.get("/", requireAuth, async (req, res) => {
  try {
    const {
      type,
      status,
      unread,
      search,
      limit = "50",
      offset = "0",
    } = req.query as Record<string, string>;

    const conditions: ReturnType<typeof sql>[] = [];

    if (type && type !== "all") {
      conditions.push(sql`c.type = ${type}`);
    }
    if (status && status !== "all") {
      conditions.push(sql`c.status = ${status}`);
    }
    if (unread === "true") {
      conditions.push(sql`c.unread_admin > 0`);
    }
    if (search) {
      const q = `%${search}%`;
      conditions.push(
        sql`(c.guest_name ILIKE ${q} OR c.guest_phone ILIKE ${q} OR c.last_message_preview ILIKE ${q} OR p.name ILIKE ${q})`,
      );
    }

    const whereClause =
      conditions.length > 0
        ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
        : sql``;

    const rows = await db.execute(
      sql`
        SELECT
          c.id,
          c.type,
          c.status,
          c.user_id,
          c.guest_name,
          c.guest_phone,
          c.guest_email,
          c.guest_token,
          c.booking_id,
          c.assigned_admin_id,
          c.last_message_at,
          c.last_message_preview,
          c.unread_admin,
          c.unread_user,
          c.created_at,
          p.name AS member_name
        FROM conversations c
        LEFT JOIN profiles p ON p.id::text = c.user_id
        ${whereClause}
        ORDER BY
          c.unread_admin DESC,
          c.last_message_at DESC NULLS LAST
        LIMIT ${parseInt(limit, 10)}
        OFFSET ${parseInt(offset, 10)}
      `,
    );

    const countResult = await db.execute(
      sql`SELECT COUNT(*) AS total FROM conversations c ${whereClause}`,
    );

    return res.json({
      data: rows.rows,
      total: Number((countResult.rows[0] as any)?.total ?? 0),
    });
  } catch (err: any) {
    // If the conversations table hasn't been created yet, return empty list
    // rather than crashing the dashboard with a 500.
    if (err?.message?.includes("does not exist") || err?.code === "42P01") {
      return res.json({ data: [], total: 0 });
    }
    console.error("[admin/conversations GET]", err);
    return res.status(500).json({ error: "Gagal memuat daftar percakapan" });
  }
});

// ── GET /conversations/:id ────────────────────────────────────────────────────
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, id),
    });
    if (!conv) return res.status(404).json({ error: "Percakapan tidak ditemukan" });

    // If member, enrich with profile
    let memberName: string | null = null;
    if (conv.userId) {
      const profile = await db.query.profiles
        .findFirst({ where: eq(profiles.id, conv.userId) })
        .catch(() => null);
      memberName = (profile as any)?.name ?? null;
    }

    return res.json({ data: { ...conv, memberName } });
  } catch (err) {
    console.error("[admin/conversations/:id GET]", err);
    return res.status(500).json({ error: "Gagal memuat percakapan" });
  }
});

// ── GET /conversations/:id/messages ──────────────────────────────────────────
router.get("/:id/messages", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = "100", offset = "0" } = req.query as Record<string, string>;

    const messages = await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, id))
      .orderBy(asc(conversationMessages.createdAt))
      .limit(parseInt(limit, 10))
      .offset(parseInt(offset, 10));

    return res.json({ data: messages });
  } catch (err) {
    console.error("[admin/conversations/:id/messages GET]", err);
    return res.status(500).json({ error: "Gagal memuat pesan" });
  }
});

// ── POST /conversations/:id/messages ─────────────────────────────────────────
router.post("/:id/messages", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body as { message: string };

    if (!message?.trim()) {
      return res.status(400).json({ error: "Pesan tidak boleh kosong" });
    }

    const adminUser = (req as any).user;
    const adminId: string = adminUser?.id ?? "unknown";
    const adminName: string = adminUser?.name ?? adminUser?.email ?? "Admin";

    // Verify conversation exists
    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, id),
    });
    if (!conv) return res.status(404).json({ error: "Percakapan tidak ditemukan" });

    const msgId = crypto.randomUUID();
    const [inserted] = await db
      .insert(conversationMessages)
      .values({
        id: msgId,
        conversationId: id,
        senderType: "admin",
        senderId: adminId,
        senderName: adminName,
        message: message.trim(),
      })
      .returning();

    // Update conversation preview + reset admin unread + increment user unread
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        lastMessagePreview: message.trim().slice(0, 100),
        unreadAdmin: 0,
        unreadUser: sql`unread_user + 1`,
      } as any)
      .where(eq(conversations.id, id));

    return res.status(201).json({ data: inserted });
  } catch (err) {
    console.error("[admin/conversations/:id/messages POST]", err);
    return res.status(500).json({ error: "Gagal mengirim pesan" });
  }
});

// ── PATCH /conversations/:id ──────────────────────────────────────────────────
// Body: { status?: 'open' | 'closed', assignedAdminId?: string | null }
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedAdminId } = req.body as {
      status?: "open" | "closed";
      assignedAdminId?: string | null;
    };

    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (assignedAdminId !== undefined) updates.assignedAdminId = assignedAdminId;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Tidak ada perubahan" });
    }

    const [updated] = await db
      .update(conversations)
      .set(updates)
      .where(eq(conversations.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Percakapan tidak ditemukan" });

    return res.json({ data: updated });
  } catch (err) {
    console.error("[admin/conversations/:id PATCH]", err);
    return res.status(500).json({ error: "Gagal mengupdate percakapan" });
  }
});

// ── PATCH /conversations/:id/read ────────────────────────────────────────────
// Admin marks conversation as read (resets unread_admin counter)
router.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db
      .update(conversations)
      .set({ unreadAdmin: 0 })
      .where(eq(conversations.id, id));

    // Mark non-admin messages as read (for ✓✓ ticks visible to guest/member)
    await db
      .update(conversationMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(conversationMessages.conversationId, id),
          sql`sender_type != 'admin'`,
          sql`is_read = false`,
        ),
      );

    return res.json({ ok: true });
  } catch (err) {
    console.error("[admin/conversations/:id/read PATCH]", err);
    return res.status(500).json({ error: "Gagal menandai sudah dibaca" });
  }
});

export default router;
