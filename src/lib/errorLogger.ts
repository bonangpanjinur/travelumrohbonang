import { supabase } from "@/integrations/supabase/client";

interface LogPayload {
  message: string;
  stack?: string;
  level?: "error" | "warn" | "info";
  context?: Record<string, unknown>;
}

export async function logError({ message, stack, level = "error", context }: LogPayload) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("error_logs").insert({
      user_id: user?.id ?? null,
      level,
      message: message.slice(0, 2000),
      stack: stack?.slice(0, 8000),
      url: typeof window !== "undefined" ? window.location.href : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      context: context ?? null,
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
