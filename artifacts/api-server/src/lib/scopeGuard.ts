/**
 * Sprint A — Data Isolation: resolveUserScope
 *
 * Reads the authenticated user's role and resolves a UserScope object that
 * describes which slice of booking data they are allowed to see.
 *
 * - 'global'  → super_admin / owner / admin  — no WHERE restriction
 * - 'branch'  → branch_manager / staff / finance — restrict to their branch
 * - 'agent'   → agent — restrict to their own bookings only
 *
 * The scope is cached on req.resolvedScope so it is only computed once per
 * request even if multiple route handlers call resolveUserScope.
 */

import type { Request } from "express";
import { db, agents, profiles, eq } from "@workspace/db";

export type UserScopeType = "global" | "branch" | "agent";

export interface UserScope {
  type: UserScopeType;
  /** Populated when type === 'branch'. Null means no branch configured. */
  branchId: string | null;
  /** Populated when type === 'agent'. Null means no agent record found. */
  agentId: string | null;
}

// Augment Express Request to carry the resolved scope
declare global {
  namespace Express {
    interface Request {
      resolvedScope?: UserScope;
    }
  }
}

/**
 * Resolve the data scope for the currently authenticated user.
 * Results are cached on req.resolvedScope for the lifetime of the request.
 *
 * Throws if req.isAuthenticated() is false — always gate routes with a
 * requireXxx middleware before calling this function.
 */
export async function resolveUserScope(req: Request): Promise<UserScope> {
  if ((req as any).resolvedScope) {
    return (req as any).resolvedScope as UserScope;
  }

  if (!req.isAuthenticated()) {
    throw new Error("resolveUserScope called on unauthenticated request");
  }

  const role = req.user.role as string;
  const userId = req.user.id;

  let scope: UserScope;

  // ── Global: no data restriction ──────────────────────────────────────────
  if (FULL_ADMIN_ROLES.has(role)) {
    scope = { type: "global", branchId: null, agentId: null };
  }

  // ── Agent: only their own bookings ────────────────────────────────────────
  else if (role === "agent") {
    const [agentRow] = await db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.userId, userId))
      .limit(1);

    let resolvedAgentId = agentRow?.id ?? null;

    // Fallback: if agents.user_id not yet set, match by email and auto-link.
    // This handles accounts created in the admin panel before the user logged in.
    if (!resolvedAgentId) {
      const [profileRow] = await db
        .select({ email: profiles.email })
        .from(profiles)
        .where(eq(profiles.id, userId as any))
        .limit(1);

      if (profileRow?.email) {
        const [agentByEmail] = await db
          .select({ id: agents.id })
          .from(agents)
          .where(eq(agents.email, profileRow.email))
          .limit(1);

        if (agentByEmail) {
          resolvedAgentId = agentByEmail.id;
          // Auto-link so future requests skip this fallback
          await db
            .update(agents)
            .set({ userId })
            .where(eq(agents.id, agentByEmail.id));
        }
      }
    }

    scope = {
      type: "agent",
      branchId: null,
      agentId: resolvedAgentId,
    };
  }

  // ── Branch: branch_manager / staff / finance ──────────────────────────────
  else {
    // profiles.id IS the Supabase auth user id
    const [profileRow] = await db
      .select({ branchId: profiles.branchId })
      .from(profiles)
      .where(eq(profiles.id, userId as any))
      .limit(1);

    scope = {
      type: "branch",
      branchId: profileRow?.branchId ?? null,
      agentId: null,
    };
  }

  (req as any).resolvedScope = scope;
  return scope;
}
