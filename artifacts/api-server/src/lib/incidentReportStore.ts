/**
 * In-memory store for shared incident report text, so an admin can generate
 * a short-lived link instead of pasting a huge text block into chat.
 *
 * Caveat: like diagLogBuffer, this only lives in the current process memory.
 * On Vercel serverless each invocation may be a different instance, so a
 * link created on one instance may 404 on another cold instance. On
 * long-running Replit/Node this is a non-issue. Links expire after TTL_MS
 * regardless of instance lifetime, and are also admin-auth-gated on read.
 */

import { randomUUID } from "crypto";

interface StoredReport {
  report: string;
  createdAt: number;
  expiresAt: number;
  createdBy: string | null;
}

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_ENTRIES = 200;

const store = new Map<string, StoredReport>();

function cleanup(): void {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.expiresAt <= now) store.delete(id);
  }
  if (store.size > MAX_ENTRIES) {
    const oldestFirst = [...store.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
    const toDrop = oldestFirst.slice(0, store.size - MAX_ENTRIES);
    for (const [id] of toDrop) store.delete(id);
  }
}

export function createIncidentReportLink(report: string, createdBy: string | null): { id: string; expiresAt: number } {
  cleanup();
  const id = randomUUID();
  const now = Date.now();
  const expiresAt = now + TTL_MS;
  store.set(id, { report, createdAt: now, expiresAt, createdBy });
  return { id, expiresAt };
}

export function getIncidentReportLink(id: string): StoredReport | null {
  cleanup();
  const entry = store.get(id);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(id);
    return null;
  }
  return entry;
}

export function revokeIncidentReportLink(id: string): boolean {
  return store.delete(id);
}
