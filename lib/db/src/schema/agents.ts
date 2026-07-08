import {
  pgTable, text, integer, boolean, numeric, timestamp, uuid,
  index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),       // references auth.users (uuid) — no local FK
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
  status: text("status").notNull().default("requested"), // requested | approved | rejected | paid
  // Separate bank fields (legacy `bank_details` text field kept for migration compatibility)
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  accountHolder: text("account_holder"),
  notes: text("notes"),                // agen's notes
  adminNotes: text("admin_notes"),
  proofUrl: text("proof_url"),         // admin uploads transfer proof
  processedBy: text("processed_by"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
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

/**
 * Stores per-role menu visibility overrides set by super_admin.
 * menuKey maps to MenuItem.labelKey from adminMenuConfig.ts.
 * If no row exists for a role+menuKey combo, the sidebar falls back
 * to the static `item.roles` array in adminMenuConfig.ts.
 */
export const roleMenuPermissions = pgTable("role_menu_permissions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  role: text("role").notNull(),
  menuKey: text("menu_key").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_role_menu_permissions").on(t.role, t.menuKey),
  index("idx_rmp_role").on(t.role),
]);
