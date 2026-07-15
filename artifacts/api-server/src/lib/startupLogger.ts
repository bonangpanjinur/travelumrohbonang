/**
 * Startup audit logger.
 *
 * Prints a human-readable startup banner showing Node version, environment,
 * port, Supabase connectivity status, and every registered Express route.
 *
 * No secrets are ever logged — only status indicators.
 */

import type { Express } from "express";
import { SUPABASE_URL, SUPABASE_SERVER_KEY, SUPABASE_SERVICE_ROLE_KEY } from "./supabaseEnv";

// ── Supabase connectivity check ───────────────────────────────────────────────

export async function checkSupabaseConnectivity(): Promise<"ok" | "not_configured" | "unreachable"> {
  if (!SUPABASE_URL || !SUPABASE_SERVER_KEY) return "not_configured";
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      signal: AbortSignal.timeout(5_000),
      headers: {
        apikey: SUPABASE_SERVER_KEY,
        Authorization: `Bearer ${SUPABASE_SERVER_KEY}`,
      },
    });
    // Any HTTP response (even 401/404) means Supabase is reachable
    return res.status < 500 ? "ok" : "unreachable";
  } catch {
    return "unreachable";
  }
}

/**
 * Decodes a Supabase JWT-style key (anon or service_role) WITHOUT verifying
 * the signature, purely to prove at startup which role the configured key
 * actually carries. This exists because "the service role key is probably
 * wrong" has repeatedly been guessed without evidence — this prints the
 * actual decoded role, project ref, and expiry so a bad key is provable,
 * not assumed. Never logs the key itself, only length/prefix/decoded claims.
 */
function inspectSupabaseKey(label: string, key: string): string {
  if (!key) return `${label}: MISSING`;
  const parts = key.split(".");
  let decoded = "unparseable (not a JWT — check for whitespace/truncation)";
  if (parts.length === 3) {
    try {
      const payloadJson = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
      const payload = JSON.parse(payloadJson);
      const exp = payload.exp ? new Date(payload.exp * 1000).toISOString() : "none";
      decoded = `role=${payload.role ?? "?"} ref=${payload.ref ?? "?"} exp=${exp}`;
    } catch {
      decoded = "unparseable (base64/JSON decode failed)";
    }
  }
  return `${label}: len=${key.length} prefix=${key.slice(0, 8)}... ${decoded}`;
}

export function logSupabaseKeyDiagnostics(): void {
  console.log("\n── Supabase Key Diagnostics (no secrets printed) ──────────────");
  console.log(`  ${inspectSupabaseKey("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY)}`);
  console.log(`  URL: ${SUPABASE_URL || "MISSING"}`);
  console.log("──────────────────────────────────────────────────────────────\n");
}

// ── Route listing ─────────────────────────────────────────────────────────────

interface RouteEntry {
  method: string;
  path: string;
}

function extractPrefix(regexp: RegExp | undefined): string {
  if (!regexp) return "";
  // Express compiles "/foo" → /^\/foo\/?(?=\/|$)/i
  // Extract the literal path segment between \/ and \/?
  const src = regexp.source;
  const match = src.match(/^\^\\\/([^\\?()]+)/);
  if (!match) return "";
  // Unescape any \/ sequences back to /
  return "/" + match[1].replace(/\\\//g, "/");
}

function walkStack(stack: any[], prefix: string, routes: RouteEntry[]): void {
  for (const layer of stack) {
    if (!layer) continue;

    if (layer.route) {
      // Direct route
      const methods = Object.keys(layer.route.methods ?? {})
        .filter((m) => layer.route.methods[m] && m !== "_all")
        .map((m) => m.toUpperCase());
      const fullPath = prefix + (layer.route.path || "");
      for (const method of methods) {
        routes.push({ method, path: fullPath });
      }
    } else if (layer.handle?.stack) {
      // Sub-router
      const subPrefix = prefix + extractPrefix(layer.regexp);
      walkStack(layer.handle.stack, subPrefix, routes);
    }
  }
}

export function listRegisteredRoutes(app: Express): RouteEntry[] {
  const routes: RouteEntry[] = [];
  // Express 5 exposes the router as `app.router`; Express 4 used `app._router`.
  // Fall back to the other if one is absent.
  const stack =
    (app as any).router?.stack ??
    (app as any)._router?.stack;
  if (!stack) return routes;
  walkStack(stack, "", routes);
  return routes;
}

// ── Main banner ───────────────────────────────────────────────────────────────

export async function logStartupBanner(app: Express, port: number): Promise<void> {
  const nodeVersion = process.version;
  const env         = process.env.NODE_ENV ?? "development";
  const isVercel    = process.env.VERCEL === "1";

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║                  UmrohPlus API Server                     ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  console.log(`  Node Version : ${nodeVersion}`);
  console.log(`  Environment  : ${env}`);
  console.log(`  Port         : ${port}`);
  console.log(`  Runtime      : ${isVercel ? "Vercel (serverless)" : "Node.js (long-running)"}`);
  console.log("");

  // Proof-based Supabase key diagnostics — decodes the JWT claims of the
  // configured key so a wrong/expired/wrong-project key is provable at
  // startup instead of guessed after the fact.
  logSupabaseKeyDiagnostics();

  // Supabase connectivity
  const supabaseStatus = await checkSupabaseConnectivity();
  const supabaseIcon =
    supabaseStatus === "ok"             ? "✓" :
    supabaseStatus === "not_configured" ? "✗" : "⚠";
  const supabaseLabel =
    supabaseStatus === "ok"             ? "Supabase Client Initialized" :
    supabaseStatus === "not_configured" ? "Supabase NOT CONFIGURED (missing env vars)" :
                                          "Supabase UNREACHABLE (check SUPABASE_URL)";
  console.log(`  ${supabaseIcon} ${supabaseLabel}`);

  // Routes
  const routes = listRegisteredRoutes(app);
  console.log(`  ✓ Routes Registered (${routes.length} total)`);
  console.log(`  ✓ Server Started on port ${port}`);

  if (routes.length > 0) {
    console.log("\n── Registered Routes ─────────────────────────────────────────");
    for (const r of routes) {
      console.log(`  ${r.method.padEnd(7)} ${r.path}`);
    }
    console.log("──────────────────────────────────────────────────────────────");
  }

  console.log("");
}
