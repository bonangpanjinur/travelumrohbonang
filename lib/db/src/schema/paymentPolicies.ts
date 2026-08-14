import {
  pgTable, text, integer, boolean, timestamp, jsonb,
  index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { packages } from "./packages";

export const paymentPolicies = pgTable("payment_policies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  scope: text("scope").notNull().default("global"), // global | package
  packageId: text("package_id").references(() => packages.id, { onDelete: "cascade" }),
  inheritsGlobal: boolean("inherits_global").notNull().default(true),
  status: text("status").notNull().default("draft"), // draft | active | archived
  version: integer("version").notNull().default(1),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }),
  effectiveUntil: timestamp("effective_until", { withTimezone: true }),
  createdBy: text("created_by"),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_payment_policies_scope_status").on(t.scope, t.status),
  index("idx_payment_policies_package_id").on(t.packageId),
  uniqueIndex("uq_payment_policies_scope_package_version").on(t.scope, t.packageId, t.version),
]);

export const paymentPolicyRules = pgTable("payment_policy_rules", {
  id: text("id").primaryKey(),
  policyId: text("policy_id").notNull().references(() => paymentPolicies.id, { onDelete: "cascade" }),
  ruleCode: text("rule_code").notNull(),
  ruleType: text("rule_type").notNull(),
  value: jsonb("value").notNull(),
  currency: text("currency"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  displayText: text("display_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  uniqueIndex("uq_payment_policy_rules_policy_code").on(t.policyId, t.ruleCode),
  index("idx_payment_policy_rules_policy_id").on(t.policyId),
]);
