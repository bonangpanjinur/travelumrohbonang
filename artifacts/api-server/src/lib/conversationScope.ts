import { db, bookings, conversations, eq, and } from "@workspace/db";
import { resolveUserScope } from "./scopeGuard";
import { buildBookingScopeCondition } from "./scopeConditions";
import type { Request } from "express";

/** Returns whether a booking belongs to the authenticated user's tenant scope. */
export async function canAccessBooking(req: Request, bookingId: string): Promise<boolean> {
  const scope = await resolveUserScope(req);
  if (scope.type === "global") return true;

  const condition = buildBookingScopeCondition(scope, "bookings");
  const [row] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), condition))
    .limit(1);
  return Boolean(row);
}

/**
 * Departures do not yet carry their own branch_id. Resolve the tenant through
 * any booking attached to the departure; an unbooked departure is inaccessible
 * to branch staff because its ownership is not established.
 */
export async function canAccessConversation(req: Request, conversationId: string): Promise<boolean> {
  const [conversation] = await db
    .select({ bookingId: conversations.bookingId })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!conversation) return false;
  if (!conversation.bookingId) {
    const scope = await resolveUserScope(req);
    return scope.type === "global";
  }
  return canAccessBooking(req, conversation.bookingId);
}

export async function canAccessDeparture(req: Request, departureId: string): Promise<boolean> {
  const scope = await resolveUserScope(req);
  if (scope.type === "global") return true;

  const condition = buildBookingScopeCondition(scope, "bookings");
  const [row] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.departureId, departureId), condition))
    .limit(1);
  return Boolean(row);
}
