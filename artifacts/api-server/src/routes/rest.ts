import { Router, Request, Response } from "express";
import { pool } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "../lib/supabaseEnv";

// When DATABASE_URL is not a real Postgres URL (e.g. Vercel without DATABASE_URL set),
// fall back to forwarding requests to Supabase's REST API (PostgREST) directly.
// This avoids connection timeouts that would cause Vercel serverless functions to 500.
const USE_SUPABASE_HTTP =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes("localhost/placeholder") ||
  process.env.DATABASE_URL === "postgres://localhost/placeholder";

async function supabaseForward(
  req: Request,
  res: Response,
  table: string,
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(503).json({
      error: "Supabase not configured",
      detail: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
    });
    return;
  }

  // Reconstruct the query string and forward to PostgREST
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  const url = `${SUPABASE_URL}/rest/v1/${table}${qs ? `?${qs}` : ""}`;

  // Determine the token to use when forwarding to PostgREST.
  // Auth-gated tables MUST use the user's own JWT so that Supabase RLS applies.
  // Public tables use the service-role key for unrestricted read access.
  // Never fall back to service-role for AUTH_TABLES — that would bypass RLS.
  let token: string;
  if (AUTH_TABLES.has(table)) {
    const userJwt = req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? null;
    if (!userJwt) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    token = userJwt;
  } else {
    token = SUPABASE_SERVICE_ROLE_KEY;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    // apikey is always the service/anon key — it identifies the project, not the user
    apikey: SUPABASE_SERVICE_ROLE_KEY,
  };
  if (req.headers["prefer"]) headers["Prefer"] = req.headers["prefer"] as string;
  if (req.headers["range"]) headers["Range"] = req.headers["range"] as string;
  if (req.headers["accept"]) headers["Accept"] = req.headers["accept"] as string;

  try {
    const sbRes = await fetch(url, {
      method: req.method,
      headers,
      body:
        req.method !== "GET" && req.method !== "HEAD"
          ? JSON.stringify(req.body)
          : undefined,
    });

    const contentRange = sbRes.headers.get("content-range");
    if (contentRange) res.setHeader("Content-Range", contentRange);
    const contentType = sbRes.headers.get("content-type") ?? "application/json";
    res.setHeader("Content-Type", contentType);

    const body = await sbRes.text();
    res.status(sbRes.status).end(body);
  } catch (err) {
    res.status(502).json({ error: "Supabase proxy error", detail: String(err) });
  }
}

const router = Router();

// ── Allowed table whitelist ──────────────────────────────────────────────────
// Tables accessible via GET (public read) — safe for unauthenticated access.
const PUBLIC_READ_TABLES = new Set([
  "packages", "package_categories", "package_departures", "departure_prices",
  "package_hotels", "hotels", "airlines", "airports", "muthawifs", "branches",
  "testimonials", "faqs", "blog_posts", "gallery", "site_settings", "tenant_sites",
  "itineraries", "itinerary_days", "currencies", "departure_gallery", "manasik_materials",
  "services", "guide_steps", "advantages", "navigation_items", "floating_buttons",
  "pages", "package_reviews", "package_commissions",
  "tenant_site_packages", "pilgrim_testimonials", "slug_redirects",
  "seo_overrides", "coupons", "agents", "template_pricing",
]);

// Tables that require the user to be authenticated for any access.
const AUTH_TABLES = new Set([
  "profiles", "bookings", "booking_rooms", "booking_pilgrims", "booking_payments",
  "wishlists", "notifications", "pilgrim_documents", "contracts",
  "crm_contacts", "audit_logs", "error_logs", "request_log",
  "template_upgrade_orders", "affiliate_clicks", "user_roles",
  "leads", "lead_follow_ups", "loyalty_balances", "loyalty_points",
  "financial_transactions", "chat_messages", "pilgrim_doc_access_logs",
  "package_costs", "payment_proof_access_logs", "payments", "agent_commissions",
  "flight_details", "installment_schedules", "payment_gateway_transactions",
]);

// All tables allowed through the proxy (union of both sets).
const ALLOWED_TABLES = new Set([...PUBLIC_READ_TABLES, ...AUTH_TABLES]);

// ── FK maps for nested selects ───────────────────────────────────────────────

// Forward FK: main_table has FK col → related_table.id  (single object result)
const FORWARD_FKS: Record<string, Record<string, string>> = {
  bookings: {
    packages: "package_id",
    package_departures: "departure_id",
    profiles: "user_id",
    branches: "branch_id",
    agents: "agent_id",
  },
  profiles: { branches: "branch_id" },
  departure_prices: { package_departures: "departure_id" },
  package_hotels: { packages: "package_id" },
  booking_rooms: { bookings: "booking_id" },
  booking_pilgrims: { bookings: "booking_id" },
  booking_payments: { bookings: "booking_id" },
  wishlists: { profiles: "user_id", packages: "package_id" },
  packages: {
    package_categories: "category_id",
    airlines: "airline_id",
    airports: "airport_id",
  },
  package_departures: { packages: "package_id", muthawifs: "muthawif_id" },
  pilgrim_documents: { bookings: "booking_id", booking_pilgrims: "pilgrim_id" },
  tenant_site_packages: { packages: "package_id", tenant_sites: "tenant_site_id" },
  audit_logs: { profiles: "user_id" },
};

// Reverse FK: nested_table has FK col → main_table.id  (array result)
const REVERSE_FKS: Record<string, Record<string, string>> = {
  package_departures: { departure_prices: "departure_id", departure_gallery: "departure_id" },
  packages: {
    package_hotels: "package_id",
    package_departures: "package_id",
    package_commissions: "package_id",
    faqs: "package_id",
    tenant_site_packages: "package_id",
  },
  bookings: {
    booking_rooms: "booking_id",
    booking_pilgrims: "booking_id",
    booking_payments: "booking_id",
    pilgrim_documents: "booking_id",
  },
  profiles: { bookings: "user_id", wishlists: "user_id" },
  tenant_sites: { tenant_site_packages: "tenant_site_id" },
  booking_pilgrims: { pilgrim_documents: "pilgrim_id" },
};

// ── Utilities ────────────────────────────────────────────────────────────────

function splitTopLevel(str: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of str) {
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (ch === "," && depth === 0) {
      if (cur.trim()) parts.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function safeCol(name: string): boolean {
  return /^[a-z_][a-z0-9_]*$/.test(name);
}

function buildSelectClause(table: string, selectStr: string): string {
  if (!selectStr || selectStr === "*") return `"${table}".*`;
  const parts = splitTopLevel(selectStr);
  const clauses: string[] = [];

  for (const part of parts) {
    // Match nested: [alias:]relTable[!inner](cols)
    const m = part.match(/^(?:(\w+):)?(\w+)(?:![a-z]+)?\(([^)]*)\)$/);
    if (m) {
      const alias = m[1] || m[2];
      const relTable = m[2];
      const relCols = (m[3] || "*").trim();

      if (!safeCol(relTable) || !safeCol(alias)) continue;

      const fwdFk = FORWARD_FKS[table]?.[relTable];
      if (fwdFk) {
        // Single object via forward FK
        let colSelect: string;
        if (relCols === "*") {
          colSelect = "*";
        } else {
          colSelect = splitTopLevel(relCols)
            .filter((c) => safeCol(c.trim()))
            .map((c) => `"${c.trim()}"`)
            .join(", ");
        }
        clauses.push(
          `(SELECT row_to_json(r) FROM (SELECT ${colSelect} FROM "${relTable}" WHERE "${relTable}"."id" = "${table}"."${fwdFk}") r) AS "${alias}"`
        );
        continue;
      }

      const revFk = REVERSE_FKS[table]?.[relTable];
      if (revFk) {
        // Array via reverse FK
        let aggExpr: string;
        if (relCols === "*") {
          aggExpr = `row_to_json("${relTable}".*)`;
        } else {
          const colPairs = splitTopLevel(relCols)
            .filter((c) => safeCol(c.trim()))
            .map((c) => `'${c.trim()}', "${relTable}"."${c.trim()}"`)
            .join(", ");
          aggExpr = `json_build_object(${colPairs})`;
        }
        clauses.push(
          `(SELECT COALESCE(json_agg(${aggExpr}), '[]'::json) FROM "${relTable}" WHERE "${relTable}"."${revFk}" = "${table}"."id") AS "${alias}"`
        );
        continue;
      }

      // Unknown relation — null placeholder
      clauses.push(`NULL AS "${alias}"`);
    } else {
      const col = part.trim();
      if (col === "*") {
        clauses.push(`"${table}".*`);
      } else if (safeCol(col)) {
        clauses.push(`"${table}"."${col}"`);
      }
    }
  }

  return clauses.length ? clauses.join(", ") : `"${table}".*`;
}

function buildFilterClause(
  table: string,
  col: string,
  op: string,
  rawVal: string,
  values: unknown[]
): string | null {
  if (!safeCol(col)) return null;
  const colExpr = `"${table}"."${col}"`;
  const nextIdx = values.length + 1;

  switch (op) {
    case "eq":
      if (rawVal === "null") return `${colExpr} IS NULL`;
      values.push(rawVal);
      return `${colExpr} = $${nextIdx}`;
    case "neq":
    case "ne":
      if (rawVal === "null") return `${colExpr} IS NOT NULL`;
      values.push(rawVal);
      return `${colExpr} != $${nextIdx}`;
    case "gt":
      values.push(rawVal);
      return `${colExpr} > $${nextIdx}`;
    case "gte":
      values.push(rawVal);
      return `${colExpr} >= $${nextIdx}`;
    case "lt":
      values.push(rawVal);
      return `${colExpr} < $${nextIdx}`;
    case "lte":
      values.push(rawVal);
      return `${colExpr} <= $${nextIdx}`;
    case "like":
      values.push(rawVal);
      return `${colExpr} LIKE $${nextIdx}`;
    case "ilike":
      values.push(rawVal);
      return `${colExpr} ILIKE $${nextIdx}`;
    case "is":
      return rawVal === "null" ? `${colExpr} IS NULL` : `${colExpr} IS NOT NULL`;
    case "in": {
      const items = rawVal.replace(/^\(|\)$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
      if (!items.length) return null;
      const placeholders = items.map((_, i) => `$${nextIdx + i}`).join(", ");
      items.forEach((v) => values.push(v));
      return `${colExpr} IN (${placeholders})`;
    }
    default:
      return null;
  }
}

function buildWhere(
  table: string,
  query: Record<string, string>,
  values: unknown[]
): string {
  const RESERVED = new Set([
    "select", "order", "limit", "offset", "or", "and", "count",
  ]);
  const conditions: string[] = [];

  // Handle or=(col1.op.val,col2.op.val)
  if (query.or) {
    const inner = query.or.replace(/^\(|\)$/g, "");
    const orParts = splitTopLevel(inner);
    const orClauses: string[] = [];
    for (const part of orParts) {
      const dot1 = part.indexOf(".");
      if (dot1 === -1) continue;
      const col = part.substring(0, dot1);
      const rest = part.substring(dot1 + 1);
      const dot2 = rest.indexOf(".");
      if (dot2 === -1) continue;
      const op = rest.substring(0, dot2);
      const val = rest.substring(dot2 + 1);
      const clause = buildFilterClause(table, col, op, val, values);
      if (clause) orClauses.push(clause);
    }
    if (orClauses.length) conditions.push(`(${orClauses.join(" OR ")})`);
  }

  for (const [key, val] of Object.entries(query)) {
    if (RESERVED.has(key)) continue;

    let col = key;
    let negate = false;
    if (key.startsWith("not.")) {
      col = key.slice(4);
      negate = true;
    }

    const dot = val.indexOf(".");
    if (dot === -1) continue;
    const op = val.substring(0, dot);
    const rawVal = val.substring(dot + 1);

    const clause = buildFilterClause(table, col, op, rawVal, values);
    if (clause) conditions.push(negate ? `NOT (${clause})` : clause);
  }

  return conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
}

function buildOrderClause(table: string, orderStr: string): string {
  if (!orderStr) return "";
  const parts = orderStr.split(",");
  const clauses = parts
    .map((p) => {
      const segments = p.trim().split(".");
      const col = segments[0];
      const dir = segments[1] === "desc" ? "DESC" : "ASC";
      const nulls = segments[2] === "nullsfirst" ? "NULLS FIRST" : segments[2] === "nullslast" ? "NULLS LAST" : "";
      if (!safeCol(col)) return null;
      return `"${table}"."${col}" ${dir} ${nulls}`.trim();
    })
    .filter(Boolean);
  return clauses.length ? `ORDER BY ${clauses.join(", ")}` : "";
}

// ── GET ──────────────────────────────────────────────────────────────────────

router.get("/:table", async (req: Request, res: Response) => {
  const { table } = req.params as Record<string, string>;
  if (!ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ message: `Table "${table}" not allowed` });
  }

  // Tables in AUTH_TABLES require authentication even for reads.
  if (AUTH_TABLES.has(table) && !req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Supabase HTTP proxy mode (Vercel: no DATABASE_URL)
  if (USE_SUPABASE_HTTP) {
    await supabaseForward(req, res, table);
    return;
  }

  try {
    const q = req.query as Record<string, string>;
    const values: unknown[] = [];

    const selectClause = buildSelectClause(table, q.select || "*");
    const whereClause = buildWhere(table, q, values);
    const orderClause = buildOrderClause(table, q.order || "");
    const limitClause = q.limit ? `LIMIT ${Math.max(0, parseInt(q.limit, 10))}` : "";
    const offsetClause = q.offset ? `OFFSET ${Math.max(0, parseInt(q.offset, 10))}` : "";

    const sql = [
      `SELECT ${selectClause} FROM "${table}"`,
      whereClause, orderClause, limitClause, offsetClause,
    ].filter(Boolean).join(" ");

    const result = await pool.query(sql, values);

    const accept = req.headers["accept"] || "";
    if (accept.includes("pgrst.object")) {
      if (!result.rows.length) {
        return res.status(406).json({ code: "PGRST116", message: "The result contains 0 rows" });
      }
      return res.json(result.rows[0]);
    }

    const prefer = (req.headers["prefer"] as string) || "";
    if (prefer.includes("count=exact")) {
      const countSql = `SELECT COUNT(*) FROM "${table}" ${whereClause}`;
      const countResult = await pool.query(countSql, values);
      const total = parseInt(countResult.rows[0].count, 10);
      const offset = q.offset ? parseInt(q.offset, 10) : 0;
      const limit = q.limit ? parseInt(q.limit, 10) : total;
      const end = Math.max(0, Math.min(offset + limit - 1, total - 1));
      res.setHeader("Content-Range", `${offset}-${end}/${total}`);
    }

    res.json(result.rows);
  } catch (err: any) {
    console.error(`[REST] GET /${table}:`, err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── POST (INSERT / UPSERT) ───────────────────────────────────────────────────

router.post("/:table", requireAuth, async (req: Request, res: Response) => {
  const { table } = req.params as Record<string, string>;
  if (!ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ message: `Table "${table}" not allowed` });
  }

  if (USE_SUPABASE_HTTP) {
    await supabaseForward(req, res, table);
    return;
  }

  try {
    const prefer = (req.headers["prefer"] as string) || "";
    const accept = req.headers["accept"] || "";
    const wantsReturn = prefer.includes("return=representation") || accept.includes("pgrst.object");
    const isUpsert = prefer.includes("resolution=merge-duplicates");
    const ignoreConflict = prefer.includes("resolution=ignore-duplicates");

    const body = req.body;
    const isSingle = !Array.isArray(body);
    const rows: Record<string, unknown>[] = isSingle ? [body] : body;

    if (!rows.length) {
      return res.status(201).json(isSingle ? {} : []);
    }

    const insertedRows: unknown[] = [];

    for (const row of rows) {
      const cols = Object.keys(row).filter((c) => safeCol(c));
      if (!cols.length) continue;

      const colNames = cols.map((c) => `"${c}"`).join(", ");
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      const vals = cols.map((c) => row[c]);

      let sql = `INSERT INTO "${table}" (${colNames}) VALUES (${placeholders})`;

      if (isUpsert) {
        const updateCols = cols.filter((c) => c !== "id");
        if (updateCols.length) {
          sql += ` ON CONFLICT (id) DO UPDATE SET ${updateCols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(", ")}`;
        }
      } else if (ignoreConflict) {
        sql += ` ON CONFLICT DO NOTHING`;
      }

      if (wantsReturn) sql += " RETURNING *";

      const result = await pool.query(sql, vals);
      if (result.rows.length) insertedRows.push(result.rows[0]);
    }

    if (!wantsReturn) {
      return res.status(201).send();
    }

    if (accept.includes("pgrst.object") || isSingle) {
      return res.status(201).json(insertedRows[0] || {});
    }
    return res.status(201).json(insertedRows);
  } catch (err: any) {
    console.error(`[REST] POST /${table}:`, err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH (UPDATE) ───────────────────────────────────────────────────────────

router.patch("/:table", requireAuth, async (req: Request, res: Response) => {
  const { table } = req.params as Record<string, string>;
  if (!ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ message: `Table "${table}" not allowed` });
  }

  if (USE_SUPABASE_HTTP) {
    await supabaseForward(req, res, table);
    return;
  }

  try {
    const prefer = (req.headers["prefer"] as string) || "";
    const accept = req.headers["accept"] || "";
    const wantsReturn = prefer.includes("return=representation") || accept.includes("pgrst.object");

    const body = req.body as Record<string, unknown>;
    const setCols = Object.keys(body).filter((c) => safeCol(c));
    if (!setCols.length) return res.status(400).json({ message: "No valid fields to update" });

    const setVals = setCols.map((c) => body[c]);
    const setClause = setCols.map((c, i) => `"${c}" = $${i + 1}`).join(", ");

    const whereVals: unknown[] = [...setVals];
    const whereClause = buildWhere(table, req.query as Record<string, string>, whereVals);

    let sql = `UPDATE "${table}" SET ${setClause} ${whereClause}`;
    if (wantsReturn) sql += " RETURNING *";

    const result = await pool.query(sql, whereVals);

    if (!wantsReturn) return res.status(204).send();

    if (accept.includes("pgrst.object")) {
      if (!result.rows.length) {
        return res.status(404).json({ code: "PGRST116", message: "The result contains 0 rows" });
      }
      return res.json(result.rows[0]);
    }
    return res.json(result.rows);
  } catch (err: any) {
    console.error(`[REST] PATCH /${table}:`, err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE ───────────────────────────────────────────────────────────────────

router.delete("/:table", requireAuth, async (req: Request, res: Response) => {
  const { table } = req.params as Record<string, string>;
  if (!ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ message: `Table "${table}" not allowed` });
  }

  if (USE_SUPABASE_HTTP) {
    await supabaseForward(req, res, table);
    return;
  }

  try {
    const values: unknown[] = [];
    const whereClause = buildWhere(table, req.query as Record<string, string>, values);
    if (!whereClause) {
      return res.status(400).json({ message: "DELETE without WHERE is not allowed" });
    }
    await pool.query(`DELETE FROM "${table}" ${whereClause}`, values);
    return res.status(204).send();
  } catch (err: any) {
    console.error(`[REST] DELETE /${table}:`, err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── RPC ──────────────────────────────────────────────────────────────────────

router.post("/rpc/:funcname", requireAuth, async (req: Request, res: Response) => {
  const { funcname } = req.params;
  try {
    switch (funcname) {
      case "generate_booking_code": {
        const d = new Date();
        const yy = d.getFullYear().toString().slice(2);
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        // Ensure uniqueness by checking the bookings table
        let code = `BK${yy}${mm}${rand}`;
        const { rows } = await pool.query(
          `SELECT id FROM bookings WHERE booking_code = $1 LIMIT 1`,
          [code]
        );
        if (rows.length) {
          code = `BK${yy}${mm}${Date.now().toString(36).slice(-4).toUpperCase()}`;
        }
        return res.json(code);
      }
      default:
        return res.status(404).json({ message: `RPC function "${funcname}" not found` });
    }
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
