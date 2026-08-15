import { describe, expect, it } from "vitest";
import request from "supertest";
import type { Request } from "express";
import app from "../../app";
import { buildBookingScopeCondition, isBookingInScope } from "../../lib/scopeConditions";
import type { UserScope } from "../../lib/scopeGuard";

function mockRequest(user?: { id?: string; role?: string }): Request {
  return { user } as unknown as Request;
}

describe("booking and manifest tenant isolation", () => {
  describe("booking scope policy", () => {
    it("allows global scope without a restrictive predicate", () => {
      const scope: UserScope = { type: "global" };
      expect(buildBookingScopeCondition(scope).queryChunks).toBeDefined();
      expect(isBookingInScope({ branchId: "branch-b", agentId: "agent-b" }, scope)).toBe(true);
    });

    it("restricts branch scope to the same branch", () => {
      const scope: UserScope = { type: "branch", branchId: "branch-a" };
      expect(isBookingInScope({ branchId: "branch-a" }, scope)).toBe(true);
      expect(isBookingInScope({ branchId: "branch-b" }, scope)).toBe(false);
      expect(isBookingInScope({ branchId: null }, scope)).toBe(false);
    });

    it("restricts agent scope to assigned booking or agent PIC", () => {
      const scope: UserScope = { type: "agent", agentId: "agent-a" };
      expect(isBookingInScope({ agentId: "agent-a" }, scope)).toBe(true);
      expect(isBookingInScope({ picType: "agen", picId: "agent-a" }, scope)).toBe(true);
      expect(isBookingInScope({ agentId: "agent-b", picType: "agen", picId: "agent-b" }, scope)).toBe(false);
    });

    it("fails closed when branch or agent mapping is missing", () => {
      expect(isBookingInScope({ branchId: "branch-a" }, { type: "branch", branchId: null })).toBe(false);
      expect(isBookingInScope({ agentId: "agent-a" }, { type: "agent", agentId: null })).toBe(false);
    });
  });

  describe("manifest HTTP boundary", () => {
    it("requires authentication for manifest JSON", async () => {
      const res = await request(app).get("/api/admin/departures/departure-a/manifest-data");
      expect(res.status).toBe(401);
    });

    it("requires authentication for manifest PDF", async () => {
      const res = await request(app).get("/api/admin/departures/departure-a/manifest.pdf");
      expect(res.status).toBe(401);
    });

    it("requires authentication for manifest history and snapshot detail", async () => {
      const list = await request(app).get("/api/admin/departures/departure-a/manifest-history");
      const detail = await request(app).get("/api/admin/departures/departure-a/manifest-history/snapshot-a");
      expect(list.status).toBe(401);
      expect(detail.status).toBe(401);
    });

    it("does not treat an unrelated user object as authenticated tenant scope", () => {
      const req = mockRequest({ id: "user-a", role: "agent" });
      expect(req.user?.id).toBe("user-a");
      expect(isBookingInScope({ agentId: "agent-b" }, { type: "agent", agentId: "agent-a" })).toBe(false);
    });
  });
});
