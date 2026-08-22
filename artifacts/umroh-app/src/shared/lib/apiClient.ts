import { supabaseAuth } from "@/shared/integrations/supabase/auth-client";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

type ApiErrorBody = {
  error?: string;
  detail?: string;
  hint?: string;
  fieldErrors?: Record<string, string[]>;
};

export type ApiError = Error & {
  status?: number;
  code?: string;
  fieldErrors?: Record<string, string[]>;
  hint?: string;
  body?: unknown;
};

function buildHeaders(options: RequestInit, accessToken?: string): Headers {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return headers;
}

async function getAccessToken(forceRefresh = false): Promise<string | undefined> {
  try {
    if (forceRefresh) {
      const { data, error } = await supabaseAuth.auth.refreshSession();
      if (error) return undefined;
      return data.session?.access_token;
    }

    const { data, error } = await supabaseAuth.auth.getSession();
    if (error) return undefined;
    return data.session?.access_token;
  } catch {
    return undefined;
  }
}

function createApiError(status: number, body: ApiErrorBody): ApiError {
  let message = body.detail ?? body.error ?? `HTTP ${status}`;

  if (body.fieldErrors && Object.keys(body.fieldErrors).length > 0) {
    const fields = Object.entries(body.fieldErrors)
      .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
      .join(" • ");
    message = `Validasi gagal — ${fields}`;
  } else if (body.hint && body.error !== "validation_failed") {
    message = `${message} — ${body.hint}`;
  }

  const error = new Error(message) as ApiError;
  error.status = status;
  error.code = body.error;
  error.fieldErrors = body.fieldErrors;
  error.hint = body.hint;
  error.body = body;
  return error;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return undefined as T;

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    const error = new Error(
      `Server returned non-JSON response (${response.status}): ${text.slice(0, 200)}`,
    ) as ApiError;
    error.status = response.status;
    throw error;
  }

  if (!response.ok) {
    throw createApiError(response.status, (body ?? {}) as ApiErrorBody);
  }

  return body as T;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const initialToken = await getAccessToken();

  const send = (token?: string) => fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(options, token),
    credentials: "include",
  });

  let response = await send(initialToken);

  // Refresh and retry exactly once for a stale token. Do not retry other
  // status codes because POST/PUT actions may have side effects.
  if (response.status === 401 && initialToken) {
    const refreshedToken = await getAccessToken(true);
    if (refreshedToken && refreshedToken !== initialToken) {
      response = await send(refreshedToken);
    }
  }

  return parseResponse<T>(response);
}
