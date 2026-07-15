import { Router } from "express";
import { db } from "@workspace/db";
import { roleMenuPermissions } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { logDiag } from "../../lib/tempDiagnosticLog"; // TEMP DIAG
import { sendAdminError } from "../../lib/adminApiError";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "../../lib/supabaseEnv";

const ADMIN_ROLES = new Set(["super_admin", "admin", "branch_manager", "staff", "agent"]);

const router = Router();

// When DATABASE_URL is not a real Postgres URL (e.g. Vercel without it set),
// querying via the Drizzle pool times out and this route returns 503. Fall
// back to forwarding reads/writes to Supabase's REST API (PostgREST) with
// the service role key instead, same pattern as routes/rest.ts.
const USE_SUPABASE_HTTP =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes("localhost/placeholder") ||
  process.env.DATABASE_URL === "postgres://localhost/placeholder";

function supabaseConfigured(res: import("express").Response): boolean {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(503).json({
      error: "Supabase not configured",
      detail: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
    });
    return false;
  }
  return true;
}

async function supabaseFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    signal: AbortSignal.timeout(12_000),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

/**
 * GET /api/admin/menu-permissions/my
 * Returns only the permissions for the current user's role.
 * Accessible by all admin roles (requireOperational in index.ts).
 */
router.get("/my", (req, _res, next) => { logDiag("GET /menu-permissions/my:before-handler", req); next(); }, async (req, res) => { // TEMP DIAG
  const role = req.user?.role as string | undefined;
  if (!role || !ADMIN_ROLES.has(role)) {
    res.json({ data: [] });
    return;
  }
  if (USE_SUPABASE_HTTP) {
    if (!supabaseConfigured(res)) return;
    try {
      const sbRes = await supabaseFetch(`role_menu_permissions?role=eq.${encodeURIComponent(role)}&select=*`);
      const body = await sbRes.json().catch(() => []);
      if (!sbRes.ok) {
        res.status(sbRes.status === 401 || sbRes.status === 403 ? sbRes.status : 502).json({ error: "Supabase request failed", detail: body });
        return;
      }
      res.json({ data: body });
    } catch (err) {
      sendAdminError(res, "GET /api/admin/menu-permissions/my", err);
    }
    return;
  }
  try {
    const rows = await db
      .select()
      .from(roleMenuPermissions)
      .where(eq(roleMenuPermissions.role, role));
    res.json({ data: rows });
  } catch (err) {
    sendAdminError(res, "GET /api/admin/menu-permissions/my", err);
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
  if (USE_SUPABASE_HTTP) {
    if (!supabaseConfigured(res)) return;
    try {
      const sbRes = await supabaseFetch(`role_menu_permissions?select=*`);
      const body = await sbRes.json().catch(() => []);
      if (!sbRes.ok) {
        res.status(sbRes.status === 401 || sbRes.status === 403 ? sbRes.status : 502).json({ error: "Supabase request failed", detail: body });
        return;
      }
      res.json({ data: body });
    } catch (err) {
      sendAdminError(res, "GET /api/admin/menu-permissions", err);
    }
    return;
  }
  try {
    const rows = await db.select().from(roleMenuPermissions);
    res.json({ data: rows });
  } catch (err) {
    sendAdminError(res, "GET /api/admin/menu-permissions", err);
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

  const now = new Date();

  if (USE_SUPABASE_HTTP) {
    if (!supabaseConfigured(res)) return;
    try {
      // PostgREST upsert on the (role, menu_key) unique constraint.
      const sbRes = await supabaseFetch(`role_menu_permissions?on_conflict=role,menu_key`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(
          valid.map((p) => ({
            id: randomUUID(),
            role: p.role,
            menu_key: p.menuKey,
            enabled: p.enabled,
            updated_at: now.toISOString(),
          })),
        ),
      });
      if (!sbRes.ok) {
        const body = await sbRes.json().catch(() => null);
        res.status(sbRes.status === 401 || sbRes.status === 403 ? sbRes.status : 502).json({ error: "Supabase request failed", detail: body });
        return;
      }
      res.json({
        success: true,
        saved: valid.length,
        skipped: permissions.length - valid.length,
      });
    } catch (err) {
      sendAdminError(res, "PUT /api/admin/menu-permissions", err);
    }
    return;
  }

  try {
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
  } catch (err) {
    sendAdminError(res, "PUT /api/admin/menu-permissions", err);
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
  if (USE_SUPABASE_HTTP) {
    if (!supabaseConfigured(res)) return;
    try {
      // PostgREST refuses an unfiltered DELETE without a real predicate;
      // role=neq.__none__ matches every row while satisfying that guard.
      const sbRes = await supabaseFetch(`role_menu_permissions?role=neq.__none__`, { method: "DELETE" });
      if (!sbRes.ok) {
        const body = await sbRes.json().catch(() => null);
        res.status(sbRes.status === 401 || sbRes.status === 403 ? sbRes.status : 502).json({ error: "Supabase request failed", detail: body });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      sendAdminError(res, "DELETE /api/admin/menu-permissions/reset", err);
    }
    return;
  }

  try {
    await db.delete(roleMenuPermissions);
    res.json({ success: true });
  } catch (err) {
    sendAdminError(res, "DELETE /api/admin/menu-permissions/reset", err);
  }
});

export default router;
