import { Router } from "express";
import { db } from "@workspace/db";
import { roleMenuPermissions } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { logDiag } from "../../lib/tempDiagnosticLog"; // TEMP DIAG

const ADMIN_ROLES = new Set(["super_admin", "admin", "branch_manager", "staff", "agent"]);

const router = Router();

/**
 * GET /api/admin/menu-permissions/my
 * Returns only the permissions for the current user's role.
 * Accessible by all admin roles (requireOperational in index.ts).
 */
router.get("/my", (req, _res, next) => { logDiag("GET /menu-permissions/my:before-handler", req); next(); }, async (req, res) => { // TEMP DIAG
  try {
    const role = req.user?.role as string | undefined;
    if (!role || !ADMIN_ROLES.has(role)) {
      res.json({ data: [] });
      return;
    }
    const rows = await db
      .select()
      .from(roleMenuPermissions)
      .where(eq(roleMenuPermissions.role, role));
    res.json({ data: rows });
  } catch (err: any) {
    console.error("[menu-permissions] GET /my DB error:", err?.message, err?.code);
    // Return empty data instead of 500 — table may not exist in this environment yet
    res.json({ data: [] });
  }
});

/**
 * GET /api/admin/menu-permissions
 * Returns ALL role_menu_permissions rows (all roles).
 * Only super_admin + admin (requireAdmin in index.ts enforced externally,
 * plus inline guard here for safety).
 */
router.get("/", async (req, res) => {
  const role = req.user?.role as string | undefined;
  if (role !== "super_admin" && role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  try {
    const rows = await db.select().from(roleMenuPermissions);
    res.json({ data: rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch menu permissions" });
  }
});

/**
 * PUT /api/admin/menu-permissions
 * Bulk upsert permissions for all roles × menu items.
 * Runs in a single transaction — all or nothing.
 * Only super_admin.
 *
 * Body: { permissions: Array<{ role, menuKey, enabled }> }
 */
router.put("/", async (req, res) => {
  if (req.user?.role !== "super_admin") {
    res.status(403).json({ error: "Super admin access required" });
    return;
  }

  const { permissions } = req.body as {
    permissions: Array<{ role: string; menuKey: string; enabled: boolean }>;
  };

  if (!Array.isArray(permissions) || permissions.length === 0) {
    res.status(400).json({ error: "permissions array required" });
    return;
  }

  // Validate entries upfront
  const valid = permissions.filter(
    (p) =>
      ADMIN_ROLES.has(p.role) &&
      typeof p.menuKey === "string" &&
      p.menuKey.length > 0 &&
      typeof p.enabled === "boolean"
  );

  if (valid.length === 0) {
    res.status(400).json({ error: "No valid permission entries" });
    return;
  }

  try {
    const now = new Date();

    // Wrap all upserts in a single transaction — partial writes are not acceptable
    await db.transaction(async (tx) => {
      for (const p of valid) {
        await tx
          .insert(roleMenuPermissions)
          .values({
            id: randomUUID(),
            role: p.role,
            menuKey: p.menuKey,
            enabled: p.enabled,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [roleMenuPermissions.role, roleMenuPermissions.menuKey],
            set: { enabled: p.enabled, updatedAt: now },
          });
      }
    });

    res.json({
      success: true,
      saved: valid.length,
      skipped: permissions.length - valid.length,
    });
  } catch {
    res.status(500).json({ error: "Failed to save menu permissions" });
  }
});

/**
 * DELETE /api/admin/menu-permissions/reset
 * Clears all stored overrides — sidebar reverts to static defaults.
 * Only super_admin.
 */
router.delete("/reset", async (req, res) => {
  if (req.user?.role !== "super_admin") {
    res.status(403).json({ error: "Super admin access required" });
    return;
  }
  try {
    await db.delete(roleMenuPermissions);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to reset menu permissions" });
  }
});

export default router;
