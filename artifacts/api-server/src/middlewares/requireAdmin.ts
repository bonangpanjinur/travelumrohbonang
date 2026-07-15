import { type RequestHandler } from "express";
// P3-9: Role sets are now defined once in roleConstants.ts and imported here.
import {
  FULL_ADMIN_ROLES,
  STAFF_ROLES,
  OPERATIONAL_ROLES,
  FINANCE_ROLES,
} from "../lib/roleConstants";

const isDev = process.env.NODE_ENV !== "production";

// ── Middleware ───────────────────────────────────────────────────────────────

/** Full admin gate: super_admin + admin only. Used as the default global gate. */
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (isDev) console.log(`[requireAdmin] checking — role=${(req.user as any)?.role ?? "(unauthenticated)"} path=${req.path}`);

  if (!req.isAuthenticated()) {
    if (isDev) console.log("[requireAdmin] DENIED — not authenticated");
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!FULL_ADMIN_ROLES.has(req.user.role as string)) {
    if (isDev) console.log(`[requireAdmin] DENIED — role=${(req.user as any).role} not in FULL_ADMIN_ROLES`);
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  if (isDev) console.log(`[requireAdmin] granted — role=${(req.user as any).role}`);
  next();
};

/**
 * Staff gate: super_admin, admin, branch_manager, staff.
 * Use on operational routers (bookings, pilgrims, documents, departures, etc.)
 * where branch managers and staff need read/write access.
 */
export const requireStaff: RequestHandler = (req, res, next) => {
  if (isDev) console.log(`[requireStaff] checking — role=${(req.user as any)?.role ?? "(unauthenticated)"} path=${req.path}`);

  if (!req.isAuthenticated()) {
    if (isDev) console.log("[requireStaff] DENIED — not authenticated");
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!STAFF_ROLES.has(req.user.role as string)) {
    if (isDev) console.log(`[requireStaff] DENIED — role=${(req.user as any).role} not in STAFF_ROLES`);
    res.status(403).json({ error: "Staff access required" });
    return;
  }
  if (isDev) console.log(`[requireStaff] granted — role=${(req.user as any).role}`);
  next();
};

/**
 * Operational gate: super_admin, admin, branch_manager, staff, agent.
 * Use on routes where agents need read access (packages, their own bookings).
 */
export const requireOperational: RequestHandler = (req, res, next) => {
  if (isDev) console.log(`[requireOperational] checking — role=${(req.user as any)?.role ?? "(unauthenticated)"} path=${req.path}`);

  if (!req.isAuthenticated()) {
    if (isDev) console.log("[requireOperational] DENIED — not authenticated");
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!OPERATIONAL_ROLES.has(req.user.role as string)) {
    if (isDev) console.log(`[requireOperational] DENIED — role=${(req.user as any).role} not in OPERATIONAL_ROLES`);
    res.status(403).json({ error: "Operational access required" });
    return;
  }
  if (isDev) console.log(`[requireOperational] granted — role=${(req.user as any).role}`);
  next();
};

/**
 * Finance gate: super_admin, admin, branch_manager.
 * Use on money/reporting endpoints (payments summaries, analytics, refunds review).
 */
export const requireFinance: RequestHandler = (req, res, next) => {
  if (isDev) console.log(`[requireFinance] checking — role=${(req.user as any)?.role ?? "(unauthenticated)"} path=${req.path}`);

  if (!req.isAuthenticated()) {
    if (isDev) console.log("[requireFinance] DENIED — not authenticated");
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!FINANCE_ROLES.has(req.user.role as string)) {
    if (isDev) console.log(`[requireFinance] DENIED — role=${(req.user as any).role} not in FINANCE_ROLES`);
    res.status(403).json({ error: "Finance access required" });
    return;
  }
  if (isDev) console.log(`[requireFinance] granted — role=${(req.user as any).role}`);
  next();
};

/** Super admin gate: super_admin only. Use on role management and integrations. */
export const requireSuperAdmin: RequestHandler = (req, res, next) => {
  if (isDev) console.log(`[requireSuperAdmin] checking — role=${(req.user as any)?.role ?? "(unauthenticated)"} path=${req.path}`);

  if (!req.isAuthenticated()) {
    if (isDev) console.log("[requireSuperAdmin] DENIED — not authenticated");
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (req.user.role !== "super_admin") {
    if (isDev) console.log(`[requireSuperAdmin] DENIED — role=${(req.user as any).role} is not super_admin`);
    res.status(403).json({ error: "Super admin access required" });
    return;
  }
  if (isDev) console.log(`[requireSuperAdmin] granted — role=${(req.user as any).role}`);
  next();
};
