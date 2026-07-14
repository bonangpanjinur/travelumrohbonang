/**
 * In-memory ring buffer for [REST-DIAG] entries so an admin page can tail
 * them live instead of digging through Vercel's log viewer during an
 * incident.
 *
 * Caveat: this only holds entries seen by the current process. On
 * long-running Replit/Node deployments that's the whole story. On Vercel
 * serverless, each function invocation is its own process, so this buffer
 * only shows what happened on the *same* warm instance that serves the
 * admin request — useful for burst/traffic debugging, but not a full
 * historical log. Still logged to stdout (picked up by Vercel's log
 * viewer) as before, so nothing is lost — this buffer is a convenience
 * layer, not the source of truth.
 */

export interface DiagLogEntry {
  id: number;
  timestamp: string;
  method: string;
  table: string;
  stage: string;
  authenticated: boolean;
  userId: string | null;
  role: string | null;
  backend?: string;
  httpStatus?: number;
  error?: string;
  extra?: Record<string, unknown>;
}

const MAX_ENTRIES = 500;
const buffer: DiagLogEntry[] = [];
let nextId = 1;

export function pushDiagLog(entry: Omit<DiagLogEntry, "id" | "timestamp">): void {
  buffer.push({ ...entry, id: nextId++, timestamp: new Date().toISOString() });
  if (buffer.length > MAX_ENTRIES) buffer.shift();
}

export interface DiagLogFilter {
  sinceId?: number;
  table?: string;
  method?: string;
  stage?: string;
  q?: string;
  limit?: number;
}

export function getDiagLogs(filter: DiagLogFilter = {}): DiagLogEntry[] {
  let results = buffer;
  if (filter.sinceId !== undefined) {
    results = results.filter((e) => e.id > filter.sinceId!);
  }
  if (filter.table) {
    results = results.filter((e) => e.table === filter.table);
  }
  if (filter.method) {
    const method = filter.method.toUpperCase();
    results = results.filter((e) => e.method === method);
  }
  if (filter.stage) {
    results = results.filter((e) => e.stage.includes(filter.stage!));
  }
  if (filter.q) {
    const needle = filter.q.toLowerCase();
    results = results.filter((e) => JSON.stringify(e).toLowerCase().includes(needle));
  }
  const limit = filter.limit ?? 200;
  return results.slice(-limit);
}
