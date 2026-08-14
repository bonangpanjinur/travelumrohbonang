import { describe, expect, it } from "vitest";
import { requireAdmin, requireStaff, requireOperational, requireFinance } from "./middlewares/requireAdmin";
import { isBookingInScope } from "./lib/scopeConditions";
import { FULL_ADMIN_ROLES, STAFF_ROLES, OPERATIONAL_ROLES, FINANCE_ROLES } from "./lib/roleConstants";
import type { UserScope } from "./lib/scopeGuard";

type Gate = typeof requireAdmin;

function runGate(gate: Gate, role: string) {
  let status: number | null = null;
  let nextCalled = false;
  const req = {
    user: { role },
    isAuthenticated: () => true,
    path: "/matrix-test",
  } as any;
  const res = { status: (code: number) => ({ json: () => { status = code; } }) } as any;
  gate(req, res, () => { nextCalled = true; });
  return { status, nextCalled };
}

describe("role matrix — admin gates", () => {
  const roles = ["super_admin", "branch_manager", "staff", "agent"] as const;

  it.each(roles)("global role set is consistent for %s", (role) => {
    expect(typeof role).toBe("string");
    expect(FULL_ADMIN_ROLES.has(role)).toBe(role === "super_admin");
    expect(STAFF_ROLES.has(role)).toBe(role === "super_admin" || role === "branch_manager" || role === "staff");
    expect(OPERATIONAL_ROLES.has(role)).toBe(true);
    expect(FINANCE_ROLES.has(role)).toBe(role === "super_admin" || role === "branch_manager");
  });

  it("enforces gate decisions for the four requested roles", () => {
    expect(runGate(requireAdmin, "super_admin").nextCalled).toBe(true);
    expect(runGate(requireAdmin, "branch_manager").status).toBe(403);
    expect(runGate(requireStaff, "branch_manager").nextCalled).toBe(true);
    expect(runGate(requireStaff, "staff").nextCalled).toBe(true);
    expect(runGate(requireStaff, "agent").status).toBe(403);
    expect(runGate(requireOperational, "agent").nextCalled).toBe(true);
    expect(runGate(requireFinance, "branch_manager").nextCalled).toBe(true);
    expect(runGate(requireFinance, "agent").status).toBe(403);
  });
});

describe("role matrix — tenant ownership", () => {
  const global: UserScope = { type: "global", userId: "global" };
  const branchA: UserScope = { type: "branch", userId: "branch-a-user", branchId: "branch-a" };
  const agentA: UserScope = { type: "agent", userId: "agent-a-user", agentId: "agent-a" };
  const bookingA = { branchId: "branch-a", agentId: "agent-a", picType: "agen", picId: "agent-a" };
  const bookingB = { branchId: "branch-b", agentId: "agent-b", picType: "agen", picId: "agent-b" };
  const bookingAgentPic = { branchId: "branch-b", agentId: null, picType: "agen", picId: "agent-a" };

  it("global can access both tenant rows", () => {
    expect(isBookingInScope(bookingA, global)).toBe(true);
    expect(isBookingInScope(bookingB, global)).toBe(true);
  });

  it("branch manager can access only its branch", () => {
    expect(isBookingInScope(bookingA, branchA)).toBe(true);
    expect(isBookingInScope(bookingB, branchA)).toBe(false);
  });

  it("agent can access owned bookings and PIC bookings only", () => {
    expect(isBookingInScope(bookingA, agentA)).toBe(true);
    expect(isBookingInScope(bookingAgentPic, agentA)).toBe(true);
    expect(isBookingInScope(bookingB, agentA)).toBe(false);
  });
});
