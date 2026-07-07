import {
  pgTable, text, jsonb, timestamp,
  index,
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
