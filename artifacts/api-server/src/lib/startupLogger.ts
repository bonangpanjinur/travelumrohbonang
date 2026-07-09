/**
 * Startup audit logger.
 *
 * Prints a human-readable startup banner showing Node version, environment,
 * port, Supabase connectivity status, and every registered Express route.
 *
 * No secrets are ever logged — only status indicators.
 */

import type { Express } from "express";
import { SUPABASE_URL, SUPABASE_SERVER_KEY } from "./supabaseEnv";

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
