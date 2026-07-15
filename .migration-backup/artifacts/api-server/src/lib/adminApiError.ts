import type { Response } from "express";

/**
 * Error terstruktur untuk admin API routes.
 * Selalu return shape yang sama supaya frontend bisa render pesan
 * konkret ke admin (bukan "500 Internal Server Error" blank).
 */
export interface AdminApiError {
  ok: false;
  error: string;              // machine code: db_unreachable, supabase_unauthorized, etc.
  endpoint: string;           // "GET /api/admin/bookings" — asal error
  status: number;             // HTTP status yang di-set
  detail: string;             // pesan singkat dari Supabase/Postgres/driver
  code: string | null;        // Postgres/PostgREST code (23505, 42P01, PGRST301, ...)
  hint: string;               // saran actionable untuk admin
  timestamp: string;
}

/** Postgres/undici error codes yang mengindikasikan DB tidak bisa dihubungi. */
const DB_UNREACHABLE_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
  "57P03", // cannot_connect_now
  "08006", // connection_failure
  "08001", // sqlclient_unable_to_establish_sqlconnection
]);

/** Klasifikasi error jadi (machineCode, httpStatus, hint). */
function classify(err: any): { error: string; status: number; hint: string } {
  const code = err?.code ?? err?.cause?.code ?? null;
  const msg = String(err?.message ?? "").toLowerCase();

  if (code && DB_UNREACHABLE_CODES.has(String(code))) {
    return {
      error: "db_unreachable",
      status: 503,
      hint:
        "Database tidak bisa dihubungi. Cek env DATABASE_URL (Vercel Production, port 6543 pooler) " +
        "dan buka /api/health/detail untuk diagnosa detail.",
    };
  }

  if (msg.includes("password authentication failed") || msg.includes("role \"") && msg.includes("does not exist")) {
    return {
      error: "db_auth_failed",
      status: 503,
      hint: "Kredensial DATABASE_URL salah. Ambil ulang connection string dari Supabase.",
    };
  }

  if (code === "42P01" || msg.includes("relation") && msg.includes("does not exist")) {
    return {
      error: "table_missing",
      status: 503,
      hint:
        "Tabel belum ada di database production. Sinkronkan schema (drizzle push / SQL migration) " +
        "ke project Supabase yang aktif.",
    };
  }

  if (code === "PGRST301" || msg.includes("jwt") || msg.includes("unauthorized")) {
    return {
      error: "supabase_unauthorized",
      status: 401,
      hint:
        "Supabase menolak request. Cek VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY " +
        "sesuai project aktif (hindari duplikat/scope Preview yang override Production).",
    };
  }

  return {
    error: "internal_error",
    status: 500,
    hint:
      "Error tidak terklasifikasi. Lihat 'detail' + Vercel function log. " +
      "Buka /api/health/detail untuk cek env & konektivitas.",
  };
}

export function sendAdminError(
  res: Response,
  endpoint: string,
  err: unknown,
): void {
  const e = err as any;
  const { error, status, hint } = classify(e);
  const body: AdminApiError = {
    ok: false,
    error,
    endpoint,
    status,
    detail: e?.message ?? String(e),
    code: e?.code ?? e?.cause?.code ?? null,
    hint,
    timestamp: new Date().toISOString(),
  };
  console.error(`[admin-api] ${endpoint} → ${status} ${error}`, {
    code: body.code,
    detail: body.detail,
  });
  res.status(status).json(body);
}
