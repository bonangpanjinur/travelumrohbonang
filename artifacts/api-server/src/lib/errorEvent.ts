import crypto from "node:crypto";
import { db, errorEvents, eq, sql } from "@workspace/db";
import { sanitizeLogPayload } from "../middlewares/observability";

function fingerprint(input: { name?: string; route?: string; operation?: string; message?: string }): string {
  const normalized = `${input.name ?? "Error"}|${input.route ?? "unknown"}|${input.operation ?? "unknown"}|${(input.message ?? "").toLowerCase().replace(/[0-9a-f-]{16,}/g, "{id}").slice(0, 500)}`;
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 64);
}

export async function recordErrorEvent(input: {
  error: unknown;
  route?: string;
  operation?: string;
  correlationId?: string;
  requestId?: string;
  userId?: string | null;
  source?: string;
  severity?: string;
}): Promise<void> {
  const error = input.error as any;
  const message = String(error?.message ?? error ?? "Internal server error");
  const name = String(error?.name ?? "Error");
  const fp = fingerprint({ name, route: input.route, operation: input.operation, message });
  const redacted = sanitizeLogPayload({ message, stack: error?.stack }) as { message?: string; stack?: string };
  try {
    const existing = await db.select({ id: errorEvents.id, occurrenceCount: errorEvents.occurrenceCount })
      .from(errorEvents)
      .where(eq(errorEvents.fingerprint, fp))
      .limit(1);
    if (existing[0]) {
      await db.update(errorEvents).set({
        lastSeenAt: new Date(),
        occurrenceCount: (existing[0].occurrenceCount ?? 0) + 1,
        correlationId: input.correlationId ?? null,
      }).where(eq(errorEvents.id, existing[0].id));
      return;
    }
    await db.insert(errorEvents).values({
      id: crypto.randomUUID(),
      fingerprint: fp,
      severity: input.severity ?? "error",
      category: "application",
      status: "open",
      source: input.source ?? "api",
      route: input.route ?? null,
      operation: input.operation ?? null,
      correlationId: input.correlationId ?? null,
      requestId: input.requestId ?? null,
      userId: input.userId ?? null,
      messageRedacted: String(redacted.message ?? message).slice(0, 2000),
      stackRedacted: typeof redacted.stack === "string" ? redacted.stack.slice(0, 8000) : null,
      metadata: { code: error?.code ?? null },
      createdAt: new Date(),
    });
  } catch (persistError) {
    // Observability must never turn a primary request failure into a second failure.
    console.error("[error-event] persistence failed", { message: String((persistError as any)?.message ?? persistError) });
  }
}
