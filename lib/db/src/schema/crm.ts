import {
  pgTable, text, integer, boolean, jsonb, timestamp,
  index, uniqueIndex,
} from "drizzle-orm/pg-core";

export const leads = pgTable("leads", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  source: text("source"),
  status: text("status").notNull().default("new"),
  packageInterest: text("package_interest"),
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>().default([]),
  assignedTo: text("assigned_to"),
  estimatedValue: integer("estimated_value"),
  expectedCloseDate: timestamp("expected_close_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_leads_status").on(t.status),
]);

export const leadInteractions = pgTable("lead_interactions", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // call, whatsapp, email, meeting, note
  summary: text("summary").notNull(),
  outcome: text("outcome"), // interested, callback, not_interested, booked
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_lead_interactions_lead_id").on(t.leadId),
]);

export const leadFollowUps = pgTable("lead_follow_ups", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  followUpDate: timestamp("follow_up_date", { withTimezone: true }),
  type: text("type"),
  notes: text("notes"),
  isDone: boolean("is_done").notNull().default(false),
  doneAt: timestamp("done_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_lead_follow_ups_lead_id").on(t.leadId),
]);

export const coupons = pgTable("coupons", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  discountType: text("discount_type").notNull(),
  value: integer("value").notNull(),
  minPurchase: integer("min_purchase"),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  expiredAt: timestamp("expired_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("uq_coupons_code").on(t.code),
]);

export const loyaltyBalances = pgTable("loyalty_balances", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),         // references auth.users — no local FK
  totalPoints: integer("total_points").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("uq_loyalty_balances_user_id").on(t.userId),
]);

export const loyaltyPoints = pgTable("loyalty_points", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),         // references auth.users — no local FK
  points: integer("points").notNull(),
  source: text("source"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_loyalty_points_user_id").on(t.userId),
]);

export const integrationSecrets = pgTable("integration_secrets", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  config: jsonb("config"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("uq_integration_secrets_provider").on(t.provider),
]);
