import { type RequestHandler } from "express";

// ── Role sets ────────────────────────────────────────────────────────────────

/** Full admin roles — can access all admin APIs */
const FULL_ADMIN_ROLES = new Set(["super_admin", "admin"]);

/** Staff-level roles — can access operational endpoints only */
const STAFF_ROLES = new Set([
  "super_admin",
  "admin",
  "branch_manager",
  "staff",
]);

/** Operational roles — packages, bookings, agents can also read/submit */
const OPERATIONAL_ROLES = new Set([
  "super_admin",
  "admin",
  "branch_manager",
  "staff",
  "agent",
]);

// ── Middleware ───────────────────────────────────────────────────────────────

/** Full admin gate: super_admin + admin only. Used as the default global gate. */
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!FULL_ADMIN_ROLES.has(req.user.role as string)) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
};

/**
 * Staff gate: super_admin, admin, branch_manager, staff.
 * Use on operational routers (bookings, pilgrims, documents, departures, etc.)
 * where branch managers and staff need read/write access.
 */
export const requireStaff: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!STAFF_ROLES.has(req.user.role as string)) {
    res.status(403).json({ error: "Staff access required" });
    return;
  }
  next();
};

/**
 * Operational gate: super_admin, admin, branch_manager, staff, agent.
 * Use on routes where agents need read access (packages, their own bookings).
 */
export const requireOperational: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!OPERATIONAL_ROLES.has(req.user.role as string)) {
    res.status(403).json({ error: "Operational access required" });
    return;
  }
  next();
};

/** Super admin gate: super_admin only. Use on role management and integrations. */
export const requireSuperAdmin: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (req.user.role !== "super_admin") {
    res.status(403).json({ error: "Super admin access required" });
    return;
  }
  next();
};
