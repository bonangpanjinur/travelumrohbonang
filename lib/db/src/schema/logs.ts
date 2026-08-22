import {
  pgTable, text, jsonb, timestamp, integer, boolean,
  index, uniqueIndex,
} from "drizzle-orm/pg-core";

export const requestLog = pgTable("request_log", {
  id: text("id").primaryKey(),
  ip: text("ip"),
  endpoint: text("endpoint").notNull(),
  userId: text("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_request_log_user_id").on(t.userId),
  index("idx_request_log_created_at").on(t.createdAt),
]);

export const errorLogs = pgTable("error_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  level: text("level").notNull(),
  message: text("message").notNull(),
  stack: text("stack"),
  url: text("url"),
  userAgent: text("user_agent"),
  context: jsonb("context"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_error_logs_level").on(t.level),
  index("idx_error_logs_created_at").on(t.createdAt),
]);

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  metadata: jsonb("metadata"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_audit_logs_entity").on(t.entityType, t.entityId),
  index("idx_audit_logs_user_id").on(t.userId),
]);

export const logRetentionPolicies = pgTable("log_retention_policies", {
  id: text("id").primaryKey(),
  logType: text("log_type").notNull(),
  retentionDays: integer("retention_days").notNull(),
  archiveBeforeDelete: boolean("archive_before_delete").notNull().default(false),
  legalHoldSupported: boolean("legal_hold_supported").notNull().default(true),
  enabled: boolean("enabled").notNull().default(true),
  policyVersion: integer("policy_version").notNull().default(1),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [uniqueIndex("uq_log_retention_policies_type").on(t.logType)]);

export const logRetentionHolds = pgTable("log_retention_holds", {
  id: text("id").primaryKey(),
  logType: text("log_type").notNull(),
  entityId: text("entity_id"),
  correlationId: text("correlation_id"),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("active"),
  startsAt: timestamp("starts_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdBy: text("created_by").notNull(),
  releasedBy: text("released_by"),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [index("idx_log_retention_holds_lookup").on(t.logType, t.entityId, t.correlationId, t.status)]);

export const logRetentionRuns = pgTable("log_retention_runs", {
  id: text("id").primaryKey(),
  logType: text("log_type").notNull(),
  policyVersion: integer("policy_version").notNull(),
  cutoffAt: timestamp("cutoff_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("running"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  lastCursor: text("last_cursor"),
  scannedCount: integer("scanned_count").notNull().default(0),
  deletedCount: integer("deleted_count").notNull().default(0),
  skippedHoldCount: integer("skipped_hold_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  errorMessage: text("error_message"),
  correlationId: text("correlation_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [index("idx_log_retention_runs_status").on(t.status, t.startedAt)]);

export const retentionPurgeAudit = pgTable("retention_purge_audit", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  logType: text("log_type").notNull(),
  rowCount: integer("row_count").notNull(),
  contentHash: text("content_hash"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }).defaultNow(),
  executedBy: text("executed_by").notNull().default("system"),
  correlationId: text("correlation_id").notNull(),
}, (t) => [index("idx_retention_purge_audit_run_id").on(t.runId)]);

export const errorEvents = pgTable("error_events", {
  id: text("id").primaryKey(),
  fingerprint: text("fingerprint").notNull(),
  severity: text("severity").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("open"),
  source: text("source").notNull(),
  route: text("route"),
  operation: text("operation"),
  correlationId: text("correlation_id"),
  requestId: text("request_id"),
  userId: text("user_id"),
  messageRedacted: text("message_redacted").notNull(),
  stackRedacted: text("stack_redacted"),
  metadata: jsonb("metadata"),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow(),
  occurrenceCount: integer("occurrence_count").notNull().default(1),
  acknowledgedBy: text("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  resolvedBy: text("resolved_by"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolutionNote: text("resolution_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [index("idx_error_events_fingerprint").on(t.fingerprint), index("idx_error_events_status").on(t.status, t.lastSeenAt)]);

export const jobQueue = pgTable("job_queue", {
  id: text("id").primaryKey(),
  jobType: text("job_type").notNull(),
  dedupeKey: text("dedupe_key"),
  payload: jsonb("payload").notNull(),
  status: text("status").notNull().default("queued"),
  priority: integer("priority").notNull().default(100),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  availableAt: timestamp("available_at", { withTimezone: true }).defaultNow(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lockedBy: text("locked_by"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  lastErrorCode: text("last_error_code"),
  lastErrorMessage: text("last_error_message"),
  correlationId: text("correlation_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [index("idx_job_queue_pick").on(t.status, t.availableAt, t.priority), index("idx_job_queue_dedupe").on(t.jobType, t.dedupeKey)]);

export const jobAttempts = pgTable("job_attempts", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull(),
  attemptNumber: integer("attempt_number").notNull(),
  status: text("status").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  providerRequestId: text("provider_request_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [index("idx_job_attempts_job_id").on(t.jobId)]);

export const alertEvents = pgTable("alert_events", {
  id: text("id").primaryKey(),
  alertKey: text("alert_key").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull().default("open"),
  source: text("source").notNull(),
  fingerprint: text("fingerprint").notNull(),
  summary: text("summary").notNull(),
  details: jsonb("details"),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow(),
  occurrenceCount: integer("occurrence_count").notNull().default(1),
  acknowledgedBy: text("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [index("idx_alert_events_fingerprint").on(t.fingerprint), index("idx_alert_events_status").on(t.status, t.lastSeenAt)]);

export const pilgrimDocAccessLogs = pgTable("pilgrim_doc_access_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  pilgrimId: text("pilgrim_id"),
  docType: text("doc_type"),
  storagePath: text("storage_path"),
  context: text("context"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_pilgrim_doc_access_logs_user_id").on(t.userId),
]);
