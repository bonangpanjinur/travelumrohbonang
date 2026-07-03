import { apiFetch } from "@/shared/lib/apiClient";
import { captureException } from "@/shared/lib/sentry";
import { getCurrentAuthUser } from "@/shared/lib/currentUser";

interface LogPayload {
  message: string;
  stack?: string;
  level?: "error" | "warn" | "info";
  context?: Record<string, unknown>;
  error?: unknown;
}

export async function logError({ message, stack, level = "error", context, error }: LogPayload) {
  // Forward to Sentry (no-op if DSN not configured)
  if (level === "error") {
    captureException(error ?? new Error(message), context);
  }

  try {
    const user = await getCurrentAuthUser();
    await apiFetch("/api/logs/error", {
      method: "POST",
      body: JSON.stringify({
        userId: user?.id ?? undefined,
        level,
        message: message.slice(0, 2000),
        stack: stack?.slice(0, 8000) ?? undefined,
        url: typeof window !== "undefined" ? window.location.href : undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        context: context ?? undefined,
      }),
    });
  } catch (err) {
    // swallow — logger must never throw
    console.error("[errorLogger] failed", err);
  }
}

export function installGlobalErrorHandlers() {
  if (typeof window === "undefined") return;
  if ((window as any).__lovableErrorHandlersInstalled) return;
  (window as any).__lovableErrorHandlersInstalled = true;

  window.addEventListener("error", (event) => {
    logError({
      message: event.message || "Unhandled error",
      stack: event.error?.stack,
      context: { source: event.filename, line: event.lineno, col: event.colno },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason: any = event.reason;
    logError({
      message: reason?.message ?? String(reason ?? "Unhandled rejection"),
      stack: reason?.stack,
      context: { kind: "unhandledrejection" },
    });
  });
}
