import { describe, it, expect } from "vitest";
import type { Request } from "express";
import {
  ownershipClause,
  isStaffRole,
  AUTH_TABLES,
  DIRECT_OWNER_TABLES,
  BOOKING_OWNED_TABLES,
  STAFF_ONLY_AUTH_TABLES,
} from "./rest";

/**
 * TD5 regression tests — the generic /rest/v1/:table proxy previously gated
 * AUTH_TABLES on `req.isAuthenticated()` only, with no per-row ownership
 * check. Any authenticated buyer could read/tamper with every other user's
 * bookings, payments, contracts, and documents. These tests lock in the
 * row-level ownership fix so it can't silently regress.
 */

function mockRequest(role: string | undefined, userId: string | undefined): Request {
  return { user: userId || role ? { role, id: userId } : undefined } as unknown as Request;
}

describe("isStaffRole", () => {
  it("treats admin/super_admin/branch_manager/staff as staff", () => {
    for (const role of ["admin", "super_admin", "branch_manager", "staff"]) {
      expect(isStaffRole(mockRequest(role, "u1"))).toBe(true);
    }
  });

  it("treats buyer/agent/undefined as non-staff", () => {
    for (const role of ["buyer", "agent", undefined]) {
      expect(isStaffRole(mockRequest(role, "u1"))).toBe(false);
    }
  });
});

describe("ownershipClause", () => {
  it("does not scope staff requests at all (matches legacy full-access behaviour)", () => {
    const values: unknown[] = [];
    const result = ownershipClause("bookings", mockRequest("admin", "staff-1"), values);
    expect(result).toBeNull();
    expect(values).toHaveLength(0);
  });

  it("does not scope tables outside AUTH_TABLES (public tables stay public)", () => {
    const values: unknown[] = [];
    const result = ownershipClause("packages", mockRequest("buyer", "u1"), values);
    expect(result).toBeNull();
  });

  it("fails closed when a non-staff request has no user id", () => {
    const values: unknown[] = [];
    const result = ownershipClause("bookings", mockRequest("buyer", undefined), values);
    expect(result).toEqual({ forbidden: true });
  });

  it("scopes direct-owner tables (e.g. bookings) to the requester's own rows", () => {
    const values: unknown[] = [];
    const result = ownershipClause("bookings", mockRequest("buyer", "u1"), values);
    expect(result).toEqual({ clause: `"bookings"."user_id" = $1` });
    expect(values).toEqual(["u1"]);
  });

  it("scopes booking-owned tables (e.g. payments) via a bookings subquery", () => {
    const values: unknown[] = [];
    const result = ownershipClause("payments", mockRequest("buyer", "u1"), values);
    expect(result).toEqual({
      clause: `"payments"."booking_id" IN (SELECT id FROM "bookings" WHERE "user_id" = $1)`,
    });
    expect(values).toEqual(["u1"]);
  });

  it("forbids non-staff access entirely to staff-only management tables", () => {
    const values: unknown[] = [];
    for (const table of STAFF_ONLY_AUTH_TABLES) {
      const result = ownershipClause(table, mockRequest("buyer", "u1"), values);
      expect(result).toEqual({ forbidden: true });
    }
  });

  it("every AUTH_TABLE is mapped to a direct owner, a booking owner, or staff-only — none fall through silently", () => {
    for (const table of AUTH_TABLES) {
      const isMapped =
        table in DIRECT_OWNER_TABLES ||
        table in BOOKING_OWNED_TABLES ||
        STAFF_ONLY_AUTH_TABLES.has(table);
      expect(isMapped, `AUTH_TABLE "${table}" has no ownership mapping`).toBe(true);
    }
  });
});
