import {
  pgTable, text, integer, boolean, numeric, timestamp,
  index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { bookings } from "./bookings";
import { branches } from "./masterdata";

export const agents = pgTable("agents", {
  id: text("id").primaryKey(),
  userId: text("user_id"),                 // references auth.users — no local FK
  branchId: text("branch_id").references(() => branches.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  referralCode: text("referral_code"),
  commissionPercent: numeric("commission_percent"),
  monthlyTarget: integer("monthly_target"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("idx_agents_referral_code").on(t.referralCode),
  index("idx_agents_branch_id").on(t.branchId),
  index("idx_agents_user_id").on(t.userId),
]);

export const userRoles = pgTable("user_roles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),       // references auth.users — no local FK
  role: text("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("uq_user_roles_user_id").on(t.userId),
  index("idx_user_roles_user_id").on(t.userId),
]);

export const agentCommissions = pgTable("agent_commissions", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  agentId: text("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_agent_commissions_booking_id").on(t.bookingId),
  index("idx_agent_commissions_agent_id").on(t.agentId),
]);

export const agentWithdrawals = pgTable("agent_withdrawals", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"),
  bankDetails: text("bank_details"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_agent_withdrawals_agent_id").on(t.agentId),
]);

export const affiliateClicks = pgTable("affiliate_clicks", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").references(() => agents.id, { onDelete: "set null" }),
  referralCode: text("referral_code"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  index("idx_affiliate_clicks_agent_id").on(t.agentId),
]);
