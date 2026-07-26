/**
 * chatAuth middleware — Sprint 1 (chat_architecture.md §5.4)
 *
 * Accepts messages from THREE sources:
 *  1. JWT Bearer token  → authenticated user (jemaah / admin)
 *  2. X-Guest-Token header → anonymous guest (lookup conversations.guest_token)
 *  3. Neither           → 401
 *
 * After this middleware:
 *  - req.user          is set for authenticated users (via existing authMiddleware logic)
 *  - req.guestConversationId + req.guestName are set for guests
 */

import type { Request, Response, NextFunction } from "express";
import { db, conversations } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { SUPABASE_URL, SUPABASE_SERVER_KEY } from "../lib/supabaseEnv";

// Extend Express Request with guest fields
declare global {
  namespace Express {
    interface Request {
      guestConversationId?: string;
      guestName?: string;
      guestToken?: string;
      chatUserId?: string;
      chatUserName?: string;
      chatRole?: "admin" | "member" | "guest";
    }
  }
}

async function resolveUserFromJwt(
  token: string,
): Promise<{ id: string; name: string; role: string } | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVER_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_SERVER_KEY,
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { id?: string; user_metadata?: { name?: string } };
    const id = data.id;
    if (!id) return null;

    // Look up role from user_roles (profiles has no role column)
    const [profileRow, roleRow] = await Promise.all([
      db.query.profiles
        .findFirst({ where: (p, { eq }) => eq(p.id, id) })
        .catch(() => null),
      db.execute(
        sql`SELECT role FROM user_roles WHERE user_id = ${id} LIMIT 1`,
      ).catch(() => null),
    ]);

    const role =
      ((roleRow?.rows as { role: string }[] | undefined)?.[0]?.role) ?? "user";

    return {
      id,
      name: profileRow?.name ?? data.user_metadata?.name ?? "User",
      role,
    };
  } catch {
    return null;
  }
}

const ADMIN_ROLES = new Set(["super_admin", "admin", "branch_manager", "staff"]);

export async function chatAuth(req: Request, res: Response, next: NextFunction) {
  // ── 1. Try JWT ────────────────────────────────────────────────────────────
  const bearer = req.headers["authorization"];
  if (bearer?.startsWith("Bearer ")) {
    const token = bearer.slice(7).trim();
    if (token && token !== "local-dev-key") {
      const user = await resolveUserFromJwt(token);
      if (user) {
        req.chatUserId = user.id;
        req.chatUserName = user.name;
        req.chatRole = ADMIN_ROLES.has(user.role) ? "admin" : "member";
        return next();
      }
    }
  }

  // ── 2. Try guest token ────────────────────────────────────────────────────
  const guestToken = req.headers["x-guest-token"] as string | undefined;
  if (guestToken) {
    const conv = await db.query.conversations
      .findFirst({ where: eq(conversations.guestToken, guestToken) })
      .catch(() => null);

    if (conv) {
      req.guestConversationId = conv.id;
      req.guestName = conv.guestName ?? "Tamu";
      req.guestToken = guestToken;
      req.chatRole = "guest";
      return next();
    }
  }

  // ── 3. Neither → 401 ─────────────────────────────────────────────────────
  return res.status(401).json({ error: "Unauthorized — provide JWT or X-Guest-Token" });
}

/**
 * Like chatAuth but only allows admin roles.
 */
export async function chatAuthAdmin(req: Request, res: Response, next: NextFunction) {
  await chatAuth(req, res, async () => {
    if (req.chatRole !== "admin") {
      return res.status(403).json({ error: "Admin only" });
    }
    return next();
  });
}
