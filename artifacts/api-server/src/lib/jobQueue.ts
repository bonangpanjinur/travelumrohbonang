import crypto from "node:crypto";
import { db, jobQueue, eq, and, lte, asc } from "@workspace/db";

export type QueueJobInput = {
  jobType: string;
  payload: Record<string, unknown>;
  dedupeKey?: string;
  maxAttempts?: number;
  priority?: number;
  correlationId: string;
};

export async function enqueueJob(input: QueueJobInput) {
  if (input.dedupeKey) {
    const existing = await db.select({ id: jobQueue.id }).from(jobQueue).where(and(
      eq(jobQueue.jobType, input.jobType),
      eq(jobQueue.dedupeKey, input.dedupeKey),
      eq(jobQueue.status, "queued"),
    )).limit(1);
    if (existing[0]) return { id: existing[0].id, deduplicated: true };
  }
  const id = crypto.randomUUID();
  await db.insert(jobQueue).values({
    id,
    jobType: input.jobType,
    dedupeKey: input.dedupeKey ?? null,
    payload: input.payload,
    status: "queued",
    priority: input.priority ?? 100,
    maxAttempts: input.maxAttempts ?? 5,
    correlationId: input.correlationId,
    createdAt: new Date(),
    availableAt: new Date(),
  });
  return { id, deduplicated: false };
}

export async function requeueJob(jobId: string, errorCode: string, errorMessage: string, attempt: number) {
  const delayMs = Math.min(4 * 60 * 60 * 1000, 60_000 * Math.pow(5, Math.max(0, attempt - 1)));
  await db.update(jobQueue).set({
    status: "queued",
    attempts: attempt,
    availableAt: new Date(Date.now() + delayMs),
    lockedAt: null,
    lockedBy: null,
    lastErrorCode: errorCode.slice(0, 100),
    lastErrorMessage: errorMessage.slice(0, 1000),
  }).where(eq(jobQueue.id, jobId));
}

export async function failJob(jobId: string, errorCode: string, errorMessage: string, attempt: number) {
  await db.update(jobQueue).set({
    status: "dead_letter",
    attempts: attempt,
    failedAt: new Date(),
    lockedAt: null,
    lockedBy: null,
    lastErrorCode: errorCode.slice(0, 100),
    lastErrorMessage: errorMessage.slice(0, 1000),
  }).where(eq(jobQueue.id, jobId));
}
