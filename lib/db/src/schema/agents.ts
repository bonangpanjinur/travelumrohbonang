import { pgTable, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";

export const agents = pgTable("agents", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  branchId: text("branch_id"),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  referralCode: text("referral_code"),
  commissionPercent: numeric("commission_percent"),
  monthlyTarget: integer("monthly_target"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const userRoles = pgTable("user_roles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  role: text("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const agentCommissions = pgTable("agent_commissions", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull(),
  agentId: text("agent_id").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const agentWithdrawals = pgTable("agent_withdrawals", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"),
  bankDetails: text("bank_details"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const affiliateClicks = pgTable("affiliate_clicks", {
  id: text("id").primaryKey(),
  agentId: text("agent_id"),
  referralCode: text("referral_code"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});
