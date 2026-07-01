import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const requestLog = pgTable("request_log", {
  id: text("id").primaryKey(),
  ip: text("ip"),
  endpoint: text("endpoint").notNull(),
  userId: text("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

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
});

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  metadata: jsonb("metadata"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const pilgrimDocAccessLogs = pgTable("pilgrim_doc_access_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  pilgrimId: text("pilgrim_id"),
  docType: text("doc_type"),
  storagePath: text("storage_path"),
  context: text("context"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});
