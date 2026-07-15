/**
 * Single source of truth for role hierarchy and role sets.
 * P3-9: Previously these were duplicated across authMiddleware.ts,
 * requireAdmin.ts, and useAuth.tsx (frontend). Backend imports from here;
 * frontend has its own copy in src/shared/lib/roleConstants.ts but both
 * must be kept in sync (same values, different modules).
 */

/** All valid roles ordered from most to least privileged. */
export const ROLE_HIERARCHY = [
  "super_admin",
  "admin",
  "branch_manager",
  "staff",
  "agent",
  "buyer",
  "user",
] as const;

export type AppRole = (typeof ROLE_HIERARCHY)[number];

/**
 * Numeric rank. Lower = more privileged.
 * Used by moreRestrictiveRole() to resolve conflicts between local DB
 * and Supabase role stores: higher rank number wins (demotions take effect
 * immediately even when local cache is stale).
 */
export const ROLE_RANK: Record<string, number> = {
  super_admin: 0,
  admin: 1,
  branch_manager: 2,
  staff: 3,
  agent: 4,
  buyer: 5,
  user: 6,
};

// ── Role Sets (imported by requireAdmin.ts) ───────────────────────────────────

/** Full admin: super_admin + admin only. Default admin router gate. */
export const FULL_ADMIN_ROLES = new Set(["super_admin", "admin"]);

/** Staff: super_admin, admin, branch_manager, staff. */
export const STAFF_ROLES = new Set([
  "super_admin",
  "admin",
  "branch_manager",
  "staff",
]);

/** Operational: staff + agent. Use on booking/package read routes. */
export const OPERATIONAL_ROLES = new Set([
  "super_admin",
  "admin",
  "branch_manager",
  "staff",
  "agent",
]);

/** Finance: super_admin, admin, branch_manager. */
export const FINANCE_ROLES = new Set([
  "super_admin",
  "admin",
  "branch_manager",
]);
