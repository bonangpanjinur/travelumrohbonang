import { describe, expect, it } from "vitest";
import { canAccessAdminRoute, getAdminRouteRoles } from "./adminRouteAccess";

describe("admin route access", () => {
  it("allows operational roles on the admin dashboard", () => {
    expect(canAccessAdminRoute("/admin", "finance")).toBe(true);
    expect(canAccessAdminRoute("/admin", "agent")).toBe(true);
  });

  it("does not allow finance or agent roles on full-admin settings", () => {
    expect(canAccessAdminRoute("/admin/users", "finance")).toBe(false);
    expect(canAccessAdminRoute("/admin/users", "agent")).toBe(false);
    expect(canAccessAdminRoute("/admin/users", "admin")).toBe(true);
  });

  it("keeps nested operational routes active", () => {
    expect(canAccessAdminRoute("/admin/bookings/booking-1", "staff")).toBe(true);
    expect(getAdminRouteRoles("/admin/bookings/booking-1")).toContain("staff");
  });

  it("closes unlisted admin routes to full admins by default", () => {
    expect(canAccessAdminRoute("/admin/internal-only", "admin")).toBe(true);
    expect(canAccessAdminRoute("/admin/internal-only", "staff")).toBe(false);
  });
});
