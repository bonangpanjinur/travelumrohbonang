/**
 * Sprint A — Data Isolation: SQL scope condition builders
 *
 * These helpers translate a UserScope into parameterised SQL fragments
 * that can be injected into any WHERE clause to enforce data isolation.
 *
 * Usage:
 *   const scope = await resolveUserScope(req);
 *   const cond  = buildBookingScopeCondition(scope);
 *   // ...inject into sql`WHERE ${cond} AND ...`
 */

import { sql } from "@workspace/db";
import type { UserScope } from "./scopeGuard";

/**
 * Returns a parameterised SQL fragment that restricts booking rows to those
 * visible to the given scope.
 *
 * @param scope  - resolved from resolveUserScope()
 * @param alias  - table alias used in the query, default 'b' (bookings b)
 *
 * Result:
 *   global → TRUE                              (no restriction)
 *   branch → b.branch_id = $branchId          (only this branch)
 *            OR FALSE when branchId is null    (misconfigured account)
 *   agent  → (b.agent_id = $agentId
 *              OR (b.pic_type = 'agen' AND b.pic_id = $agentId))
 *            OR FALSE when agentId is null     (no agent record)
 */
export function buildBookingScopeCondition(
  scope: UserScope,
  alias = "b",
): ReturnType<typeof sql> {
  if (scope.type === "global") {
    return sql`TRUE`;
  }

  if (scope.type === "branch") {
    if (!scope.branchId) {
      // Branch-scoped user with no branch configured — show nothing
      return sql`FALSE`;
    }
    return sql`${sql.raw(alias)}.branch_id = ${scope.branchId}`;
  }

  // scope.type === 'agent'
  if (!scope.agentId) {
    // Agent user with no agents record — show nothing
    return sql`FALSE`;
  }
  return sql`(
    ${sql.raw(alias)}.agent_id = ${scope.agentId}
    OR (${sql.raw(alias)}.pic_type = 'agen' AND ${sql.raw(alias)}.pic_id = ${scope.agentId})
  )`;
}

/**
 * Post-fetch ownership check — use after fetching a single booking by ID to
 * verify the row belongs to the current user's scope before returning it.
 *
 * @param booking  - raw row with at least { branchId, agentId, picType, picId }
 * @param scope    - resolved from resolveUserScope()
 */
export function isBookingInScope(
  booking: {
    branchId?: string | null;
    agentId?: string | null;
    picType?: string | null;
    picId?: string | null;
  },
  scope: UserScope,
): boolean {
  if (scope.type === "global") return true;

  if (scope.type === "branch") {
    if (!scope.branchId) return false;
    return booking.branchId === scope.branchId;
  }

  // agent
  if (!scope.agentId) return false;
  return (
    booking.agentId === scope.agentId ||
    (booking.picType === "agen" && booking.picId === scope.agentId)
  );
}

/**
 * Human-readable error message when scope check fails on a single-resource
 * endpoint (GET /:id, PATCH /:id, etc.).
 */
export function scopeDeniedMessage(scope: UserScope): string {
  if (scope.type === "branch") {
    return "Anda tidak memiliki akses ke booking di luar cabang Anda.";
  }
  if (scope.type === "agent") {
    return "Anda hanya dapat mengakses booking yang Anda tangani sendiri.";
  }
  return "Akses ditolak.";
}
