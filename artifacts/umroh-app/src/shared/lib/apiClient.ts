import { supabaseAuth } from "@/shared/integrations/supabase/auth-client";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  // Only set Content-Type for non-FormData bodies
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Auto-attach Supabase session token so admin API middleware can authenticate
  try {
    const { data: { session } } = await supabaseAuth.auth.getSession();
    if (session?.access_token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }
  } catch {
    // Session unavailable — request proceeds without auth header
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const b = body as {
      error?: string;
      detail?: string;
      hint?: string;
      fieldErrors?: Record<string, string[]>;
    };

    // Build a human-readable message: validation errors → list fields;
    // otherwise use detail || error, with hint appended when useful.
    let message = b.detail ?? b.error ?? `HTTP ${res.status}`;
    if (b.fieldErrors && Object.keys(b.fieldErrors).length > 0) {
      const parts = Object.entries(b.fieldErrors)
        .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
        .join(" • ");
      message = `Validasi gagal — ${parts}`;
    } else if (b.hint && b.error !== "validation_failed") {
      message = `${message} — ${b.hint}`;
    }

    const err = new Error(message) as Error & {
      status?: number;
      code?: string;
      fieldErrors?: Record<string, string[]>;
      hint?: string;
      body?: unknown;
    };
    err.status = res.status;
    err.code = b.error;
    err.fieldErrors = b.fieldErrors;
    err.hint = b.hint;
    err.body = body;
    throw err;
  }

  // Handle empty body (some DELETE/PATCH routes return 200 with no content)
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    // Server returned non-JSON (e.g. HTML error page from proxy/CDN)
    const err = new Error(`Server returned non-JSON response (${res.status}): ${text.slice(0, 200)}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
}
