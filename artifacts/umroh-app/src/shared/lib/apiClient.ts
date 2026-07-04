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
    throw new Error(
      (body as { error?: string }).error ?? `HTTP ${res.status}`,
    );
  }

  return res.json() as Promise<T>;
}
