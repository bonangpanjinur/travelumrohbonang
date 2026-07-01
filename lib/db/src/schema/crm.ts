import { pgTable, text, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";

export const leads = pgTable("leads", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  source: text("source"),
  status: text("status").notNull().default("new"),
  packageInterest: text("package_interest"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const leadFollowUps = pgTable("lead_follow_ups", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull(),
  followUpDate: timestamp("follow_up_date", { withTimezone: true }),
  type: text("type"),
  notes: text("notes"),
  isDone: boolean("is_done").notNull().default(false),
  doneAt: timestamp("done_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

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
});

export const loyaltyBalances = pgTable("loyalty_balances", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  totalPoints: integer("total_points").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const loyaltyPoints = pgTable("loyalty_points", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  points: integer("points").notNull(),
  source: text("source"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const integrationSecrets = pgTable("integration_secrets", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  config: jsonb("config"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }),
});
